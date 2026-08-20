import { Trip, TripStatus } from '../types';

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

  if (targetStatus === 'Delivered' && !hasSignedInk(trip.pod?.signatureDataUrl)) {
    return 'The warehouse or consignee must sign proof of delivery before this trip can be marked Delivered.';
  }

  if (targetStatus === 'Invoiced' && !hasSignedInk(trip.pod?.signatureDataUrl)) {
    return 'A signed proof of delivery is required before invoicing.';
  }

  return null;
}
