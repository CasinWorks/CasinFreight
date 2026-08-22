import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { getFirebaseDb } from '../lib/firebase';
import type { PlatformNotice } from '../types';

function stripUndefined<T extends Record<string, unknown>>(value: T): T {
  const next: Record<string, unknown> = {};
  Object.entries(value).forEach(([key, val]) => {
    if (val !== undefined) next[key] = val;
  });
  return next as T;
}

function flagOn(value: unknown): boolean {
  return value === true || value === 'true' || value === 1;
}

export function normalizeNotice(id: string, data: Record<string, unknown>): PlatformNotice {
  return {
    id,
    kind: data.kind === 'maintenance' ? 'maintenance' : 'update',
    title: String(data.title || ''),
    message: String(data.message || ''),
    hasDowntime: flagOn(data.hasDowntime),
    downtimeStart: typeof data.downtimeStart === 'string' ? data.downtimeStart : undefined,
    downtimeEnd: typeof data.downtimeEnd === 'string' ? data.downtimeEnd : undefined,
    showUntil: String(data.showUntil || ''),
    isActive: flagOn(data.isActive),
    createdAt: String(data.createdAt || ''),
    updatedAt: String(data.updatedAt || ''),
    createdBy: String(data.createdBy || ''),
  };
}

export function isNoticeLive(notice: PlatformNotice, now = Date.now()): boolean {
  if (isDowntimeBlocking(notice, now)) return true;
  if (!notice.isActive) return false;
  const until = Date.parse(notice.showUntil || '');
  if (!Number.isFinite(until)) return false;
  return until > now;
}

export function isDowntimeBlocking(notice: PlatformNotice, now = Date.now()): boolean {
  if (!notice.isActive || notice.kind !== 'maintenance' || !notice.hasDowntime) return false;
  const start = Date.parse(notice.downtimeStart || '');
  if (Number.isFinite(start) && start > now) return false;
  const end = Date.parse(notice.downtimeEnd || '');
  if (Number.isFinite(end) && end < now) return false;
  return true;
}

export function activeDowntimeNotice(notices: PlatformNotice[], now = Date.now()): PlatformNotice | undefined {
  return notices.find((notice) => isDowntimeBlocking(notice, now));
}

export function listenPlatformNotices(
  onData: (notices: PlatformNotice[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    collection(getFirebaseDb(), 'platformNotices'),
    (snap) => {
      const notices = snap.docs.map((item) => normalizeNotice(item.id, item.data() as Record<string, unknown>));
      notices.sort((a, b) => Date.parse(b.updatedAt || b.createdAt || '') - Date.parse(a.updatedAt || a.createdAt || ''));
      onData(notices);
    },
    (error) => {
      console.error('Could not listen for platform notices', error);
      onError?.(error);
    }
  );
}

export async function savePlatformNotice(notice: PlatformNotice): Promise<void> {
  await setDoc(
    doc(getFirebaseDb(), 'platformNotices', notice.id),
    stripUndefined(notice as unknown as Record<string, unknown>)
  );
}

export async function deletePlatformNotice(id: string): Promise<void> {
  await deleteDoc(doc(getFirebaseDb(), 'platformNotices', id));
}
