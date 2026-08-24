import type { Company, FieldEvent, Invoice, Trip } from '../types';
import { backupFilename, backupToCsv, type WorkspaceBackup } from './workspaceBackup';

const DB_NAME = 'casinfreight-evidence';
const STORE = 'meta';

type DirectoryHandle = FileSystemDirectoryHandle;

export interface DeviceEvidenceStatus {
  canUseFolder: boolean;
  folderLinked: boolean;
  savedCount: number;
  pendingCount: number;
  lastSyncAt?: string;
}

export interface DeviceEvidenceResult {
  mode: 'folder' | 'zip' | 'skipped';
  saved: number;
  skipped: number;
  failed: number;
}

interface EvidenceMeta {
  companyId: string;
  handle?: DirectoryHandle;
  savedKeys: string[];
  lastSyncAt?: string;
}

export interface EvidenceItem {
  key: string;
  relativePath: string;
  source: string;
}

export function canUseEvidenceFolder(): boolean {
  return typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function';
}

function slug(value?: string): string {
  return (value || 'file').replace(/[^\w.\-]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'file';
}

function yearFrom(iso?: string): string {
  const date = iso ? new Date(iso) : new Date();
  return Number.isNaN(date.getTime()) ? String(new Date().getFullYear()) : String(date.getFullYear());
}

function extFromSource(source: string, fallback: string): string {
  if (source.startsWith('data:image/jpeg') || source.startsWith('data:image/jpg')) return 'jpg';
  if (source.startsWith('data:image/png')) return 'png';
  if (source.startsWith('data:image/webp')) return 'webp';
  if (source.includes('.pdf') || source.startsWith('data:application/pdf')) return 'pdf';
  const match = source.match(/\.(jpe?g|png|webp|gif|pdf)(?:$|\?)/i);
  return match ? match[1].toLowerCase().replace('jpeg', 'jpg') : fallback;
}

function pushItem(list: EvidenceItem[], key: string, relativePath: string, source?: string) {
  const value = (source || '').trim();
  if (!value) return;
  if (value.includes('images.unsplash.com')) return;
  if (list.some((item) => item.key === key)) return;
  list.push({ key, relativePath, source: value });
}

export function collectEvidenceItems(params: {
  company: Pick<Company, 'id' | 'name'>;
  trips: Trip[];
  invoices: Invoice[];
  fieldEvents: FieldEvent[];
}): EvidenceItem[] {
  const root = slug(params.company.name || params.company.id);
  const items: EvidenceItem[] = [];

  params.trips.forEach((trip) => {
    const folder = `${root}/${yearFrom(trip.createdAt || trip.actualDelivery)}/${slug(trip.tripNumber || trip.id)}`;
    (trip.pod?.photoUrls || []).forEach((url, index) => {
      pushItem(items, url, `${folder}/pod-${String(index + 1).padStart(2, '0')}.${extFromSource(url, 'jpg')}`, url);
    });
    const podSign = trip.pod?.signatureDataUrl;
    pushItem(items, `pod-sign:${trip.id}`, `${folder}/pod-signature.${extFromSource(podSign || '', 'jpg')}`, podSign);
    const dispatcher = trip.dispatcherSignoff?.signatureDataUrl;
    pushItem(items, `dispatch-sign:${trip.id}`, `${folder}/dispatcher-signature.${extFromSource(dispatcher || '', 'jpg')}`, dispatcher);
    const driver = trip.driverSignoff?.signatureDataUrl;
    pushItem(items, `driver-sign:${trip.id}`, `${folder}/driver-signature.${extFromSource(driver || '', 'jpg')}`, driver);
  });

  params.invoices.forEach((invoice) => {
    const url = invoice.proofOfPayment?.popFileUrl;
    const folder = `${root}/${yearFrom(invoice.issueDate)}/${slug(invoice.invoiceNumber || invoice.id)}`;
    const given = invoice.proofOfPayment?.popFileName?.trim();
    const filename = given
      ? slug(given.includes('.') ? given : `${given}.${extFromSource(url || '', 'pdf')}`)
      : `proof-of-payment.${extFromSource(url || '', 'pdf')}`;
    pushItem(items, url || `pop:${invoice.id}`, `${folder}/${filename}`, url);
  });

  params.fieldEvents.forEach((event) => {
    if (!event.photoUrl) return;
    const folder = `${root}/${yearFrom(event.createdAt)}/${slug(event.tripId)}`;
    pushItem(items, event.photoUrl, `${folder}/field-${slug(event.kind)}-${slug(event.id)}.${extFromSource(event.photoUrl, 'jpg')}`, event.photoUrl);
  });

  return items;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'companyId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Could not open local evidence storage.'));
  });
}

