import { hasSignedInk } from './stageGates';
import type { Trip } from '../types';

export type DriverNextStep = {
  title: string;
  detail: string;
  done?: boolean;
};

export function driverNextStepForTrip(
  trip: Trip,
  eventKinds: Set<string>
): DriverNextStep {
  const status = trip.status || 'Pending';
  const driverSigned = hasSignedInk(trip.driverSignoff?.signatureDataUrl);
  const dispatcherSigned = hasSignedInk(trip.dispatcherSignoff?.signatureDataUrl);
  const podSigned = hasSignedInk(trip.pod?.signatureDataUrl);
  const pickupStamped = eventKinds.has('pickup_geo');
  const sealPhoto =
    eventKinds.has('seal_photo') || Boolean(trip.securitySealNumber?.trim());

  if (status === 'Delivered' || status === 'Invoiced' || podSigned) {
    return {
      title: 'Done — POD on file',
      detail: 'Delivery proof is saved. Office can invoice from here.',
      done: true,
    };
  }

  if (status === 'Inbound') {
    return {
      title: 'Waiting for warehouse e-POD',
      detail:
        'You marked arrival. Hand your phone (Driver app) to the warehouse officer for e-POD, or wait for office to stamp it on the web. Browser driver login cannot sign as warehouse.',
    };
  }

  if (status === 'In Transit' || (driverSigned && dispatcherSigned)) {
    return {
      title: 'Next: Tap I have arrived',
      detail:
        'When you reach the consignee gate, tap I have arrived. That sets Inbound so warehouse can sign e-POD on the Driver phone app.',
    };
  }

  if (driverSigned && !dispatcherSigned) {
    return {
      title: 'Waiting for dispatcher yard release',
      detail: 'Your cargo receipt is saved. Dispatch must sign on the web before In Transit.',
    };
  }

  if (status === 'Loaded') {
    return {
      title: 'Next: Sign received sealed cargo',
      detail: 'Sign that you received the sealed cargo. You can also open the official Delivery Note and gate pass above.',
    };
  }

  if (!pickupStamped) {
    return {
      title: 'Next: Stamp pickup GPS',
      detail: 'Record arrival at the pickup yard before documenting the cargo.',
    };
  }

  const hasOfficialDocs =
    Boolean(trip.deliveryNoteNumber?.trim()) && Boolean(trip.gatePassNumber?.trim());
  if (!sealPhoto && !hasOfficialDocs) {
    return {
      title: 'Next: Take the seal photo',
      detail:
        'Capture a clear photo of the security seal before signing — or wait for dispatch to post the seal / official DN and gate pass.',
    };
  }

  if (!dispatcherSigned) {
    return {
      title: 'Waiting for dispatcher yard release',
      detail: 'The dispatcher must sign before the trip can be marked Loaded / In Transit.',
    };
  }

  return {
    title: 'Next: Sign received sealed cargo',
    detail: 'Confirm you received the sealed cargo before departure.',
  };
}
