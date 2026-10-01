import type { CrewWeekPayment, Driver, Trip } from '../types';
import { manilaDateKey } from './dispatchPapers';

export function roundPhp(value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export function formatPhp(value: number): string {
  return `₱${roundPhp(value).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function calendarDate(day: string): Date {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(Date.UTC(year, (month || 1) - 1, date || 1));
}

function formatDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Monday–Sunday in the Philippine calendar. */
export function manilaWeek(anchor = manilaDateKey()): { start: string; end: string } {
  const day = calendarDate(anchor.slice(0, 10));
  const weekday = day.getUTCDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  day.setUTCDate(day.getUTCDate() + mondayOffset);
  const start = formatDay(day);
  day.setUTCDate(day.getUTCDate() + 6);
  return { start, end: formatDay(day) };
}

export function shiftWeek(start: string, weeks: number): { start: string; end: string } {
  const day = calendarDate(start);
  day.setUTCDate(day.getUTCDate() + weeks * 7);
  return manilaWeek(formatDay(day));
}

export function weekLabel(start: string, end: string): string {
  const left = calendarDate(start).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  const right = calendarDate(end).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  return `${left} – ${right}`;
}

export function tripServiceDay(trip: Pick<Trip, 'actualDelivery' | 'pod' | 'scheduledDelivery'>): string {
  const raw = trip.actualDelivery || trip.pod?.signedAt || trip.scheduledDelivery || '';
  const head = String(raw).trim().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(head)) return head;
  return '';
}

export interface CrewWeekLine {
  tripId: string;
  waybillNumber: string;
  tripNumber: string;
  serviceDate: string;
  role: 'driver' | 'helper';
  tripPayPhp: number;
  foodPhp: number;
  totalPhp: number;
  source: 'trip' | 'rate' | 'missing';
}

export interface CrewWeekRow {
  personId: string;
  name: string;
  role: 'driver' | 'helper';
  trips: number;
  tripPayPhp: number;
  foodPhp: number;
  owedPhp: number;
  missingRate: number;
  lines: CrewWeekLine[];
}

function payable(trip: Trip): boolean {
  return trip.status === 'Delivered' || trip.status === 'Invoiced';
}

function amountsFor(
  trip: Trip,
  person: Driver,
  role: 'driver' | 'helper'
): Pick<CrewWeekLine, 'tripPayPhp' | 'foodPhp' | 'totalPhp' | 'source'> {
  const saved = trip.crewPay;
  const savedPay = role === 'driver' ? Number(saved?.driverTripPayPhp) || 0 : Number(saved?.helperTripPayPhp) || 0;
  const savedFood = role === 'driver' ? Number(saved?.driverFoodPhp) || 0 : Number(saved?.helperFoodPhp) || 0;
  if (saved && (savedPay > 0 || savedFood > 0)) {
    return { tripPayPhp: roundPhp(savedPay), foodPhp: roundPhp(savedFood), totalPhp: roundPhp(savedPay + savedFood), source: 'trip' };
  }
  const tripPayPhp = roundPhp(Number(person.tripPayPhp) || 0);
  const foodPhp = roundPhp(Number(person.foodAllowancePhp) || 0);
  if (tripPayPhp > 0 || foodPhp > 0) {
    return { tripPayPhp, foodPhp, totalPhp: roundPhp(tripPayPhp + foodPhp), source: 'rate' };
  }
  return { tripPayPhp: 0, foodPhp: 0, totalPhp: 0, source: 'missing' };
}

export function crewWeekRows(drivers: Driver[], trips: Trip[], start: string, end: string): CrewWeekRow[] {
  const rows = new Map<string, CrewWeekRow>();
  const ensure = (person: Driver): CrewWeekRow => {
    const existing = rows.get(person.id);
    if (existing) return existing;
    const row: CrewWeekRow = {
      personId: person.id,
      name: person.name,
      role: person.crewRole === 'helper' ? 'helper' : 'driver',
      trips: 0,
      tripPayPhp: 0,
      foodPhp: 0,
      owedPhp: 0,
      missingRate: 0,
      lines: [],
    };
    rows.set(person.id, row);
    return row;
  };

  trips.forEach((trip) => {
    if (!payable(trip)) return;
    const serviceDate = tripServiceDay(trip);
    if (!serviceDate || serviceDate < start || serviceDate > end) return;
    const seats: Array<{ id?: string; role: 'driver' | 'helper' }> = [
      { id: trip.driverId, role: 'driver' },
      { id: trip.helperId, role: 'helper' },
    ];
    seats.forEach((seat) => {
      if (!seat.id) return;
      const person = drivers.find((driver) => driver.id === seat.id);
      if (!person) return;
      const money = amountsFor(trip, person, seat.role);
      const row = ensure(person);
      row.trips += 1;
      row.tripPayPhp = roundPhp(row.tripPayPhp + money.tripPayPhp);
      row.foodPhp = roundPhp(row.foodPhp + money.foodPhp);
      row.owedPhp = roundPhp(row.owedPhp + money.totalPhp);
      if (money.source === 'missing') row.missingRate += 1;
      row.lines.push({
        tripId: trip.id,
        waybillNumber: trip.waybillNumber,
        tripNumber: trip.tripNumber,
        serviceDate,
        role: seat.role,
        ...money,
      });
    });
  });

  return [...rows.values()]
    .map((row) => ({
      ...row,
      lines: row.lines.sort((a, b) => a.serviceDate.localeCompare(b.serviceDate) || a.waybillNumber.localeCompare(b.waybillNumber)),
    }))
    .sort((a, b) => b.owedPhp - a.owedPhp || a.name.localeCompare(b.name));
}

export function weekPayment(person: Pick<Driver, 'weekPayments'> | undefined, weekStart: string): CrewWeekPayment | undefined {
  return person?.weekPayments?.find((payment) => payment.weekStart === weekStart);
}

export function crewWeekCash(rows: CrewWeekRow[], drivers: Driver[], weekStart: string): {
  stillOwedPhp: number;
  paidPhp: number;
  stillPeople: number;
  paidPeople: number;
} {
  return rows.reduce(
    (sum, row) => {
      const person = drivers.find((driver) => driver.id === row.personId);
      const paid = weekPayment(person, weekStart);
      if (paid) {
        return { ...sum, paidPhp: roundPhp(sum.paidPhp + paid.owedPhp), paidPeople: sum.paidPeople + 1 };
      }
      return { ...sum, stillOwedPhp: roundPhp(sum.stillOwedPhp + row.owedPhp), stillPeople: sum.stillPeople + 1 };
    },
    { stillOwedPhp: 0, paidPhp: 0, stillPeople: 0, paidPeople: 0 }
  );
}

export function crewWeekTotals(rows: CrewWeekRow[]): { people: number; trips: number; owedPhp: number; missingRate: number } {
  return rows.reduce(
    (sum, row) => ({
      people: sum.people + 1,
      trips: sum.trips + row.trips,
      owedPhp: roundPhp(sum.owedPhp + row.owedPhp),
      missingRate: sum.missingRate + row.missingRate,
    }),
    { people: 0, trips: 0, owedPhp: 0, missingRate: 0 }
  );
}
