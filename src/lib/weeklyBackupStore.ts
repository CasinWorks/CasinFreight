import type { WorkspaceBackup } from './workspaceBackup';
import { countBackupRecords } from './workspaceBackup';

const DB_NAME = 'casinfreight-backups';
const STORE = 'weekly';
const KEEP = 8;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export interface StoredWeeklyBackup {
  id: string;
  companyId: string;
  savedAt: string;
  recordCount: number;
  snapshot: WorkspaceBackup;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('companyId', 'companyId', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Could not open local backup storage.'));
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function waitForTransaction(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Backup storage transaction aborted.'));
  });
}

export async function listWeeklyBackups(companyId: string): Promise<StoredWeeklyBackup[]> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, 'readonly');
    const all = await requestToPromise(tx.objectStore(STORE).getAll() as IDBRequest<StoredWeeklyBackup[]>);
    await waitForTransaction(tx);
    return all
      .filter((item) => item.companyId === companyId)
      .sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt));
  } finally {
    db.close();
  }
}

export async function saveWeeklyBackup(snapshot: WorkspaceBackup, force = false): Promise<StoredWeeklyBackup | null> {
  const existing = await listWeeklyBackups(snapshot.companyId);
  const latest = existing[0];
  if (!force && latest && Date.now() - Date.parse(latest.savedAt) < WEEK_MS) {
    return latest;
  }

  const record: StoredWeeklyBackup = {
    id: `${snapshot.companyId}-${snapshot.exportedAt}`,
    companyId: snapshot.companyId,
    savedAt: snapshot.exportedAt,
    recordCount: countBackupRecords(snapshot),
    snapshot,
  };

  const db = await openDb();
  try {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    store.put(record);
    const stale = existing.slice(KEEP - 1);
    for (const item of stale) {
      store.delete(item.id);
    }
    await waitForTransaction(tx);
  } finally {
    db.close();
  }
  return record;
}

export async function deleteWeeklyBackup(id: string): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    await waitForTransaction(tx);
  } finally {
    db.close();
  }
}
