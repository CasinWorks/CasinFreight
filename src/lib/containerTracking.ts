import type {
  ContainerRateDefault,
  ContainerReturnAttempt,
  ContainerSize,
  ContainerTracking,
  MoveType,
  ReturnAttemptOutcome,
  Trip,
} from '../types';

/**
 * Detention day-counting rule (Asia/Manila calendar dates):
 *
 * 1. returnBy, returnedAt, and "today" are reduced to a calendar day (YYYY-MM-DD).
 *    The clock time is ignored. A box due back on 1 Oct is not overdue on 1 Oct.
 * 2. daysOverdue = max(0, calendar days from the returnBy date to the cutoff date).
 *    The day after returnBy is day 1. Example: returnBy 1 Oct, cutoff 4 Oct → 3 days.
 * 3. Cutoff is returnedAt when that is set, so logging "returned" freezes the count.
 *    Until then the cutoff is today and the estimate keeps running.
 * 4. Estimated detention = daysOverdue × the rate the user typed for this booking.
 *    A blank or zero rate accrues ₱0. No shipping-line tariff is assumed.
 *
 * These pesos are an estimate only. The shipping line's invoice is the actual charge.
 */
export const DETENTION_ESTIMATE_LABEL =
  "Estimated. Actual charges come from the shipping line's invoice.";

export const CONTAINER_SIZES: ContainerSize[] = ['20', '40', '40HC', 'other'];

export const RETURN_OUTCOME_LABELS: Record<ReturnAttemptOutcome, string> = {
  returned: 'Returned',
  no_slot: 'No slot',
  queue_delay: 'Queue delay',
  other: 'Other',
};

export interface ContainerDraft {
  containerNo: string;
  shippingLine: string;
  containerSize: '' | ContainerSize;
  pickupDate: string;
  freeTimeDays: string;
  freeTimeStartDate: string;
  returnBy: string;
  returnByOverridden: boolean;
  returnDepot: string;
  detentionRatePerDay: string;
  saveRateDefault: boolean;
}

export interface DetentionEstimate {
  daysOverdue: number;
  /** Calendar days from today until returnBy. Negative when already past returnBy. */
  daysLeft: number | null;
  detentionAccruedPhp: number;
  accrualStopped: boolean;
  asOfDate: string;
  cutoffDate: string;
}

export interface ContainerReportGroup {
  label: string;
  estimatedDetentionPhp: number;
  noSlotAttempts: number;
  averageQueueMinutes: number | null;
}

export interface ContainerMonthReport {
  monthKey: string;
  byDepot: ContainerReportGroup[];
  byShippingLine: ContainerReportGroup[];
}

export function resolveMoveType(trip: { moveType?: MoveType | string | null }): 'direct' | 'container' {
  return trip.moveType === 'container' ? 'container' : 'direct';
}

export function isContainerBooking(trip: { moveType?: MoveType | string | null }): boolean {
  return resolveMoveType(trip) === 'container';
}

/** Still out with the shipping line. Trip completion does not close this. */
export function isOpenContainerBooking(trip: Trip): boolean {
  return isContainerBooking(trip) && trip.status !== 'Cancelled' && !trip.container?.returnedAt;
}

export function emptyContainerDraft(pickupDate = ''): ContainerDraft {
  return {
    containerNo: '',
    shippingLine: '',
    containerSize: '',
    pickupDate,
    freeTimeDays: '',
    freeTimeStartDate: pickupDate,
    returnBy: '',
    returnByOverridden: false,
    returnDepot: '',
    detentionRatePerDay: '',
    saveRateDefault: false,
  };
}

export function draftFromContainer(container: ContainerTracking | undefined, fallbackPickup = ''): ContainerDraft {
  const pickup = container?.pickupDate || fallbackPickup;
  const start = container?.freeTimeStartDate || pickup;
  return {
    containerNo: container?.containerNo || '',
    shippingLine: container?.shippingLine || '',
    containerSize: container?.containerSize || '',
    pickupDate: pickup,
    freeTimeDays: container?.freeTimeDays === undefined || container?.freeTimeDays === null ? '' : String(container.freeTimeDays),
    freeTimeStartDate: start,
    returnBy: container?.returnBy || '',
    returnByOverridden: Boolean(container?.returnByOverridden),
    returnDepot: container?.returnDepot || '',
    detentionRatePerDay:
      container?.detentionRatePerDay === undefined || container?.detentionRatePerDay === null
        ? ''
        : String(container.detentionRatePerDay),
    saveRateDefault: false,
  };
}