async function readMeta(companyId: string): Promise<EvidenceMeta> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, 'readonly');
    const row = await new Promise<EvidenceMeta | undefined>((resolve, reject) => {
      const request = tx.objectStore(STORE).get(companyId);
      request.onsuccess = () => resolve(request.result as EvidenceMeta | undefined);
      request.onerror = () => reject(request.error);
    });
    return row || { companyId, savedKeys: [] };
  } finally {
    db.close();
  }
}

async function writeMeta(meta: EvidenceMeta): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(meta);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

async function blobFromSource(source: string): Promise<Blob> {
  if (source.startsWith('data:')) {
    const response = await fetch(source);
    return response.blob();
  }
  const response = await fetch(source);
  if (!response.ok) throw new Error(`Could not download a file (${response.status}).`);
  return response.blob();
}

async function folderPermission(handle: DirectoryHandle): Promise<boolean> {
  const options = { mode: 'readwrite' as const };
  const current = await handle.queryPermission(options);
  if (current === 'granted') return true;
  if (current === 'denied') return false;
  const next = await handle.requestPermission(options);
  return next === 'granted';
}

async function writeRelativeFile(root: DirectoryHandle, relativePath: string, data: Blob | string): Promise<void> {
  const parts = relativePath.split('/').filter(Boolean);
  const filename = parts.pop();
  if (!filename) return;
  let dir = root;
  for (const part of parts) {
    dir = await dir.getDirectoryHandle(part, { create: true });
  }
  const file = await dir.getFileHandle(filename, { create: true });
  const writable = await file.createWritable();
  await writable.write(data);
  await writable.close();
}

export async function pickEvidenceFolder(companyId: string): Promise<void> {
  if (!canUseEvidenceFolder()) {
    throw new Error('This browser cannot keep a folder open. Use “Download copies (ZIP)” instead, or Chrome / Edge on a computer.');
  }
  const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
  const meta = await readMeta(companyId);
  await writeMeta({ ...meta, companyId, handle });
}

export async function disconnectEvidenceFolder(companyId: string): Promise<void> {
  const meta = await readMeta(companyId);
  await writeMeta({ companyId, savedKeys: meta.savedKeys, lastSyncAt: meta.lastSyncAt });
}

