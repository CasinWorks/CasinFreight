import type { Trip } from '../types';

export interface TruckBusyBlock {
  tripId: string;
  tripNumber: string;
  route: string;
  start: Date;
  end: Date;
}

/** Wall-clock value used by the booking form: YYYY-MM-DDTHH:mm in the browser's local time. */
export function formatScheduleValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function parseSchedule(value?: string | null): Date | null {
  if (!value) return null;
  const local = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (local && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(value.trim())) {
    const date = new Date(Number(local[1]), Number(local[2]) - 1, Number(local[3]), Number(local[4]), Number(local[5]), 0, 0);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function startOfWeek(date: Date): Date {
  const day = startOfDay(date);
  const mondayOffset = (day.getDay() + 6) % 7;
  return addDays(day, -mondayOffset);
}

export function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function formatHourLabel(hour: number): string {
  const h = hour % 12 || 12;
  return `${h}:00 ${hour < 12 ? 'AM' : 'PM'}`;
}

export function formatClock(date: Date): string {
  return date.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
}

export function formatDayLabel(date: Date): string {
  return date.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' });
}

/** Cancelled bookings do not hold the truck. The window is pickup through delivery. */
export function busyBlocks(trips: Array<Pick<Trip, 'id' | 'tripNumber' | 'truckId' | 'status' | 'originZone' | 'destinationZone' | 'scheduledPickup' | 'scheduledDelivery'>>, truckId: string): TruckBusyBlock[] {
  if (!truckId) return [];
  const blocks: TruckBusyBlock[] = [];
  for (const trip of trips) {
    if (trip.truckId !== truckId || trip.status === 'Cancelled') continue;
    const start = parseSchedule(trip.scheduledPickup);
    const endRaw = parseSchedule(trip.scheduledDelivery);
    if (!start) continue;
    const end = endRaw && endRaw > start ? endRaw : new Date(start.getTime() + 60 * 60 * 1000);
    blocks.push({
      tripId: trip.id,
      tripNumber: trip.tripNumber || 'Booking',
      route: `${trip.originZone || 'Origin'} → ${trip.destinationZone || 'Destination'}`,
      start,
      end,
    });
  }
  return blocks.sort((a, b) => a.start.getTime() - b.start.getTime());
}

export function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/** The hour starts before the current clock time, so the truck cannot leave then. */
export function hourIsPast(day: Date, hour: number, now = new Date()): boolean {
  const slot = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, 0, 0, 0);
  return slot.getTime() < now.getTime();
}

export function scheduleIsPast(value: string | undefined | null, now = new Date()): boolean {
  const date = parseSchedule(value);
  return Boolean(date && date.getTime() < now.getTime());
}

export function hourBooking(blocks: TruckBusyBlock[], day: Date, hour: number): TruckBusyBlock | null {
  const slotStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, 0, 0, 0);
  const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);
  return blocks.find((block) => rangesOverlap(slotStart, slotEnd, block.start, block.end)) || null;
}

export function windowConflict(blocks: TruckBusyBlock[], pickup: string, delivery: string): TruckBusyBlock | null {
  const start = parseSchedule(pickup);
  const end = parseSchedule(delivery);
  if (!start || !end || end <= start) return null;
  return blocks.find((block) => rangesOverlap(start, end, block.start, block.end)) || null;
}

export function dayHasBooking(blocks: TruckBusyBlock[], day: Date): boolean {
  const dayStart = startOfDay(day);
  const dayEnd = addDays(dayStart, 1);
  return blocks.some((block) => rangesOverlap(dayStart, dayEnd, block.start, block.end));
}

export function bookingsOnDay(blocks: TruckBusyBlock[], day: Date): TruckBusyBlock[] {
  const dayStart = startOfDay(day);
  const dayEnd = addDays(dayStart, 1);
  return blocks.filter((block) => rangesOverlap(dayStart, dayEnd, block.start, block.end));
}
