const ALLOWED_HOSTS = [
  'firebasestorage.googleapis.com',
  'storage.googleapis.com',
  'www.google.com',
  'maps.google.com',
  'maps.googleapis.com',
];

export function safeHttpsUrl(value?: string | null): string | undefined {
  const raw = String(value || '').trim();
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') return undefined;
    const host = url.hostname.toLowerCase();
    const allowed = ALLOWED_HOSTS.some((item) => host === item || host.endsWith(`.${item}`));
    return allowed ? raw : undefined;
  } catch {
    return undefined;
  }
}
