const DEFAULT_PLATFORM_ADMINS = [
  'christianjoshuacasin@gmail.com',
];

export function platformAdminEmails(): string[] {
  const extra = (import.meta.env.VITE_PLATFORM_ADMIN_EMAILS || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set([...DEFAULT_PLATFORM_ADMINS, ...extra])];
}

export function isPlatformAdminEmail(email?: string): boolean {
  if (!email) return false;
  return platformAdminEmails().includes(email.trim().toLowerCase());
}
