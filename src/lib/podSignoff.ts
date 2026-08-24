const PLACEHOLDER_SIGNATORIES = [
  'mark lester santos',
  'warehouse receiving supervisor',
  'warehouse receiving officer',
  'warehouse receiving lead',
  'warehouse supervisor',
  'inbound logistics lead',
  'logistics supervisor',
  'consignee receiving officer',
  'consignee receiving officer',
  'dispatcher on file',
  'authorized driver',
  'fleet driver',
];

export function isPlaceholderSignatory(name?: string): boolean {
  const value = (name || '').trim().toLowerCase();
  if (!value) return true;
  return PLACEHOLDER_SIGNATORIES.includes(value);
}

export function displaySignatory(name?: string): string | undefined {
  if (isPlaceholderSignatory(name)) return undefined;
  return name?.trim();
}

export function canvasHasInk(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] > 16) return true;
  }
  return false;
}

export function canvasPointFromEvent(
  canvas: HTMLCanvasElement,
  event: { clientX?: number; clientY?: number; touches?: ArrayLike<{ clientX: number; clientY: number }> }
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const point = event.touches && event.touches.length > 0
    ? event.touches[0]
    : { clientX: event.clientX || 0, clientY: event.clientY || 0 };
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (point.clientX - rect.left) * scaleX,
    y: (point.clientY - rect.top) * scaleY,
  };
}

const SIGNATURE_MAX_WIDTH = 900;
const SIGNATURE_JPEG_QUALITY = 0.62;

/** Downscale the pad and JPEG-encode so trip docs stay small in Firestore. */
export function exportSignatureDataUrl(canvas: HTMLCanvasElement): string {
  const scale = Math.min(1, SIGNATURE_MAX_WIDTH / Math.max(1, canvas.width));
  const width = Math.max(1, Math.round(canvas.width * scale));
  const height = Math.max(1, Math.round(canvas.height * scale));
  const out = document.createElement('canvas');
  out.width = width;
  out.height = height;
  const ctx = out.getContext('2d');
  if (!ctx) return canvas.toDataURL('image/jpeg', SIGNATURE_JPEG_QUALITY);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(canvas, 0, 0, width, height);
  return out.toDataURL('image/jpeg', SIGNATURE_JPEG_QUALITY);
}

export function readSignatureDataUrl(canvas: HTMLCanvasElement | null, fallback?: string): string | undefined {
  if (canvas && canvasHasInk(canvas)) return exportSignatureDataUrl(canvas);
  return fallback;
}
