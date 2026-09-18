import { Trip, TripStatus } from '../types';

export const PIPELINE_STAGES: TripStatus[] = ['Pending', 'Loaded', 'In Transit', 'Inbound', 'Delivered', 'Invoiced'];

export function resumeTarget(trip: Pick<Trip, 'holdFromStatus'>): TripStatus {
  const from = trip.holdFromStatus;
  if (from && from !== 'On Hold' && from !== 'Cancelled') return from;
  return 'Pending';
}

export function isStatusRetraction(from: TripStatus, to: TripStatus, holdFrom?: TripStatus): boolean {
  if (from === to) return false;
  if (to === 'On Hold' || to === 'Cancelled') return false;

  if (from === 'On Hold') {
    const origin = holdFrom && holdFrom !== 'On Hold' && holdFrom !== 'Cancelled' ? holdFrom : 'Pending';
    const originIdx = PIPELINE_STAGES.indexOf(origin);
    const toIdx = PIPELINE_STAGES.indexOf(to);
    if (toIdx < 0) return false;
    return toIdx < originIdx;
  }

  if (from === 'Cancelled') {
    return PIPELINE_STAGES.includes(to);
  }

  const fromIdx = PIPELINE_STAGES.indexOf(from);
  const toIdx = PIPELINE_STAGES.indexOf(to);
  if (fromIdx < 0 || toIdx < 0) return false;
  return toIdx < fromIdx;
}

export function hasSignedInk(dataUrl?: string): boolean {
  if (!dataUrl) return false;
  const value = dataUrl.trim();
  return value.startsWith('data:image') && value.length > 120;
}

export function missingSignaturesForStatus(trip: Trip, targetStatus: TripStatus): string | null {
  if (targetStatus === 'On Hold' || targetStatus === 'Cancelled' || targetStatus === 'Pending') {
    return null;
  }

  if (targetStatus === 'Loaded' && !hasSignedInk(trip.dispatcherSignoff?.signatureDataUrl)) {
    return 'The dispatcher must sign before this shipment can be marked Loaded.';
  }

  if (targetStatus === 'In Transit') {
    if (!hasSignedInk(trip.dispatcherSignoff?.signatureDataUrl)) {
      return 'The dispatcher must sign the yard release before this truck can go In Transit.';
    }
    if (!hasSignedInk(trip.driverSignoff?.signatureDataUrl)) {
      return 'The driver must sign that they received the sealed cargo before In Transit.';
    }
  }

  if (targetStatus === 'Inbound') {
    if (trip.status !== 'In Transit' && trip.status !== 'Inbound') {
      return 'Mark the truck In Transit first. The driver taps “I have arrived” at the warehouse to set Inbound.';
    }
  }

  if (targetStatus === 'Delivered' && !hasSignedInk(trip.pod?.signatureDataUrl)) {
    return 'The warehouse or consignee must sign proof of delivery before this trip can be marked Delivered. Driver must tap “I have arrived” (Inbound) first, then collect e-POD on the driver phone (or office stamps it on the web).';
  }

  if (targetStatus === 'Invoiced' && !hasSignedInk(trip.pod?.signatureDataUrl)) {
    return 'A signed proof of delivery is required before invoicing.';
  }

  return null;
}