export async function getDeviceEvidenceStatus(params: {
  company: Pick<Company, 'id' | 'name'>;
  trips: Trip[];
  invoices: Invoice[];
  fieldEvents: FieldEvent[];
}): Promise<DeviceEvidenceStatus> {
  const items = collectEvidenceItems(params);
  const meta = params.company.id ? await readMeta(params.company.id) : { companyId: '', savedKeys: [] };
  const saved = new Set(meta.savedKeys);
  return {
    canUseFolder: canUseEvidenceFolder(),
    folderLinked: Boolean(meta.handle),
    savedCount: items.filter((item) => saved.has(item.key)).length,
    pendingCount: items.filter((item) => !saved.has(item.key)).length,
    lastSyncAt: meta.lastSyncAt,
  };
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function syncDeviceEvidence(params: {
  company: Company;
  trips: Trip[];
  invoices: Invoice[];
  fieldEvents: FieldEvent[];
  backup?: WorkspaceBackup;
  /** Folder writes without a click only run if permission is already granted. */
  userGesture?: boolean;
  forceZip?: boolean;
}): Promise<DeviceEvidenceResult> {
  const companyId = params.company.id;
  if (!companyId) throw new Error('Company workspace is missing.');
  const items = collectEvidenceItems(params);
  const meta = await readMeta(companyId);
  const saved = new Set(meta.savedKeys);
  const pending = items.filter((item) => !saved.has(item.key));
  const csvName = params.backup ? backupFilename(params.backup, 'csv') : '';
  const csvText = params.backup ? backupToCsv(params.backup) : '';

  const useFolder = Boolean(meta.handle) && !params.forceZip && canUseEvidenceFolder();
  if (useFolder && meta.handle) {
    const allowed = params.userGesture ? await folderPermission(meta.handle) : (await meta.handle.queryPermission({ mode: 'readwrite' })) === 'granted';
    if (!allowed) {
      return { mode: 'skipped', saved: 0, skipped: pending.length, failed: 0 };
    }
    let savedNow = 0;
    let failed = 0;
    const nextKeys = [...meta.savedKeys];
    const rootName = slug(params.company.name || companyId);
    await writeRelativeFile(
      meta.handle,
      `${rootName}/README.txt`,
      'CasinFreight copies for BIR and claims.\nKeep this folder 10 years. Cloud storage in the app is for live work and may be capped by your plan.\n'
    );
    if (csvText && csvName) {
      await writeRelativeFile(meta.handle, `${rootName}/books/${csvName}`, csvText);
    }
    for (const item of pending) {
      try {
        await writeRelativeFile(meta.handle, item.relativePath, await blobFromSource(item.source));
        nextKeys.push(item.key);
        savedNow += 1;
      } catch {
        failed += 1;
      }
    }
    await writeMeta({
      companyId,
      handle: meta.handle,
      savedKeys: nextKeys,
      lastSyncAt: new Date().toISOString(),
    });
    return { mode: 'folder', saved: savedNow, skipped: items.length - pending.length, failed };
  }

  if (!params.userGesture) {
    return { mode: 'skipped', saved: 0, skipped: pending.length, failed: 0 };
  }
  if (pending.length === 0 && !csvText) {
    return { mode: 'zip', saved: 0, skipped: items.length, failed: 0 };
  }

  const files: Array<{ path: string; bytes: Uint8Array }> = [];
  if (csvText && csvName) {
    files.push({ path: `books/${csvName}`, bytes: new TextEncoder().encode(csvText) });
  }
  files.push({
    path: 'README.txt',
    bytes: new TextEncoder().encode('CasinFreight copies for BIR and claims. Keep 10 years. Cloud storage in the app may be capped.\n'),
  });
  let failed = 0;
  for (const item of pending) {
    try {
      const blob = await blobFromSource(item.source);
      files.push({ path: item.relativePath, bytes: new Uint8Array(await blob.arrayBuffer()) });
      saved.add(item.key);
    } catch {
      failed += 1;
    }
  }
  downloadBlob(
    `casinfreight-bir-copies-${slug(params.company.name)}-${new Date().toISOString().slice(0, 10)}.zip`,
    buildStoreZip(files)
  );
  await writeMeta({
    companyId,
    handle: meta.handle,
    savedKeys: [...saved],
    lastSyncAt: new Date().toISOString(),
  });
  return { mode: 'zip', saved: pending.length - failed, skipped: items.length - pending.length, failed };
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(value: number): Uint8Array {
  return Uint8Array.of(value & 0xff, (value >>> 8) & 0xff);
}

function u32(value: number): Uint8Array {
  return Uint8Array.of(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  parts.forEach((part) => {
    out.set(part, offset);
    offset += part.length;
  });
  return out;
}

/** Uncompressed ZIP. JPEGs do not shrink much inside a zip. */
function buildStoreZip(files: Array<{ path: string; bytes: Uint8Array }>): Blob {
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  files.forEach((file) => {
    const name = new TextEncoder().encode(file.path);
    const crc = crc32(file.bytes);
    const local = concat([
      Uint8Array.of(0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00),
      u32(crc),
      u32(file.bytes.length),
      u32(file.bytes.length),
      u16(name.length),
      u16(0),
      name,
      file.bytes,
    ]);
    const central = concat([
      Uint8Array.of(0x50, 0x4b, 0x01, 0x02, 0x14, 0x00, 0x14, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00),
      u32(crc),
      u32(file.bytes.length),
      u32(file.bytes.length),
      u16(name.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      name,
    ]);
    locals.push(local);
    centrals.push(central);
    offset += local.length;
  });
  const central = concat(centrals);
  const end = concat([
    Uint8Array.of(0x50, 0x4b, 0x05, 0x06, 0x00, 0x00, 0x00, 0x00),
    u16(files.length),
    u16(files.length),
    u32(central.length),
    u32(offset),
    u16(0),
  ]);
  return new Blob([concat([...locals, central, end])], { type: 'application/zip' });
}
