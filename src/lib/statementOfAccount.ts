import type { Invoice, StatementLine, StatementOfAccount, Trip } from '../types';
import { debitMemoLine, invoiceBlockReason } from './cargoClaim';
import { manilaDateKey } from './dispatchPapers';

export function roundPhp(value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export function formatPhp(value: number): string {
  return `₱${roundPhp(value).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function statementMonthLabel(period: string): string {
  const [year, month] = period.split('-').map(Number);
  if (!year || !month) return period;
  return new Date(year, month - 1, 1).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
}

/** Delivery day in YYYY-MM-DD. Falls back to the scheduled delivery. */
export function tripServiceDay(trip: Pick<Trip, 'actualDelivery' | 'pod' | 'scheduledDelivery'>): string {
  const raw = trip.actualDelivery || trip.pod?.signedAt || trip.scheduledDelivery || '';
  const head = String(raw).trim().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(head)) return head;
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return manilaDateKey(parsed);
  return '';
}

export function tripServiceMonth(trip: Pick<Trip, 'actualDelivery' | 'pod' | 'scheduledDelivery'>): string {
  return tripServiceDay(trip).slice(0, 7);
}

export function coveredTripIds(statements: Pick<StatementOfAccount, 'lines'>[]): Set<string> {
  const ids = new Set<string>();
  statements.forEach((statement) => {
    statement.lines.forEach((line) => {
      if (line.tripId) ids.add(line.tripId);
    });
  });
  return ids;
}

export function statementForTrip(
  statements: StatementOfAccount[],
  tripId: string
): StatementOfAccount | undefined {
  return statements.find((statement) => statement.lines.some((line) => line.tripId === tripId));
}

function liveInvoice(invoices: Invoice[], tripId: string): Invoice | undefined {
  return invoices.find((invoice) => invoice.tripId === tripId && invoice.status !== 'Voided');
}

export function tripBillAmounts(trip: Trip, invoices: Invoice[]): Pick<
  StatementLine,
  'subtotalPhp' | 'vatAmountPhp' | 'ewtAmountPhp' | 'grandTotalPhp' | 'invoiceId' | 'invoiceNumber'
> {
  const invoice = liveInvoice(invoices, trip.id);
  if (invoice) {
    return {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      subtotalPhp: roundPhp(invoice.subtotalPhp),
      vatAmountPhp: roundPhp(invoice.vatAmountPhp),
      ewtAmountPhp: roundPhp(invoice.withholdingTaxAmountPhp ?? invoice.subtotalPhp * 0.02),
      grandTotalPhp: roundPhp(invoice.grandTotalPhp),
    };
  }
  const debit = debitMemoLine(trip);
  const subtotalPhp = roundPhp(
    (Number(trip.baseRatePhp) || 0)
    + trip.accessorials.filter((item) => item.approved).reduce((sum, item) => sum + (Number(item.amountPhp) || 0), 0)
    + (debit?.amountPhp || 0)
  );
  const vatAmountPhp = roundPhp(subtotalPhp * 0.12);
  const ewtAmountPhp = roundPhp(subtotalPhp * 0.02);
  return {
    subtotalPhp,
    vatAmountPhp,
    ewtAmountPhp,
    grandTotalPhp: roundPhp(subtotalPhp + vatAmountPhp),
  };
}

export function statementLineForTrip(trip: Trip, invoices: Invoice[]): StatementLine {
  return {
    tripId: trip.id,
    tripNumber: trip.tripNumber,
    waybillNumber: trip.waybillNumber,
    serviceDate: tripServiceDay(trip),
    description: `${trip.originZone} to ${trip.destinationZone}`,
    ...tripBillAmounts(trip, invoices),
  };
}

export interface StatementDraft {
  included: Trip[];
  held: Array<{ trip: Trip; reason: string }>;
  alreadyListed: Array<{ trip: Trip; statement: StatementOfAccount }>;
}

export function statementDraft(
  trips: Trip[],
  statements: StatementOfAccount[],
  clientId: string,
  period: string
): StatementDraft {
  const included: Trip[] = [];
  const held: StatementDraft['held'] = [];
  const alreadyListed: StatementDraft['alreadyListed'] = [];
  trips.forEach((trip) => {
    if (trip.clientId !== clientId) return;
    if (trip.status !== 'Delivered' && trip.status !== 'Invoiced') return;
    if (tripServiceMonth(trip) !== period) return;
    const existing = statementForTrip(statements, trip.id);
    if (existing) {
      alreadyListed.push({ trip, statement: existing });
      return;
    }
    const reason = invoiceBlockReason(trip);
    if (reason) {
      held.push({ trip, reason });
      return;
    }
    included.push(trip);
  });
  const byDate = (a: Trip, b: Trip) => tripServiceDay(a).localeCompare(tripServiceDay(b)) || a.waybillNumber.localeCompare(b.waybillNumber);
  included.sort(byDate);
  held.sort((a, b) => byDate(a.trip, b.trip));
  alreadyListed.sort((a, b) => byDate(a.trip, b.trip));
  return { included, held, alreadyListed };
}

export function nextStatementNumber(statements: Pick<StatementOfAccount, 'statementNumber'>[], period: string): string {
  const prefix = `SOA-${period}`;
  const used = statements
    .map((statement) => statement.statementNumber)
    .filter((number) => number.startsWith(`${prefix}-`))
    .map((number) => Number(number.slice(prefix.length + 1)))
    .filter((value) => Number.isFinite(value));
  const next = (used.length ? Math.max(...used) : 0) + 1;
  return `${prefix}-${String(next).padStart(3, '0')}`;
}

export function buildStatement(params: {
  id: string;
  companyId: string;
  clientId: string;
  period: string;
  statementNumber: string;
  trips: Trip[];
  invoices: Invoice[];
  createdBy: string;
  now?: Date;
}): StatementOfAccount {
  const lines = params.trips.map((trip) => statementLineForTrip(trip, params.invoices));
  const subtotalPhp = roundPhp(lines.reduce((sum, line) => sum + line.subtotalPhp, 0));
  const vatAmountPhp = roundPhp(lines.reduce((sum, line) => sum + line.vatAmountPhp, 0));
  const withholdingTaxAmountPhp = roundPhp(lines.reduce((sum, line) => sum + line.ewtAmountPhp, 0));
  const grandTotalPhp = roundPhp(lines.reduce((sum, line) => sum + line.grandTotalPhp, 0));
  const now = params.now || new Date();
  return {
    id: params.id,
    companyId: params.companyId,
    clientId: params.clientId,
    statementNumber: params.statementNumber,
    period: params.period,
    issueDate: manilaDateKey(now),
    lines,
    subtotalPhp,
    vatPercent: 12,
    vatAmountPhp,
    withholdingTaxPercent: 2,
    withholdingTaxAmountPhp,
    grandTotalPhp,
    createdAt: now.toISOString(),
    createdBy: params.createdBy,
  };
}
