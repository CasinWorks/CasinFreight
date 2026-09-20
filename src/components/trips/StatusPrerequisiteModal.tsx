import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  ShieldCheck, 
  Truck, 
  User, 
  MapPin, 
  ArrowRight, 
  FileSignature, 
  Check, 
  Sparkles, 
  ExternalLink,
  Lock,
  Layers,
  Scale,
  Camera,
  ShieldAlert,
  UserCheck
} from 'lucide-react';
import { useFreight } from '../../context/FreightContext';
import { isPlaceholderSignatory } from '../../lib/podSignoff';
import { closeIfBackdrop } from '../../lib/modal';
import { Trip, TripStatus, Truck as TruckType, Driver, Client, POD, CustodySignoff } from '../../types';
import { hasSignedInk } from '../../lib/stageGates';
import { SignaturePad, SignaturePadHandle } from './SignaturePad';

interface StatusPrerequisiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  targetStatus: TripStatus;
  truck?: TruckType;
  driver?: Driver;
  client?: Client;
  onConfirmAdvance: (updates: Partial<Trip>, note?: string) => void;
  /** Persist yard-release fields/signatures without changing trip status (wait for the other signer). */
  onSaveWithoutAdvance?: (updates: Partial<Trip>, note?: string) => void;
  onOpenDeliveryNote?: () => void;
}

