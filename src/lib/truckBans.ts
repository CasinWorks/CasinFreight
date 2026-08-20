import { TruckBan, TruckBanWindow, TruckType, Weekday } from '../types';

export const WEEKDAYS: Weekday[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export type TruckBanInput = Omit<TruckBan, 'id' | 'companyId' | 'createdAt'>;

export const METRO_MANILA_TRUCK_BAN_PRESETS: TruckBanInput[] = [
  {
    name: 'MMDA EDSA truck ban',
    area: 'EDSA',
    cityOrLgu: 'Metro Manila',
    roadsOrZone: 'EDSA / C-4, Monumento to Magallanes',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    windows: [
      { startTime: '06:00', endTime: '10:00' },
      { startTime: '17:00', endTime: '22:00' },
    ],
    appliesToTruckTypes: 'ALL',
    exemptionNote: 'Window hours, perishables, and trucks with a valid exemption sticker. Confirm the current MMDA circular.',
    notes: 'Usually cargo trucks 4.5 tons GVW and above.',
    isActive: true,
  },
  {
    name: 'MMDA C5 truck ban',
    area: 'C5',
    cityOrLgu: 'Metro Manila',
    roadsOrZone: 'C-5 / Circumferential Road 5, Katipunan, C.P. Garcia',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    windows: [
      { startTime: '06:00', endTime: '10:00' },
      { startTime: '17:00', endTime: '22:00' },
    ],
    appliesToTruckTypes: 'ALL',
    exemptionNote: 'Confirm current MMDA / LGU circular before dispatch.',
    isActive: true,
  },
  {
    name: 'Commonwealth Avenue truck ban',
    area: 'Commonwealth',
    cityOrLgu: 'Quezon City',
    roadsOrZone: 'Commonwealth Avenue, Fairview to Elliptical',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    windows: [
      { startTime: '06:00', endTime: '10:00' },
      { startTime: '17:00', endTime: '22:00' },
    ],
    appliesToTruckTypes: 'ALL',
    isActive: true,
  },
  {
    name: 'Makati CBD truck restriction',
    area: 'Makati',
    cityOrLgu: 'Makati',
    roadsOrZone: 'Ayala Avenue, Paseo de Roxas, Makati Avenue, Buendia / Gil Puyat',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    windows: [
      { startTime: '07:00', endTime: '09:00' },
      { startTime: '17:00', endTime: '21:00' },
    ],
    appliesToTruckTypes: 'ALL',
    exemptionNote: 'CBD loading bays often have a shorter allowed window. Confirm with the building / LGU.',
    isActive: true,
  },
];

const WEEKDAY_FROM_SHORT: Record<string, Weekday> = {
  Sun: 'Sun',
  Mon: 'Mon',
  Tue: 'Tue',
  Wed: 'Wed',
  Thu: 'Thu',
  Fri: 'Fri',
  Sat: 'Sat',
};

function parseTimeToMinutes(hhmm: string): number | null {
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec((hhmm || '').trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function minutesInWindow(minutes: number, window: TruckBanWindow): boolean {
  const start = parseTimeToMinutes(window.startTime);
  const end = parseTimeToMinutes(window.endTime);
  if (start == null || end == null) return false;
  if (start === end) return true;
  if (start < end) return minutes >= start && minutes < end;
  return minutes >= start || minutes < end;
}

export function manilaClock(input: string | Date): { day: Weekday; minutes: number } | null {
  const date = typeof input === 'string' ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const weekdayRaw = parts.find((part) => part.type === 'weekday')?.value || '';
  const day = WEEKDAY_FROM_SHORT[weekdayRaw];
  const hour = Number(parts.find((part) => part.type === 'hour')?.value);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value);
  if (!day || Number.isNaN(hour) || Number.isNaN(minute)) return null;
  return { day, minutes: hour * 60 + minute };
}

function locationHitsBan(location: string, ban: TruckBan): boolean {
  const hay = (location || '').toLowerCase();
  if (!hay.trim()) return false;
  const parts = [ban.area, ban.roadsOrZone]
    .filter(Boolean)
    .flatMap((value) => value.split(/[,/;|]+/))
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length >= 3);
  return parts.some((part) => hay.includes(part));
}

function truckTypeApplies(ban: TruckBan, truckType?: TruckType): boolean {
  if (!truckType || ban.appliesToTruckTypes === 'ALL') return true;
  return ban.appliesToTruckTypes.includes(truckType);
}

function dayAndTimeHit(ban: TruckBan, when: string | Date | undefined): TruckBanWindow | undefined {
  if (!when) return undefined;
  const clock = manilaClock(when);
  if (!clock || !ban.days.includes(clock.day)) return undefined;
  return ban.windows.find((window) => minutesInWindow(clock.minutes, window));
}

export interface TruckBanHit {
  ban: TruckBan;
  where: 'origin' | 'destination';
  when: 'pickup' | 'delivery' | 'now';
  window: TruckBanWindow;
}

export function matchingTruckBans(args: {
  bans: TruckBan[];
  originZone?: string;
  originAddress?: string;
  destinationZone?: string;
  destinationAddress?: string;
  scheduledPickup?: string;
  scheduledDelivery?: string;
  truckType?: TruckType;
  includeNow?: boolean;
}): TruckBanHit[] {
  const originText = `${args.originZone || ''} ${args.originAddress || ''}`;
  const destText = `${args.destinationZone || ''} ${args.destinationAddress || ''}`;
  const hits: TruckBanHit[] = [];

  args.bans.filter((ban) => ban.isActive).forEach((ban) => {
    if (!truckTypeApplies(ban, args.truckType)) return;
    const originMatch = locationHitsBan(originText, ban);
    const destMatch = locationHitsBan(destText, ban);
    if (!originMatch && !destMatch) return;

    const checks: Array<{ when: TruckBanHit['when']; at?: string }> = [
      { when: 'pickup', at: args.scheduledPickup },
      { when: 'delivery', at: args.scheduledDelivery },
    ];
    if (args.includeNow) {
      checks.push({ when: 'now', at: new Date().toISOString() });
    }

    checks.forEach((check) => {
      const window = dayAndTimeHit(ban, check.at);
      if (!window) return;
      if (originMatch) {
        hits.push({ ban, where: 'origin', when: check.when, window });
      }
      if (destMatch) {
        hits.push({ ban, where: 'destination', when: check.when, window });
      }
    });
  });

  const seen = new Set<string>();
  return hits.filter((hit) => {
    const key = `${hit.ban.id}:${hit.where}:${hit.when}:${hit.window.startTime}-${hit.window.endTime}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function bansInEffectNow(bans: TruckBan[], at: Date = new Date()): TruckBan[] {
  return bans.filter((ban) => ban.isActive && Boolean(dayAndTimeHit(ban, at)));
}

export function formatBanDays(days: Weekday[]): string {
  if (days.length === 7) return 'Daily';
  const weekend = days.length === 2 && days.includes('Sat') && days.includes('Sun');
  if (weekend) return 'Weekends';
  const weekdays = WEEKDAYS.filter((day) => day !== 'Sat' && day !== 'Sun');
  if (weekdays.every((day) => days.includes(day)) && !days.includes('Sat') && !days.includes('Sun')) {
    return 'Weekdays';
  }
  if (weekdays.every((day) => days.includes(day)) && days.includes('Sat') && !days.includes('Sun')) {
    return 'Mon–Sat';
  }
  return days.join(', ');
}

export function formatBanWindows(windows: TruckBanWindow[]): string {
  return windows
    .map((window) => `${window.startTime}–${window.endTime}`)
    .join(' and ');
}

export function uniqueBansFromHits(hits: TruckBanHit[]): TruckBan[] {
  const seen = new Set<string>();
  return hits.reduce<TruckBan[]>((list, hit) => {
    if (seen.has(hit.ban.id)) return list;
    seen.add(hit.ban.id);
    list.push(hit.ban);
    return list;
  }, []);
}
