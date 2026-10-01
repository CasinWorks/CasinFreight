export type TextSizeId = 'normal' | 'large' | 'xlarge';

export const TEXT_SIZE_STORAGE_KEY = 'casinfreight-text-size';

const SCALE: Record<TextSizeId, number> = {
  normal: 1,
  large: 1.15,
  xlarge: 1.3,
};

const listeners = new Set<(size: TextSizeId) => void>();

export function isTextSizeId(value: string | null): value is TextSizeId {
  return value === 'normal' || value === 'large' || value === 'xlarge';
}

export function readTextSize(): TextSizeId {
  try {
    const stored = localStorage.getItem(TEXT_SIZE_STORAGE_KEY);
    return isTextSizeId(stored) ? stored : 'normal';
  } catch {
    return 'normal';
  }
}

export function applyTextSize(size: TextSizeId) {
  const next = isTextSizeId(size) ? size : 'normal';
  const root = document.documentElement;
  root.dataset.textSize = next;
  root.style.zoom = String(SCALE[next]);
  try {
    localStorage.setItem(TEXT_SIZE_STORAGE_KEY, next);
  } catch {
    /* private mode can block storage; the choice still applies this visit */
  }
  listeners.forEach((listener) => listener(next));
}

export function applySavedTextSize() {
  applyTextSize(readTextSize());
}

export function subscribeTextSize(listener: (size: TextSizeId) => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
