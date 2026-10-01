import type { Driver } from '../types';

export type PaperState = 'missing' | 'expired' | 'ok';

/** Calendar date in the Philippines, YYYY-MM-DD. The expiry day itself is still valid. */
export function manilaDateKey(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function paperState(expiry: string | undefined, today = manilaDateKey()): PaperState {
  const day = String(expiry || '').trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return 'missing';
  if (day < today) return 'expired';
  return 'ok';
}

export function dispatchBlockReason(
  driver: Pick<Driver, 'name' | 'licenseExpiry' | 'crewRole'> | undefined,
  today = manilaDateKey()
): string | null {
  const driverName = driver?.name || 'the driver';

  if (!driver || driver.crewRole === 'helper') {
    return 'Assign a licensed driver before this truck leaves.';
  }
  const license = paperState(driver.licenseExpiry, today);
  if (license === 'missing') return `Set the LTO license expiry for ${driverName} before dispatch.`;
  if (license === 'expired') return `${driverName}'s license expired on ${String(driver.licenseExpiry).slice(0, 10)}.`;
  return null;
}
