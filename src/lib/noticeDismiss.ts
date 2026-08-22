const STORAGE_KEY = 'casinfreight_dismissed_notices';

function readMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function noticeDismissKey(id: string, updatedAt?: string): string {
  return `${id}:${updatedAt || ''}`;
}

export function isNoticeDismissed(id: string, updatedAt?: string): boolean {
  return Boolean(readMap()[noticeDismissKey(id, updatedAt)]);
}

export function dismissNotice(id: string, updatedAt?: string): void {
  const next = { ...readMap(), [noticeDismissKey(id, updatedAt)]: new Date().toISOString() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}
