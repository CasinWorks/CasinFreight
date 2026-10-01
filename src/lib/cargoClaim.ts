import type { CargoClaim, CargoClaimKind, POD, Trip } from '../types';

export function claimKindForCondition(condition?: POD['conditionStatus']): CargoClaimKind | null {
  if (condition === 'Partial Damage') return 'damage';
  if (condition === 'Packaging Discrepancy') return 'shortage';
  if (condition === 'Refused') return 'refusal';
  return null;
}

export function openClaimForCondition(
  trip: Pick<Trip, 'cargoClaim'>,
  condition: POD['conditionStatus'] | undefined,
  loggedBy: string
): CargoClaim | undefined {
  if (trip.cargoClaim && trip.cargoClaim.status !== 'open') return trip.cargoClaim;
  const kind = claimKindForCondition(condition);
  if (!kind) return trip.cargoClaim;
  return {
    id: trip.cargoClaim?.id || `claim-${Date.now()}`,
    kind,
    status: 'open',
    note: trip.cargoClaim?.note || '',
    debitMemoPhp: trip.cargoClaim?.debitMemoPhp,
    loggedAt: new Date().toISOString(),
    loggedBy,
  };
}

export function invoiceBlockReason(trip: Pick<Trip, 'pod' | 'cargoClaim'>): string | null {
  const fromPod = claimKindForCondition(trip.pod?.conditionStatus);
  const claim = trip.cargoClaim;
  const unresolved = claim?.status === 'open' || (Boolean(fromPod) && !claim);
  if (!unresolved) return null;
  return 'This load has a shortage, damage, or refusal. Record a debit memo or mark it waived before creating the freight bill.';
}

export function debitMemoLine(trip: Pick<Trip, 'cargoClaim'>): {
  description: string;
  amountPhp: number;
} | null {
  const claim = trip.cargoClaim;
  const amount = Number(claim?.debitMemoPhp) || 0;
  if (!claim || claim.status !== 'debit_memo' || amount <= 0) return null;
  const label = claim.kind === 'shortage' ? 'Shortage' : claim.kind === 'refusal' ? 'Refusal' : 'Damage';
  return {
    description: `Debit memo — ${label}${claim.note ? `: ${claim.note}` : ''}`,
    amountPhp: -Math.abs(amount),
  };
}
