import type { Trip } from '../types';
import {
  bookingContainerFields,
  buildContainerMonthReport,
  computeReturnBy,
  emptyContainerDraft,
  estimateContainerDetention,
  isContainerBooking,
  isOpenContainerBooking,
  patchContainerDraft,
  resolveMoveType,
  withReturnAttempt,
} from './containerTracking';

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

const filled = patchContainerDraft(emptyContainerDraft('2026-10-01'), {
  containerNo: 'TCLU1234567',
  shippingLine: 'Any Line',
  containerSize: '40',
  freeTimeDays: '3',
  detentionRatePerDay: '1500',
  returnDepot: 'MICT',
});

const directOff = bookingContainerFields(false, 'direct', filled);
const directOn = bookingContainerFields(true, 'direct', filled);
assert(Object.keys(directOff).length === 0, 'setting off must not add container fields');
assert(Object.keys(directOn).length === 0, 'Direct choice must not add container fields even when tracking is on');
assert(JSON.stringify({ notes: 'same', ...directOff }) === JSON.stringify({ notes: 'same', ...directOn }), 'direct payloads must match with the setting off and on');

const oldTrip = { id: 'old', status: 'Delivered', moveType: undefined } as Trip;
assert(resolveMoveType(oldTrip) === 'direct', 'missing moveType is direct');
assert(!isContainerBooking(oldTrip), 'old bookings are not container bookings');
assert(!isOpenContainerBooking(oldTrip), 'old bookings are not open container bookings');

assert(computeReturnBy('2026-10-01', 3) === '2026-10-04', 'returnBy is start date plus free-time days');
assert(filled.returnBy === '2026-10-04', 'draft computes returnBy');
const overridden = patchContainerDraft(filled, { returnBy: '2026-10-06' });
assert(overridden.returnByOverridden && overridden.returnBy === '2026-10-06', 'manual returnBy is kept');
const recomputed = patchContainerDraft(overridden, { returnByOverridden: false });
assert(recomputed.returnBy === '2026-10-04' && !recomputed.returnByOverridden, 'computed date can be restored');

const overdue = estimateContainerDetention(
  { returnBy: '2026-09-28', detentionRatePerDay: 1500 },
  new Date('2026-10-01T04:00:00.000Z'),
);
assert(overdue.daysOverdue === 3, `expected 3 overdue days, got ${overdue.daysOverdue}`);
assert(overdue.detentionAccruedPhp === 4500, `expected 4500, got ${overdue.detentionAccruedPhp}`);
assert(overdue.daysLeft === -3, `expected -3 days left, got ${overdue.daysLeft}`);
assert(!overdue.accrualStopped, 'open box should keep accruing');

const returned = estimateContainerDetention(
  { returnBy: '2026-09-28', detentionRatePerDay: 1500, returnedAt: '2026-09-30T02:00:00.000Z' },
  new Date('2026-10-04T04:00:00.000Z'),
);
assert(returned.accrualStopped, 'returned stops accrual');
assert(returned.daysOverdue === 2, `returned should stay at 2 days, got ${returned.daysOverdue}`);
assert(returned.detentionAccruedPhp === 3000, `returned amount should stay 3000, got ${returned.detentionAccruedPhp}`);

const logged = withReturnAttempt(
  { returnBy: '2026-09-28', detentionRatePerDay: 1000 },
  {
    id: 'a1',
    attemptedAt: '2026-09-30T02:00:00.000Z',
    depot: 'MICT',
    outcome: 'returned',
    loggedBy: 'Dispatcher',
  },
);
assert(logged.returnedAt === '2026-09-30T02:00:00.000Z', 'logging returned sets returnedAt');
const afterLog = estimateContainerDetention(logged, new Date('2026-10-04T04:00:00.000Z'));
assert(afterLog.daysOverdue === 2 && afterLog.detentionAccruedPhp === 2000, 'logging returned freezes the estimate');

const reportTrip = {
  id: 'c1',
  status: 'Delivered',
  moveType: 'container',
  container: {
    shippingLine: 'Any Line',
    returnDepot: 'MICT',
    returnBy: '2026-09-28',
    detentionRatePerDay: 1000,
    returnAttempts: [
      {
        id: 'n1',
        attemptedAt: '2026-10-01T02:00:00.000Z',
        depot: 'MICT',
        outcome: 'no_slot' as const,
        queueMinutes: 40,
        loggedBy: 'Dispatcher',
      },
      {
        id: 'n2',
        attemptedAt: '2026-10-01T06:00:00.000Z',
        depot: 'North Harbor',
        outcome: 'queue_delay' as const,
        queueMinutes: 20,
        loggedBy: 'Dispatcher',
      },
    ],
  },
} as Trip;

const directReportTrip = { id: 'd1', status: 'Invoiced', container: reportTrip.container } as Trip;
const october = buildContainerMonthReport([reportTrip, directReportTrip, oldTrip], '2026-10', new Date('2026-10-01T04:00:00.000Z'));
const mict = october.byDepot.find((row) => row.label === 'MICT');
const line = october.byShippingLine.find((row) => row.label === 'Any Line');
assert(mict?.noSlotAttempts === 1, 'October should count one no-slot attempt at MICT');
assert(mict?.estimatedDetentionPhp === 1000, `MICT October detention should be 1000, got ${mict?.estimatedDetentionPhp}`);
assert(line?.noSlotAttempts === 1, 'shipping line should count the no-slot attempt');
assert(line?.averageQueueMinutes === 30, `average queue should be 30, got ${line?.averageQueueMinutes}`);
assert(october.byDepot.every((row) => row.label !== 'Direct'), 'direct bookings stay out of the report');

console.log('container tracking checks passed');