export const StatusPrerequisiteModal: React.FC<StatusPrerequisiteModalProps> = ({
  isOpen,
  onClose,
  trip,
  targetStatus,
  truck,
  driver,
  client,
  onConfirmAdvance,
  onSaveWithoutAdvance,
  onOpenDeliveryNote
}) => {
  const { currentUser, canManipulateTripStatus, uploadWorkspaceFile } = useFreight();
  const roleCheck = canManipulateTripStatus(targetStatus, trip.status);

  // Prerequisite form states
  const [securitySealNumber, setSecuritySealNumber] = useState(trip.securitySealNumber || '');
  const [deliveryNoteNumber, setDeliveryNoteNumber] = useState(trip.deliveryNoteNumber || '');
  const [gatePassNumber, setGatePassNumber] = useState(trip.gatePassNumber || '');
  const [weightVerified, setWeightVerified] = useState(Boolean(trip.prerequisites?.tareWeightVerified));

  // POD details (for Delivered / Invoiced target)
  const [receiverName, setReceiverName] = useState(
    isPlaceholderSignatory(trip.pod?.receiverName) ? '' : (trip.pod?.receiverName || '')
  );
  const [receiverRole, setReceiverRole] = useState(
    isPlaceholderSignatory(trip.pod?.receiverRole) ? '' : (trip.pod?.receiverRole || '')
  );
  const [receiverIdNumber, setReceiverIdNumber] = useState(
    trip.pod?.receiverIdNumber || ''
  );
  const [conditionStatus, setConditionStatus] = useState<'Good Condition' | 'Partial Damage' | 'Packaging Discrepancy'>(
    trip.pod?.conditionStatus || 'Good Condition'
  );
  const [podNotes, setPodNotes] = useState(
    trip.pod?.notes || 'Goods verified intact. Seals inspected and matching delivery note manifest.'
  );

  const dispatcherPadRef = useRef<SignaturePadHandle>(null);
  const driverPadRef = useRef<SignaturePadHandle>(null);
  const consigneePadRef = useRef<SignaturePadHandle>(null);
  const [podPhotos, setPodPhotos] = useState<string[]>(trip.pod?.photoUrls || []);
  const [isUploadingPodPhoto, setIsUploadingPodPhoto] = useState(false);
  const podFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSecuritySealNumber(trip.securitySealNumber || '');
      setDeliveryNoteNumber(trip.deliveryNoteNumber || '');
      setGatePassNumber(trip.gatePassNumber || '');
      setWeightVerified(Boolean(trip.prerequisites?.tareWeightVerified));
    }
  }, [isOpen, trip]);

  if (!isOpen) return null;

  const dispatcherName = currentUser.name?.trim() || currentUser.email || 'Dispatcher';
  const driverName = driver?.name?.trim() || '';

  const makeSignoff = (name: string, role: string | undefined, signatureDataUrl: string): CustodySignoff => ({
    name,
    role,
    signedAt: new Date().toISOString(),
    signatureDataUrl,
  });

  const baseYardUpdates = (): Partial<Trip> => ({
    securitySealNumber,
    deliveryNoteNumber,
    gatePassNumber,
    prerequisites: {
      ...trip.prerequisites,
      securitySealNumber,
      deliveryNoteNumber,
      gatePassNumber,
      tareWeightVerified: weightVerified,
      podReceiverName: receiverName,
      podReceiverRole: receiverRole,
      podReceiverIdNumber: receiverIdNumber,
      podCondition: conditionStatus,
    },
  });

  const resolveDispatcherSignoff = (): CustodySignoff | null => {
    const dispatcherSig = dispatcherPadRef.current?.read(trip.dispatcherSignoff?.signatureDataUrl);
    if (!dispatcherSig) return null;
    return trip.dispatcherSignoff?.signatureDataUrl === dispatcherSig
      ? trip.dispatcherSignoff
      : makeSignoff(dispatcherName, currentUser.role, dispatcherSig);
  };

  const resolveDriverSignoff = (): CustodySignoff | null => {
    const driverSig = driverPadRef.current?.read(trip.driverSignoff?.signatureDataUrl);
    if (!driverSig) return null;
    return trip.driverSignoff?.signatureDataUrl === driverSig
      ? trip.driverSignoff
      : makeSignoff(driverName, 'Driver', driverSig);
  };

  /** Save dispatcher yard release (and optional driver ink) without moving to In Transit. */
  const handleSaveYardReleaseOnly = () => {
    if (!onSaveWithoutAdvance) return;
    if (!securitySealNumber.trim()) {
      window.alert('Enter the real seal number before saving the yard release.');
      return;
    }
    const dispatcherSignoff = resolveDispatcherSignoff();
    if (!dispatcherSignoff) {
      window.alert('Sign the dispatcher release pad first. The trip will stay on its current status until the driver also signs.');
      return;
    }

    const updates = baseYardUpdates();
    updates.dispatcherSignoff = dispatcherSignoff;
    const driverSignoff = resolveDriverSignoff();
    if (driverSignoff) {
      updates.driverSignoff = driverSignoff;
    }

    const waitingForDriver = !hasSignedInk(driverSignoff?.signatureDataUrl || trip.driverSignoff?.signatureDataUrl);
    const logNote = waitingForDriver
      ? `Dispatcher yard release saved by ${dispatcherName}. Waiting for driver signature before In Transit. Seal #${securitySealNumber}.`
      : `Yard release signatures saved by ${dispatcherName}. Ready to advance to In Transit when you confirm.`;

    onSaveWithoutAdvance(updates, logNote);
    onClose();
  };

  const handleConfirm = () => {
    const updates = baseYardUpdates();

    let logNote = `Prerequisites validated for ${targetStatus}.`;

    if (targetStatus === 'Loaded') {
      if (!securitySealNumber.trim()) {
        window.alert('Enter the real container or truck seal number before marking this Loaded.');
        return;
      }
      if (!weightVerified) {
        window.alert('Tick weighbridge / cargo verified before the dispatcher signs this out.');
        return;
      }
      const dispatcherSignoff = resolveDispatcherSignoff();
      if (!dispatcherSignoff) {
        window.alert('The dispatcher must sign the release pad before cargo can be marked Loaded.');
        return;
      }
      updates.dispatcherSignoff = dispatcherSignoff;
      logNote = `Cargo loaded and released by ${dispatcherName}. Seal #${securitySealNumber}.`;
    } else if (targetStatus === 'In Transit') {
      if (!securitySealNumber.trim()) {
        window.alert('Enter the real seal number before dispatch.');
        return;
      }
      if (!deliveryNoteNumber.trim() || !gatePassNumber.trim()) {
        window.alert('Enter the delivery note number and gate pass before dispatch.');
        return;
      }
      if (!driverName) {
        window.alert('Assign a driver before releasing this shipment for hauling.');
        return;
      }
      const dispatcherSignoff = resolveDispatcherSignoff();
      if (!dispatcherSignoff) {
        window.alert('The dispatcher must sign the release pad before this cargo can go In Transit. Or tap Save yard release and wait for the driver.');
        return;
      }
      const driverSignoff = resolveDriverSignoff();
      if (!driverSignoff) {
        window.alert('Driver has not signed yet. Tap Save yard release to keep the trip on Loaded, or have the driver sign on the Driver app / this pad.');
        return;
      }
      updates.dispatcherSignoff = dispatcherSignoff;
      updates.driverSignoff = driverSignoff;
      logNote = `Released by ${dispatcherName} and received for hauling by ${driverName}. DN #${deliveryNoteNumber}, Gate Pass #${gatePassNumber}.`;
    } else if (targetStatus === 'Inbound') {
      if (trip.status !== 'In Transit' && trip.status !== 'Inbound') {
        window.alert('Set the trip to In Transit first. Drivers tap “I have arrived” on the phone to mark Inbound at the warehouse.');
        return;
      }
      logNote = 'Truck arrived at consignee / warehouse (Inbound). Driver can now collect warehouse e-POD on the phone.';
    } else if (targetStatus === 'Delivered') {
      const isDriverLogin = String(currentUser.role || '').toLowerCase() === 'driver';
      if (isDriverLogin) {
        window.alert('Drivers cannot stamp warehouse e-POD. Sign your cargo receipt in Driver mode, then after Inbound hand the Driver phone app to the warehouse officer — or have office stamp e-POD on the web.');
        return;
      }
      if (trip.status !== 'Inbound' && trip.status !== 'Delivered') {
        window.alert('Mark the trip Inbound first (driver taps “I have arrived” at the gate), then capture warehouse e-POD.');
        return;
      }
      if (isPlaceholderSignatory(receiverName)) {
        window.alert('Enter the consignee’s real full name.');
        return;
      }
      const sigDataUrl = consigneePadRef.current?.read(trip.pod?.signatureDataUrl);
      if (!sigDataUrl) {
        window.alert('The receiving officer must sign the pad before this trip can be marked delivered.');
        return;
      }

      const pod: POD = {
        id: trip.pod?.id || `pod-${Date.now()}`,
        tripId: trip.id,
        receiverName: receiverName.trim(),
        receiverRole: receiverRole.trim() || 'Consignee receiving officer',
        receiverIdNumber: receiverIdNumber.trim() || undefined,
        notes: podNotes,
        conditionStatus,
        signedAt: trip.pod?.signedAt || new Date().toISOString(),
        signatureDataUrl: sigDataUrl,
        photoUrls: podPhotos,
      };

      updates.pod = pod;
      logNote = `POD signed by ${pod.receiverName} (${pod.receiverRole}) - ${conditionStatus}. Delivery Note #${deliveryNoteNumber} fulfilled.`;
    } else if (targetStatus === 'Invoiced') {
      if (!trip.pod?.signatureDataUrl) {
        window.alert('This trip has no signed POD yet. Mark it Delivered and capture the consignee signature first.');
        return;
      }
      logNote = `Billing audit passed. Invoice generated against signed DN #${trip.deliveryNoteNumber || deliveryNoteNumber} and POD by ${trip.pod.receiverName}.`;
    }

    onConfirmAdvance(updates, logNote);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-stretch sm:items-center justify-center p-0 sm:p-3 md:p-6 overflow-y-auto" onClick={closeIfBackdrop(onClose)}>
      <div className="bg-white border-0 sm:border border-slate-200 rounded-none sm:rounded-2xl w-full max-w-2xl h-[100dvh] sm:h-auto sm:max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-slate-900">
        
        {/* Header */}
        <div className="p-4 md:px-6 bg-slate-50 border-b border-slate-200 flex items-start justify-between gap-3 pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center font-bold shadow-2xs">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base sm:text-sm flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
                Sign & clear this stage
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border w-fit ${
                  targetStatus === 'Loaded' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                  targetStatus === 'In Transit' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  targetStatus === 'Inbound' ? 'bg-cyan-50 text-cyan-800 border-cyan-200' :
                  targetStatus === 'Delivered' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                  'bg-purple-50 text-purple-700 border-purple-200'
                }`}>
                  Advancing to: {targetStatus}
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                {targetStatus === 'Invoiced'
                  ? 'Signatures are already captured. This step only creates the invoice.'
                  : targetStatus === 'In Transit'
                    ? 'Dispatcher can save the yard release now. In Transit only unlocks after the driver also signs (web pad or Driver app).'
                    : targetStatus === 'Inbound'
                      ? 'Confirm the truck is at the warehouse gate. The driver can then collect e-POD on the phone.'
                    : 'Collect the signatures and documents required for this stage.'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 sm:w-8 sm:h-8 rounded-lg border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 md:p-6 overflow-y-auto space-y-5 flex-1 text-sm sm:text-xs">
          
          {/* Role Permission Banner */}
          {!roleCheck.allowed ? (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 flex items-start gap-3 text-rose-900">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-xs flex items-center gap-2">
                  <span>Restricted Action for Current Role ({currentUser.role})</span>
                </div>
                <p className="text-[11px] text-rose-700 mt-0.5 leading-relaxed">
                  {roleCheck.reason || `Your active role (${currentUser.role}) is not authorized to transition shipments to ${targetStatus}.`}
                </p>
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-rose-200/60">
                  <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">Authorized Roles:</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {roleCheck.allowedRoles.map(r => (
                      <span
                        key={r}
                        className="px-2 py-0.5 rounded bg-white text-rose-800 border border-rose-300 font-semibold text-[10px]"
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2 flex items-center justify-between text-emerald-900">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-semibold">
                  Authorized Operator: <span className="font-bold">{currentUser.name?.trim() || currentUser.email || 'Signed-in user'}</span> ({currentUser.role})
                </span>
              </div>
              <span className="text-[10px] bg-emerald-100/80 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                Role Cleared
              </span>
            </div>
          )}

          {/* Shipment Summary Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-bold text-slate-900 text-xs flex items-center gap-2">
                <span>{trip.waybillNumber}</span>
                <span className="text-slate-400">•</span>
                <span className="font-mono text-slate-600">Trip #{trip.tripNumber}</span>
              </div>
              <div className="text-[11px] text-slate-600 flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-3 h-3 text-blue-500" />
                <span>{trip.originZone}</span>
                <ArrowRight className="w-3 h-3 text-slate-400" />
                <span>{trip.destinationZone}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-right">
              <div>
                <div className="font-mono font-bold text-slate-800">
                  🚛 {truck ? truck.plateNumber : 'Plate Pending'}
                </div>
                <div className="text-[10px] text-slate-500">
                  👤 {driver ? driver.name : 'Driver Assigned'}
                </div>
              </div>
            </div>
          </div>

          {/* Target: LOADED Prerequisites */}
          {(targetStatus === 'Loaded' || targetStatus === 'In Transit') && (
            <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">
                    1
                  </div>
                  <span>Loading & Yard Verification</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Driver & Vehicle Assigned
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Container / Truck Security Seal Number *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={securitySealNumber}
                      onChange={(e) => setSecuritySealNumber(e.target.value)}
                      placeholder="e.g. SEAL-PH-882941"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl sm:rounded-lg px-3 py-3 sm:py-1.5 text-base sm:text-xs min-h-12 sm:min-h-0 font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-3 text-sm sm:text-xs font-semibold text-slate-700 bg-slate-50 p-3 sm:p-2 rounded-xl sm:rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors min-h-12 sm:min-h-0">
                    <input
                      type="checkbox"
                      checked={weightVerified}
                      onChange={(e) => setWeightVerified(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-5 h-5 sm:w-4 sm:h-4"
                    />
                    <span>Weighbridge tare & cargo verified ({(trip.cargoWeightKg / 1000).toFixed(2)} MT)</span>
                  </label>
                </div>
              </div>

              {(targetStatus === 'Loaded' || targetStatus === 'In Transit') && (
                <SignaturePad
                  ref={dispatcherPadRef}
                  label={`Dispatcher release signature * — ${dispatcherName}`}
                  hint="Sign to confirm cargo is sealed, weighed, and released from the origin yard."
                  existingUrl={trip.dispatcherSignoff?.signatureDataUrl}
                />
              )}
            </div>
          )}

          {/* Target: IN TRANSIT Prerequisites (Delivery Note & Gate Pass) */}
          {targetStatus === 'In Transit' && (
            <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[10px] font-bold">
                    2
                  </div>
                  <span>Delivery Note & Gate Clearance Manifest</span>
                </div>
                
                {onOpenDeliveryNote && (
                  <button
                    type="button"
                    onClick={onOpenDeliveryNote}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>View Official Delivery Note</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Official Delivery Note # (DN / Delivery Receipt) *
                  </label>
                  <input
                    type="text"
                    value={deliveryNoteNumber}
                    onChange={(e) => setDeliveryNoteNumber(e.target.value)}
                    placeholder="e.g. DN-2026-0811"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl sm:rounded-lg px-3 py-3 sm:py-1.5 text-base sm:text-xs min-h-12 sm:min-h-0 font-mono font-bold text-blue-700 focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Origin Facility Gate Pass / Release Order # *
                  </label>
                  <input
                    type="text"
                    value={gatePassNumber}
                    onChange={(e) => setGatePassNumber(e.target.value)}
                    placeholder="e.g. GP-TAG-9402"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl sm:rounded-lg px-3 py-3 sm:py-1.5 text-base sm:text-xs min-h-12 sm:min-h-0 font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {targetStatus === 'In Transit' && (
                <>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-700 space-y-1">
                    <div className="font-bold text-slate-800">Yard release progress</div>
                    <div className="flex flex-wrap gap-2">
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${
                        hasSignedInk(trip.dispatcherSignoff?.signatureDataUrl)
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}>
                        Dispatcher {hasSignedInk(trip.dispatcherSignoff?.signatureDataUrl) ? 'signed' : 'waiting'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${
                        hasSignedInk(trip.driverSignoff?.signatureDataUrl)
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}>
                        Driver {hasSignedInk(trip.driverSignoff?.signatureDataUrl) ? 'signed' : 'waiting'}
                      </span>
                    </div>
                    {!hasSignedInk(trip.driverSignoff?.signatureDataUrl) && (
                      <p className="text-slate-600 leading-relaxed">
                        You can save the dispatcher signature now. The trip stays Loaded until the driver signs here or on the CasinFreight Driver app.
                      </p>
                    )}
                  </div>
                  <SignaturePad
                    ref={driverPadRef}
                    label={`Driver hauling signature * — ${driverName || 'No driver assigned'}`}
                    hint={driver?.licenseNo
                      ? `Hand the phone or tablet to ${driverName} (Lic: ${driver.licenseNo}), or wait for their Driver app signature.`
                      : 'Assign a driver, then have them sign here or on the Driver app.'}
                    existingUrl={trip.driverSignoff?.signatureDataUrl}
                  />
                </>
              )}
            </div>
          )}

          {/* Target: DELIVERED Prerequisites (POD & Receiving Sign-off) */}
          {targetStatus === 'Delivered' && (
            <div className="border border-emerald-200 rounded-xl p-4 bg-emerald-50/30 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold">
                    3
                  </div>
                  <span>Electronic Proof of Delivery (e-POD) & Receiver Sign-off</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  Consignee Receipt
                </span>
              </div>

              {String(currentUser.role || '').toLowerCase() === 'driver' ? (
                <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-700 leading-relaxed">
                  <strong className="text-slate-900">Drivers do not capture this signature.</strong>
                  {' '}Consignee / warehouse e-POD is collected on the Driver phone after Inbound (hand the phone to the warehouse officer), or stamped here by office staff.
                </div>
              ) : (
              <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Receiver Full Name *
                  </label>
                  <input
                    type="text"
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    placeholder="e.g. Maria Santos"
                    autoComplete="name"
                    className="w-full bg-white border border-slate-200 rounded-xl sm:rounded-lg px-3 py-3 sm:py-1.5 text-base sm:text-xs min-h-12 sm:min-h-0 font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Designation / Role
                  </label>
                  <input
                    type="text"
                    value={receiverRole}
                    onChange={(e) => setReceiverRole(e.target.value)}
                    placeholder="e.g. Warehouse Supervisor"
                    className="w-full bg-white border border-slate-200 rounded-xl sm:rounded-lg px-3 py-3 sm:py-1.5 text-base sm:text-xs min-h-12 sm:min-h-0 text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Receiving Inspection Condition
                  </label>
                  <select
                    value={conditionStatus}
                    onChange={(e) => setConditionStatus(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 rounded-xl sm:rounded-lg px-3 py-3 sm:py-1.5 text-base sm:text-xs min-h-12 sm:min-h-0 font-semibold text-slate-900 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Good Condition">✓ Good Condition (Seals OK)</option>
                    <option value="Partial Damage">⚠️ Partial Damage Noted</option>
                    <option value="Packaging Discrepancy">📦 Packaging Discrepancy</option>
                  </select>
                </div>
              </div>

              <SignaturePad
                ref={consigneePadRef}
                label="Digital signature of receiving officer *"
                hint="Hand the phone to the warehouse receiver. Tap Sign full screen so they can sign with a finger."
                existingUrl={trip.pod?.signatureDataUrl}
              />

              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                    <Camera className="w-4 h-4 text-emerald-600" />
                    Inspection photos
                  </label>
                  <button
                    type="button"
                    disabled={isUploadingPodPhoto}
                    onClick={() => podFileInputRef.current?.click()}
                    className="text-white sm:text-blue-600 bg-blue-600 sm:bg-transparent text-xs font-bold disabled:opacity-50 min-h-10 px-3 rounded-lg sm:min-h-0 sm:px-0 sm:rounded-none"
                  >
                    {isUploadingPodPhoto ? 'Uploading…' : 'Take / add photo'}
                  </button>
                  <input
                    ref={podFileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      event.target.value = '';
                      if (!file) return;
                      setIsUploadingPodPhoto(true);
                      try {
                        const uploaded = await uploadWorkspaceFile(`pods/${trip.id}`, file);
                        setPodPhotos((prev) => [...prev, uploaded.url]);
                      } catch (error) {
                        window.alert(error instanceof Error ? error.message : 'Could not upload the photo.');
                      } finally {
                        setIsUploadingPodPhoto(false);
                      }
                    }}
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  {podPhotos.map((url) => (
                    <img key={url} src={url} alt="POD" className="w-16 h-12 object-cover rounded border border-slate-200" />
                  ))}
                </div>
              </div>
              </>
              )}
            </div>
          )}

          {/* Target: INVOICED Prerequisites */}
          {targetStatus === 'Invoiced' && (
            <div className="border border-purple-200 rounded-xl p-4 bg-purple-50/40 space-y-3 shadow-2xs">
              <div className="flex items-center gap-2 font-bold text-purple-950">
                <div className="w-5 h-5 rounded-full bg-purple-200 text-purple-800 flex items-center justify-center text-[10px] font-bold">
                  1
                </div>
                <span>Billing Audit & Invoice Generation</span>
              </div>
              <p className="text-[11px] text-purple-900">
                Signatures are already on the delivery note. This step only generates the client invoice (12% VAT and approved accessorials).
              </p>
              {trip.pod?.signatureDataUrl ? (
                <div className="bg-white border border-purple-100 rounded-lg p-3 space-y-1.5">
                  <div className="text-[10px] font-bold uppercase text-slate-500">Signed POD on file</div>
                  <div className="font-bold text-slate-900">{trip.pod.receiverName}</div>
                  <div className="text-[11px] text-slate-500">{trip.pod.receiverRole} • {trip.pod.conditionStatus}</div>
                  <img src={trip.pod.signatureDataUrl} alt="POD signature" className="max-h-14 object-contain" />
                </div>
              ) : (
                <p className="text-[11px] text-rose-700 font-semibold">
                  No signed POD yet. Go back and mark the trip Delivered first.
                </p>
              )}
              {onOpenDeliveryNote && (
                <button
                  type="button"
                  onClick={onOpenDeliveryNote}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>View signed delivery note</span>
                </button>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            onClick={onClose}
            className="px-4 min-h-12 sm:min-h-0 py-3 sm:py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-sm sm:text-xs font-semibold text-slate-700 transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2 min-w-0">
            {!roleCheck.allowed ? (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-rose-600 font-semibold flex items-center gap-1 hidden sm:flex">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Requires {roleCheck.allowedRoles.join(' / ')} role</span>
                </span>
                <button
                  type="button"
                  disabled
                  className="flex items-center gap-2 px-5 min-h-12 sm:min-h-0 py-3 sm:py-2 rounded-xl bg-slate-300 text-slate-500 font-bold text-sm sm:text-xs cursor-not-allowed shadow-none"
                  title={roleCheck.reason}
                >
                  <Lock className="w-4 h-4 text-slate-400" />
                  <span>Unauthorized ({currentUser.role})</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap justify-end">
                {targetStatus === 'In Transit' && onSaveWithoutAdvance && (
                  <button
                    type="button"
                    onClick={handleSaveYardReleaseOnly}
                    className="flex items-center gap-2 px-4 min-h-12 sm:min-h-0 py-3 sm:py-2 rounded-xl border border-blue-200 bg-white hover:bg-blue-50 text-blue-800 font-bold text-sm sm:text-xs transition-all"
                  >
                    <FileSignature className="w-4 h-4" />
                    <span>Save yard release</span>
                  </button>
                )}
                <button
                  onClick={handleConfirm}
                  className="flex items-center gap-2 px-5 min-h-12 sm:min-h-0 py-3 sm:py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm sm:text-xs shadow-md transition-all active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{targetStatus === 'Invoiced' ? 'Generate invoice' : `Advance to ${targetStatus}`}</span>
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