/** returnBy = freeTimeStartDate + freeTimeDays, as whole calendar days. */
export function computeReturnBy(freeTimeStartDate: string, freeTimeDays: number): string | '' {
  const start = manilaDateKey(freeTimeStartDate);
  if (!start || !Number.isFinite(freeTimeDays)) return '';
  return addCalendarDays(start, freeTimeDays);
}

export function patchContainerDraft(draft: ContainerDraft, patch: Partial<ContainerDraft>): ContainerDraft {
  const next: ContainerDraft = { ...draft, ...patch };
  if (patch.returnBy !== undefined && patch.returnByOverridden === undefined) {
    next.returnByOverridden = true;
  }
  if (patch.pickupDate !== undefined && patch.freeTimeStartDate === undefined) {
    if (!draft.freeTimeStartDate || draft.freeTimeStartDate === draft.pickupDate) {
      next.freeTimeStartDate = patch.pickupDate;
    }
  }
  const shouldRecompute =
    !next.returnByOverridden &&
    (patch.freeTimeStartDate !== undefined ||
      patch.freeTimeDays !== undefined ||
      patch.pickupDate !== undefined ||
      patch.returnByOverridden === false);
  if (shouldRecompute) {
    const days = Number(next.freeTimeDays);
    if (next.freeTimeStartDate.trim() && next.freeTimeDays.trim() !== '' && Number.isFinite(days)) {
      next.returnBy = computeReturnBy(next.freeTimeStartDate, days);
    }
  }
  return next;
}

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function containerRecordFromDraft(draft: ContainerDraft): ContainerTracking {
  const freeRaw = draft.freeTimeDays.trim();
  const freeTimeDays = freeRaw === '' ? undefined : Number(freeRaw);
  const rateRaw = draft.detentionRatePerDay.trim();
  const rate = rateRaw === '' ? undefined : Number(rateRaw);
  return {
    containerNo: clean(draft.containerNo),
    shippingLine: clean(draft.shippingLine),
    containerSize: draft.containerSize || undefined,
    pickupDate: clean(draft.pickupDate),
    freeTimeDays: freeTimeDays !== undefined && Number.isFinite(freeTimeDays) ? freeTimeDays : undefined,
    freeTimeStartDate: clean(draft.freeTimeStartDate),
    returnBy: clean(draft.returnBy),
    returnByOverridden: draft.returnByOverridden || undefined,
    returnDepot: clean(draft.returnDepot),
    detentionRatePerDay: rate !== undefined && Number.isFinite(rate) ? rate : undefined,
  };
}

/**
 * Direct bookings, and every booking while tracking is off, get no container keys.
 * A missing moveType stays the stored shape of a direct booking.
 */
export function bookingContainerFields(
  trackingEnabled: boolean,
  moveType: 'direct' | 'container',
  draft: ContainerDraft,
): { moveType: 'container'; container: ContainerTracking } | Record<string, never> {
  if (!trackingEnabled || moveType !== 'container') return {};
  return { moveType: 'container', container: containerRecordFromDraft(draft) };
}

export function mergeContainerDraft(existing: ContainerTracking | undefined, draft: ContainerDraft): ContainerTracking {
  return {
    ...existing,
    ...containerRecordFromDraft(draft),
    returnAttempts: existing?.returnAttempts,
    returnedAt: existing?.returnedAt,
  };
}

export function withReturnAttempt(
  existing: ContainerTracking | undefined,
  attempt: ContainerReturnAttempt,
): ContainerTracking {
  const base = existing || {};
  const returnedAt =
    attempt.outcome === 'returned' && !base.returnedAt ? attempt.attemptedAt : base.returnedAt;
  return {
    ...base,
    returnAttempts: [...(base.returnAttempts || []), attempt],
    returnedAt,
  };
}

