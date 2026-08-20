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

export function readSignatureDataUrl(canvas: HTMLCanvasElement | null, fallback?: string): string | undefined {
  if (canvas && canvasHasInk(canvas)) return canvas.toDataURL('image/png');
  return fallback;
}
