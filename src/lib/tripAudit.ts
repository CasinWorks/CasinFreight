import { Trip, TripStatusRetractionRequest, TripTimelineEvent, TripTimelineRetraction } from '../types';

export function formatTripAuditWhen(iso?: string): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function timelineRetractionFromRequest(req: TripStatusRetractionRequest): TripTimelineRetraction {
  return {
    fromStatus: req.fromStatus,
    toStatus: req.toStatus,
    requestedBy: req.requestedBy,
    requestedByRole: req.requestedByRole,
    requestedAt: req.requestedAt,
    approvedBy: req.reviewedBy || req.requestedBy,
    approvedByRole: req.reviewedByRole || req.requestedByRole,
    approvedAt: req.reviewedAt || req.requestedAt,
    reasonCategory: req.reasonCategory,
    reason: req.detailedReason,
    outcome: req.status === 'Rejected' ? 'Rejected' : 'Approved',
  };
}

export function isRollbackTimelineNote(note?: string): boolean {
  return Boolean(note && /status rollback/i.test(note));
}

export function resolveTimelineRetraction(
  event: TripTimelineEvent,
  trip: Trip,
  usedHistoryIds: Set<string>
): TripTimelineRetraction | null {
  if (event.retraction) return event.retraction;
  if (event.kind !== 'status_rollback' && event.kind !== 'status_rollback_rejected' && !isRollbackTimelineNote(event.note)) {
    return null;
  }

  const history = trip.statusRetractionHistory || [];
  const eventTime = new Date(event.timestamp).getTime();
  const match = history.find((item) => {
    if (usedHistoryIds.has(item.id)) return false;
    if (item.status === 'Approved' && item.toStatus !== event.status) return false;
    if (item.status === 'Rejected' && event.kind !== 'status_rollback_rejected' && !isRollbackTimelineNote(event.note)) {
      return false;
    }
    const itemTime = new Date(item.reviewedAt || item.requestedAt).getTime();
    return Number.isFinite(eventTime) && Number.isFinite(itemTime) && Math.abs(itemTime - eventTime) < 5 * 60 * 1000;
  });

  if (match) {
    usedHistoryIds.add(match.id);
    return timelineRetractionFromRequest(match);
  }

  const leftover = history.find((item) => !usedHistoryIds.has(item.id) && (item.status === 'Approved' || item.status === 'Rejected'));
  if (leftover && (event.kind === 'status_rollback' || event.kind === 'status_rollback_rejected' || isRollbackTimelineNote(event.note))) {
    usedHistoryIds.add(leftover.id);
    return timelineRetractionFromRequest(leftover);
  }

  if (!isRollbackTimelineNote(event.note) && event.kind !== 'status_rollback' && event.kind !== 'status_rollback_rejected') {
    return null;
  }

  const arrow = event.note?.match(/([A-Za-z ]+)\s*(?:→|->)\s*([A-Za-z ]+)/);
  const reasonFromNote = event.note?.replace(/^.*?Status rollback[^.]*(?:approved)?[^.]*\.\s*/i, '').trim();
  return {
    fromStatus: (arrow?.[1]?.trim() as Trip['status']) || event.status,
    toStatus: (arrow?.[2]?.trim() as Trip['status']) || event.status,
    requestedBy: event.updatedBy,
    requestedByRole: '',
    requestedAt: event.timestamp,
    approvedBy: event.updatedBy,
    approvedByRole: '',
    approvedAt: event.timestamp,
    reasonCategory: 'Other operational error',
    reason: reasonFromNote && reasonFromNote !== event.note ? reasonFromNote : (event.note || '—'),
    outcome: event.kind === 'status_rollback_rejected' ? 'Rejected' : 'Approved',
  };
}