export function manilaDateKey(input: string | Date | undefined | null): string | null {
  if (!input) return null;
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input.trim())) return input.trim();
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function addCalendarDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  const yyyy = utc.getUTCFullYear();
  const mm = String(utc.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(utc.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** Whole calendar days from `fromKey` to `toKey`. Positive when `toKey` is later. */
export function calendarDaysBetween(fromKey: string, toKey: string): number {
  const [y1, m1, d1] = fromKey.split('-').map(Number);
  const [y2, m2, d2] = toKey.split('-').map(Number);
  const from = Date.UTC(y1, m1 - 1, d1);
  const to = Date.UTC(y2, m2 - 1, d2);
  return Math.round((to - from) / 86400000);
}

export function estimateContainerDetention(
  container: ContainerTracking | undefined,
  asOf: Date = new Date(),
): DetentionEstimate {
  const asOfDate = manilaDateKey(asOf) || manilaDateKey(new Date()) || '1970-01-01';
  const stopped = Boolean(container?.returnedAt);
  const cutoffDate = stopped ? manilaDateKey(container?.returnedAt) || asOfDate : asOfDate;
  const returnBy = manilaDateKey(container?.returnBy || '');
  if (!returnBy) {
    return {
      daysOverdue: 0,
      daysLeft: null,
      detentionAccruedPhp: 0,
      accrualStopped: stopped,
      asOfDate,
      cutoffDate,
    };
  }
  const daysOverdue = Math.max(0, calendarDaysBetween(returnBy, cutoffDate));
  const rate = Number(container?.detentionRatePerDay);
  const safeRate = Number.isFinite(rate) && rate > 0 ? rate : 0;
  return {
    daysOverdue,
    daysLeft: calendarDaysBetween(asOfDate, returnBy),
    detentionAccruedPhp: daysOverdue * safeRate,
    accrualStopped: stopped,
    asOfDate,
    cutoffDate,
  };
}

export function formatManilaDate(value?: string): string {
  const key = manilaDateKey(value || '');
  if (!key) return '—';
  const [year, month, day] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-PH', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatManilaDateTime(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatEstimatedPeso(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  return `₱${rounded.toLocaleString('en-PH', {
    minimumFractionDigits: Number.isInteger(rounded) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export function lookupContainerRateDefault(
  defaults: ContainerRateDefault[] | undefined,
  shippingLine: string,
  containerSize: '' | ContainerSize,
): number | undefined {
  const line = shippingLine.trim().toLowerCase();
  if (!line || !containerSize) return undefined;
  const match = (defaults || []).find(
    (row) => row.shippingLine.trim().toLowerCase() === line && row.containerSize === containerSize,
  );
  return match && Number.isFinite(match.ratePerDay) ? match.ratePerDay : undefined;
}

export function upsertContainerRateDefault(
  current: ContainerRateDefault[] | undefined,
  entry: ContainerRateDefault,
): ContainerRateDefault[] {
  const line = entry.shippingLine.trim();
  const kept = (current || []).filter(
    (row) =>
      !(row.shippingLine.trim().toLowerCase() === line.toLowerCase() && row.containerSize === entry.containerSize),
  );
  kept.push({ shippingLine: line, containerSize: entry.containerSize, ratePerDay: entry.ratePerDay });
  return kept;
}

export function collectShippingLineSuggestions(
  trips: Array<{ moveType?: MoveType; container?: ContainerTracking }>,
  defaults?: ContainerRateDefault[],
): string[] {
  const seen = new Map<string, string>();
  const add = (value?: string) => {
    const trimmed = value?.trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    if (!seen.has(key)) seen.set(key, trimmed);
  };
  for (const trip of trips) {
    if (!isContainerBooking(trip)) continue;
    add(trip.container?.shippingLine);
  }
  for (const row of defaults || []) add(row.shippingLine);
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

export function openContainerBookings(trips: Trip[]): Trip[] {
  return trips.filter(isOpenContainerBooking).sort((a, b) => {
    const left = a.container?.returnBy || '9999-99-99';
    const right = b.container?.returnBy || '9999-99-99';
    if (left !== right) return left.localeCompare(right);
    return (a.tripNumber || '').localeCompare(b.tripNumber || '');
  });
}

export function returnAttemptsNewestFirst(attempts: ContainerReturnAttempt[] | undefined): ContainerReturnAttempt[] {
  return [...(attempts || [])].sort((a, b) => {
    const left = Date.parse(a.attemptedAt) || 0;
    const right = Date.parse(b.attemptedAt) || 0;
    return right - left;
  });
}

function monthBounds(monthKey: string): { start: string; end: string } | null {
  if (!/^\d{4}-\d{2}$/.test(monthKey)) return null;
  const year = Number(monthKey.slice(0, 4));
  const month = Number(monthKey.slice(5, 7));
  if (!year || month < 1 || month > 12) return null;
  const last = new Date(Date.UTC(year, month, 0));
  const end = `${last.getUTCFullYear()}-${String(last.getUTCMonth() + 1).padStart(2, '0')}-${String(last.getUTCDate()).padStart(2, '0')}`;
  return { start: `${monthKey}-01`, end };
}

function overdueDaysInMonth(returnBy: string, cutoff: string, rangeStart: string, rangeEnd: string): number {
  if (cutoff <= returnBy) return 0;
  const firstOverdue = addCalendarDays(returnBy, 1);
  const start = firstOverdue > rangeStart ? firstOverdue : rangeStart;
  const end = cutoff < rangeEnd ? cutoff : rangeEnd;
  if (end < start) return 0;
  return calendarDaysBetween(start, end) + 1;
}

interface ReportBucket {
  estimatedDetentionPhp: number;
  noSlotAttempts: number;
  queueMinutesSum: number;
  queueSampleCount: number;
}

function bucket(map: Map<string, ReportBucket>, label: string): ReportBucket {
  const key = label.trim() || 'Not set';
  let row = map.get(key);
  if (!row) {
    row = { estimatedDetentionPhp: 0, noSlotAttempts: 0, queueMinutesSum: 0, queueSampleCount: 0 };
    map.set(key, row);
  }
  return row;
}

function finishGroups(map: Map<string, ReportBucket>): ContainerReportGroup[] {
  return [...map.entries()]
    .map(([label, row]) => ({
      label,
      estimatedDetentionPhp: row.estimatedDetentionPhp,
      noSlotAttempts: row.noSlotAttempts,
      averageQueueMinutes:
        row.queueSampleCount > 0 ? Math.round((row.queueMinutesSum / row.queueSampleCount) * 10) / 10 : null,
    }))
    .filter((row) => row.estimatedDetentionPhp > 0 || row.noSlotAttempts > 0 || row.averageQueueMinutes !== null)
    .sort((a, b) => b.estimatedDetentionPhp - a.estimatedDetentionPhp || a.label.localeCompare(b.label));
}

export function buildContainerMonthReport(trips: Trip[], monthKey: string, asOf: Date = new Date()): ContainerMonthReport {
  const bounds = monthBounds(monthKey);
  const byDepot = new Map<string, ReportBucket>();
  const byShippingLine = new Map<string, ReportBucket>();
  if (!bounds) return { monthKey, byDepot: [], byShippingLine: [] };

  const today = manilaDateKey(asOf) || bounds.end;
  for (const trip of trips) {
    if (!isContainerBooking(trip)) continue;
    const container = trip.container;
    const lineLabel = container?.shippingLine?.trim() || 'Not set';
    const returnBy = manilaDateKey(container?.returnBy || '');
    const rate = Number(container?.detentionRatePerDay);
    const safeRate = Number.isFinite(rate) && rate > 0 ? rate : 0;
    if (returnBy) {
      let cutoff: string | null = null;
      if (container?.returnedAt) cutoff = manilaDateKey(container.returnedAt);
      else if (today < bounds.start) cutoff = null;
      else if (today > bounds.end) cutoff = bounds.end;
      else cutoff = today;
      if (cutoff) {
        const days = overdueDaysInMonth(returnBy, cutoff, bounds.start, bounds.end);
        const pesos = days * safeRate;
        if (pesos > 0) {
          bucket(byDepot, container?.returnDepot || 'Not set').estimatedDetentionPhp += pesos;
          bucket(byShippingLine, lineLabel).estimatedDetentionPhp += pesos;
        }
      }
    }

    for (const attempt of container?.returnAttempts || []) {
      const day = manilaDateKey(attempt.attemptedAt);
      if (!day || day < bounds.start || day > bounds.end) continue;
      const depotLabel = attempt.depot?.trim() || container?.returnDepot?.trim() || 'Not set';
      if (attempt.outcome === 'no_slot') {
        bucket(byDepot, depotLabel).noSlotAttempts += 1;
        bucket(byShippingLine, lineLabel).noSlotAttempts += 1;
      }
      if (attempt.queueMinutes !== undefined && Number.isFinite(attempt.queueMinutes) && attempt.queueMinutes >= 0) {
        const depotRow = bucket(byDepot, depotLabel);
        const lineRow = bucket(byShippingLine, lineLabel);
        depotRow.queueMinutesSum += attempt.queueMinutes;
        depotRow.queueSampleCount += 1;
        lineRow.queueMinutesSum += attempt.queueMinutes;
        lineRow.queueSampleCount += 1;
      }
    }
  }

  return {
    monthKey,
    byDepot: finishGroups(byDepot),
    byShippingLine: finishGroups(byShippingLine),
  };
}

export function currentManilaMonth(asOf: Date = new Date()): string {
  return (manilaDateKey(asOf) || '1970-01-01').slice(0, 7);
}
