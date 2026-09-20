import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  LogOut,
  MapPin,
  Navigation,
  Route,
  Truck,
} from 'lucide-react';
import { useFreight } from '../../context/FreightContext';
import { driverNextStepForTrip } from '../../lib/driverNextStep';
import { hasSignedInk } from '../../lib/stageGates';
import { Trip } from '../../types';
import { DeliveryNoteModal } from '../trips/DeliveryNoteModal';
import { SignaturePad, SignaturePadHandle } from '../trips/SignaturePad';

function StatusPill({ status }: { status: string }) {
  const color =
    status === 'Inbound'
      ? 'bg-cyan-50 text-cyan-800 border-cyan-200'
      : status === 'In Transit'
        ? 'bg-amber-50 text-amber-800 border-amber-200'
        : status === 'Loaded'
          ? 'bg-blue-50 text-blue-800 border-blue-200'
          : status === 'Delivered' || status === 'Invoiced'
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
            : 'bg-slate-100 text-slate-700 border-slate-200';
  return (
    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border shrink-0 ${color}`}>
      {status}
    </span>
  );
}

function GateRow({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2.5 text-sm text-slate-700 py-0.5">
      <CheckCircle2 className={`w-5 h-5 shrink-0 ${done ? 'text-emerald-600' : 'text-slate-300'}`} />
      <span className={done ? 'font-semibold text-slate-900' : ''}>{label}</span>
    </div>
  );
}

function DocRow({ label, value }: { label: string; value: string }) {
  const missing = !value || value === '—' || value.toLowerCase().includes('not issued');
  return (
    <div className="flex items-start justify-between gap-3 text-sm py-1">
      <span className="text-slate-500 shrink-0">{label}</span>
      <span className={`font-mono font-semibold text-right break-all ${missing ? 'text-amber-700' : 'text-slate-900'}`}>
        {value}
      </span>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3.5 text-left active:bg-slate-50"
      >
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          {icon}
          {title}
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {open && <div className="px-4 pb-4 space-y-2.5 border-t border-slate-100 pt-3">{children}</div>}
    </section>
  );
}

function shellClass(extra = '') {
  return `min-h-[100dvh] bg-slate-100 text-slate-900 flex flex-col font-sans antialiased ${extra}`;
}

function primaryBtn(extra = '') {
  return `w-full min-h-14 rounded-2xl text-base font-bold disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-transform touch-manipulation ${extra}`;
}

export const DriverFieldApp: React.FC = () => {
  const {
    currentUser,
    company,
    trips,
    trucks,
    drivers,
    clients,
    fieldEvents,
    assignedDriverRosterId,
    logout,
    uploadWorkspaceFile,
    saveAssignedDriverSignoff,
    markAssignedDriverArrived,
    saveAssignedDriverWarehousePod,
    addAssignedDriverFieldEvent,
  } = useFreight();

  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [dnOpen, setDnOpen] = useState(false);
  const [warehouseName, setWarehouseName] = useState('');
  const [warehouseRole, setWarehouseRole] = useState('Warehouse receiving officer');
  const driverPadRef = useRef<SignaturePadHandle>(null);
  const warehousePadRef = useRef<SignaturePadHandle>(null);
  const sealInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    document.documentElement.classList.add('driver-mobile-shell');
    return () => document.documentElement.classList.remove('driver-mobile-shell');
  }, []);

  const myTrips = useMemo(
    () =>
      trips
        .filter((t) => t.status !== 'Cancelled' && t.status !== 'Invoiced')
        .slice()
        .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))),
    [trips]
  );

  const selectedTrip = myTrips.find((t) => t.id === selectedTripId) || null;
  const tripEvents = useMemo(
    () => fieldEvents.filter((e) => e.tripId === selectedTripId),
    [fieldEvents, selectedTripId]
  );
  const eventKinds = useMemo(
    () => new Set(tripEvents.map((e) => e.kind)),
    [tripEvents]
  );

  const flash = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(null), 4500);
  };

  const run = async (action: () => Promise<void>, okMessage: string) => {
    setBusy(true);
    try {
      await action();
      flash(okMessage);
    } catch (error) {
      flash(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  if (!assignedDriverRosterId) {
    return (
      <div
        className={shellClass()}
        style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <header className="bg-white border-b border-slate-200 px-4 py-4 flex items-center justify-between">
          <div>
            <div className="text-base font-extrabold">CasinFreight Driver</div>
            <div className="text-xs text-slate-500">{currentUser.name || currentUser.email}</div>
          </div>
          <button
            type="button"
            onClick={() => logout()}
            className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl text-slate-500 active:bg-slate-100"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </header>
        <div className="m-4 rounded-2xl p-4 text-sm text-amber-900 bg-amber-50 border border-amber-200 leading-relaxed">
          Your login works, but Driver Roster has no matching email. Ask dispatch to save your email on your driver
          record.
        </div>
      </div>
    );
  }

  if (selectedTrip) {
    return (
      <>
        <DriverTripDetail
          trip={selectedTrip}
          eventKinds={eventKinds}
          busy={busy}
          message={message}
          warehouseName={warehouseName}
          warehouseRole={warehouseRole}
          setWarehouseName={setWarehouseName}
          setWarehouseRole={setWarehouseRole}
          driverPadRef={driverPadRef}
          warehousePadRef={warehousePadRef}
          sealInputRef={sealInputRef}
          onBack={() => setSelectedTripId(null)}
          onLogout={() => logout()}
          onOpenDeliveryNote={() => setDnOpen(true)}
          onStampPickup={() =>
            run(
              () =>
                addAssignedDriverFieldEvent({
                  tripId: selectedTrip.id,
                  kind: 'pickup_geo',
                  note: 'Pickup GPS stamped (browser)',
                }).then(() => undefined),
              'Pickup GPS saved.'
            )
          }
          onSealPhoto={async (file) => {
            await run(async () => {
              const uploaded = await uploadWorkspaceFile('field-photos', file);
              await addAssignedDriverFieldEvent({
                tripId: selectedTrip.id,
                kind: 'seal_photo',
                photoUrl: uploaded.url,
                note: 'Seal photo (browser)',
              });
            }, 'Seal photo sent to the office.');
          }}
          onSaveDriverSign={() =>
            run(async () => {
              const ink = driverPadRef.current?.read(selectedTrip.driverSignoff?.signatureDataUrl);
              if (!ink) {
                throw new Error(
                  'Sign on the pad first — tap “Sign full screen”, sign with your finger, then “Use this signature”.'
                );
              }
              await saveAssignedDriverSignoff(selectedTrip.id, ink);
            }, 'Cargo receipt signed.')
          }
          onStampDelivery={() =>
            run(
              () =>
                addAssignedDriverFieldEvent({
                  tripId: selectedTrip.id,
                  kind: 'delivery_geo',
                  note: 'Delivery GPS stamped (browser)',
                }).then(() => undefined),
              'Delivery GPS saved. Tap I have arrived to set Inbound.'
            )
          }
          onArrived={() =>
            run(
              () => markAssignedDriverArrived(selectedTrip.id),
              'Inbound set. Hand this screen to the warehouse officer for e-POD.'
            )
          }
          onSaveWarehousePod={() =>
            run(async () => {
              const ink = warehousePadRef.current?.read(selectedTrip.pod?.signatureDataUrl);
              if (!ink) {
                throw new Error(
                  'Warehouse must sign first — tap “Sign full screen”, then “Use this signature”.'
                );
              }
              await saveAssignedDriverWarehousePod({
                tripId: selectedTrip.id,
                signatureDataUrl: ink,
                receiverName: warehouseName,
                receiverRole: warehouseRole,
              });
            }, 'Warehouse e-POD saved. Trip is Delivered.')
          }
        />
        <DeliveryNoteModal
          isOpen={dnOpen}
          onClose={() => setDnOpen(false)}
          trip={selectedTrip}
          truck={trucks.find((t) => t.id === selectedTrip.truckId)}
          driver={drivers.find((d) => d.id === selectedTrip.driverId)}
          helper={drivers.find((d) => d.id === selectedTrip.helperId)}
          client={clients.find((c) => c.id === selectedTrip.clientId)}
          company={company}
        />
      </>
    );
  }

  return (
    <div
      className={shellClass('max-w-lg mx-auto w-full')}
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <header className="bg-white/95 backdrop-blur border-b border-slate-200 px-4 py-3.5 flex items-center justify-between sticky top-0 z-20">
        <div className="min-w-0">
          <div className="text-lg font-extrabold tracking-tight">My trips</div>
          <div className="text-xs text-slate-500 truncate">
            {currentUser.name || currentUser.email} · Driver
          </div>
        </div>
        <button
          type="button"
          onClick={() => logout()}
          className="inline-flex items-center gap-2 min-h-11 px-3 rounded-xl text-sm font-semibold text-slate-600 active:bg-slate-100 touch-manipulation"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </header>

      {message && (
        <div className="mx-4 mt-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          {message}
        </div>
      )}

      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 space-y-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {myTrips.length === 0 ? (
          <div className="text-center text-base text-slate-500 py-20">No assigned trips yet.</div>
        ) : (
          myTrips.map((trip) => (
            <button
              key={trip.id}
              type="button"
              onClick={() => setSelectedTripId(trip.id)}
              className="w-full text-left bg-white border border-slate-200 rounded-2xl p-4 active:scale-[0.99] active:border-slate-300 transition-transform touch-manipulation shadow-xs"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="font-extrabold text-base text-slate-900 leading-tight">
                  {trip.tripNumber || trip.id}
                </div>
                <StatusPill status={trip.status} />
              </div>
              <div className="mt-2.5 flex items-start gap-2 text-sm text-slate-700">
                <Route className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span className="leading-snug">
                  {trip.originZone} → {trip.destinationZone}
                </span>
              </div>
              {(trip.deliveryNoteNumber || trip.gatePassNumber) && (
                <div className="mt-2 text-xs text-slate-500 font-mono">
                  {trip.deliveryNoteNumber ? `DN ${trip.deliveryNoteNumber}` : null}
                  {trip.deliveryNoteNumber && trip.gatePassNumber ? ' · ' : null}
                  {trip.gatePassNumber ? `GP ${trip.gatePassNumber}` : null}
                </div>
              )}
              <div className="mt-3 text-sm font-bold text-blue-700">Open trip →</div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

function DriverTripDetail({
  trip,
  eventKinds,
  busy,
  message,
  warehouseName,
  warehouseRole,
  setWarehouseName,
  setWarehouseRole,
  driverPadRef,
  warehousePadRef,
  sealInputRef,
  onBack,
  onLogout,
  onOpenDeliveryNote,
  onStampPickup,
  onSealPhoto,
  onSaveDriverSign,
  onStampDelivery,
  onArrived,
  onSaveWarehousePod,
}: {
  trip: Trip;
  eventKinds: Set<string>;
  busy: boolean;
  message: string | null;
  warehouseName: string;
  warehouseRole: string;
  setWarehouseName: (value: string) => void;
  setWarehouseRole: (value: string) => void;
  driverPadRef: React.RefObject<SignaturePadHandle | null>;
  warehousePadRef: React.RefObject<SignaturePadHandle | null>;
  sealInputRef: React.RefObject<HTMLInputElement | null>;
  onBack: () => void;
  onLogout: () => void;
  onOpenDeliveryNote: () => void;
  onStampPickup: () => void;
  onSealPhoto: (file: File) => void;
  onSaveDriverSign: () => void;
  onStampDelivery: () => void;
  onArrived: () => void;
  onSaveWarehousePod: () => void;
}) {
  const { trucks } = useFreight();
  const actionRef = useRef<HTMLDivElement | null>(null);
  const next = driverNextStepForTrip(trip, eventKinds);
  const driverSigned = hasSignedInk(trip.driverSignoff?.signatureDataUrl);
  const dispatcherSigned = hasSignedInk(trip.dispatcherSignoff?.signatureDataUrl);
  const podSigned = hasSignedInk(trip.pod?.signatureDataUrl);
  const pickupStamped = eventKinds.has('pickup_geo');
  const hasSealNumber = Boolean(trip.securitySealNumber?.trim());
  const hasOfficialDocs =
    Boolean(trip.deliveryNoteNumber?.trim()) && Boolean(trip.gatePassNumber?.trim());
  const sealPhoto = eventKinds.has('seal_photo') || hasSealNumber;
  const deliveryStamped = eventKinds.has('delivery_geo');
  const canMoveCargo = driverSigned && dispatcherSigned;
  const sealedEnough =
    sealPhoto ||
    hasOfficialDocs ||
    trip.status === 'Loaded' ||
    trip.status === 'In Transit' ||
    trip.status === 'Inbound';
  const canSignDispatch = !driverSigned;
  const truck = trucks.find((t) => t.id === trip.truckId);
  const dnLabel = trip.deliveryNoteNumber?.trim() || 'Not issued yet';
  const gpLabel = trip.gatePassNumber?.trim() || 'Not issued yet';
  const sealLabel = trip.securitySealNumber?.trim() || 'Not posted yet';
  const plateLabel = truck?.plateNumber || trip.truckId || '—';

  const stickyAction = (() => {
    if (next.done) return null;
    if (!pickupStamped) {
      return {
        label: 'Stamp pickup GPS',
        onClick: onStampPickup,
        className: 'bg-slate-900 text-white',
        disabled: busy,
      };
    }
    if (!driverSigned && !sealPhoto && !hasOfficialDocs && trip.status === 'Pending') {
      return {
        label: 'Take seal photo',
        onClick: () => sealInputRef.current?.click(),
        className: 'bg-slate-900 text-white',
        disabled: busy,
      };
    }
    if (!driverSigned) {
      return {
        label: 'Save my cargo signature',
        onClick: onSaveDriverSign,
        className: 'bg-blue-600 text-white',
        disabled: busy || !canSignDispatch,
      };
    }
    if (trip.status === 'In Transit') {
      return {
        label: 'I have arrived (Inbound)',
        onClick: onArrived,
        className: 'bg-cyan-700 text-white',
        disabled: busy || !canMoveCargo,
      };
    }
    if (trip.status === 'Inbound' && !podSigned) {
      return {
        label: 'Save warehouse e-POD',
        onClick: onSaveWarehousePod,
        className: 'bg-teal-700 text-white',
        disabled: busy,
      };
    }
    return null;
  })();

  useEffect(() => {
    if (!stickyAction) return;
    const t = window.setTimeout(() => {
      actionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 250);
    return () => window.clearTimeout(t);
  }, [trip.status, driverSigned, pickupStamped, podSigned]);

  return (
    <div
      className={shellClass('max-w-lg mx-auto w-full')}
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <header className="bg-white/95 backdrop-blur border-b border-slate-200 px-2 py-2.5 flex items-center gap-1 sticky top-0 z-20">
        <button
          type="button"
          onClick={onBack}
          className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl text-slate-700 active:bg-slate-100 touch-manipulation"
          aria-label="Back to trips"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="text-base font-extrabold truncate leading-tight">{trip.tripNumber || trip.id}</div>
          <div className="text-xs text-slate-500 truncate">
            {trip.originZone} → {trip.destinationZone}
          </div>
        </div>
        <StatusPill status={trip.status} />
        <button
          type="button"
          onClick={onLogout}
          className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl text-slate-500 active:bg-slate-100 touch-manipulation"
          aria-label="Sign out"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      <div
        className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 space-y-3"
        style={{ paddingBottom: stickyAction ? 'calc(5.5rem + env(safe-area-inset-bottom))' : 'max(1.25rem, env(safe-area-inset-bottom))' }}
      >
        {message && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 font-medium">
            {message}
          </div>
        )}

        <div
          className={`rounded-2xl border p-4 ${
            next.done ? 'border-emerald-200 bg-emerald-50' : 'border-blue-200 bg-blue-50'
          }`}
        >
          <div className={`text-base font-extrabold leading-snug ${next.done ? 'text-emerald-800' : 'text-blue-800'}`}>
            {next.title}
          </div>
          <p className="text-sm text-slate-700 mt-1.5 leading-relaxed">{next.detail}</p>
        </div>

        <div ref={actionRef} className="space-y-3">
          {!pickupStamped && (
            <section className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> Now
              </div>
              <button type="button" disabled={busy} onClick={onStampPickup} className={primaryBtn('bg-slate-900 text-white')}>
                Stamp pickup GPS
              </button>
            </section>
          )}

          {!driverSigned && (
            <section className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5" /> Your cargo signature
              </div>
              <input
                ref={sealInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onSealPhoto(file);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => sealInputRef.current?.click()}
                className={primaryBtn('border border-slate-200 bg-white text-slate-900')}
              >
                <span className="inline-flex items-center justify-center gap-2">
                  <Camera className="w-5 h-5" />
                  {sealPhoto ? 'Seal photo ✓ / retake' : 'Seal photo *'}
                </span>
              </button>
              <SignaturePad
                ref={driverPadRef}
                label="Sign that you received sealed cargo *"
                hint="Tap Sign full screen — easiest with your finger."
                existingUrl={trip.driverSignoff?.signatureDataUrl}
              />
              <button
                type="button"
                disabled={busy || !canSignDispatch}
                onClick={onSaveDriverSign}
                className={primaryBtn('bg-blue-600 text-white')}
              >
                Save my cargo signature
              </button>
              {!sealedEnough && (
                <p className="text-sm text-amber-700">
                  Take a seal photo first, or wait for dispatch to post the seal / DN and gate pass.
                </p>
              )}
            </section>
          )}

          {driverSigned && trip.status === 'In Transit' && (
            <section className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-cyan-700 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> At the gate
              </div>
              <button
                type="button"
                disabled={busy || !canMoveCargo}
                onClick={onArrived}
                className={primaryBtn('bg-cyan-700 text-white')}
              >
                I have arrived (Inbound)
              </button>
              <button
                type="button"
                disabled={busy || !canMoveCargo || deliveryStamped}
                onClick={onStampDelivery}
                className={primaryBtn(
                  deliveryStamped
                    ? 'bg-slate-200 text-slate-500'
                    : 'bg-white text-slate-800 border border-slate-200'
                )}
              >
                {deliveryStamped ? 'Delivery GPS stamped ✓' : 'Stamp delivery GPS only'}
              </button>
            </section>
          )}

          {trip.status === 'Inbound' && !podSigned && (
            <section className="rounded-2xl border border-teal-200 bg-teal-50/80 p-4 space-y-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-teal-800 flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5" /> Warehouse e-POD
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">
                Hand this phone to the warehouse officer. They sign, then type name and role.
              </p>
              <label className="block text-xs font-bold text-slate-500 uppercase">
                Full name *
                <input
                  type="text"
                  value={warehouseName}
                  onChange={(e) => setWarehouseName(e.target.value)}
                  placeholder="e.g. Juan Dela Cruz"
                  autoComplete="name"
                  enterKeyHint="next"
                  className="mt-1.5 w-full min-h-14 rounded-2xl border border-slate-200 bg-white px-4 text-base font-semibold text-slate-900 normal-case"
                />
              </label>
              <label className="block text-xs font-bold text-slate-500 uppercase">
                Role / title *
                <input
                  type="text"
                  value={warehouseRole}
                  onChange={(e) => setWarehouseRole(e.target.value)}
                  placeholder="Warehouse receiving officer"
                  className="mt-1.5 w-full min-h-14 rounded-2xl border border-slate-200 bg-white px-4 text-base font-semibold text-slate-900 normal-case"
                />
              </label>
              <SignaturePad
                ref={warehousePadRef}
                label="Warehouse signature *"
                hint="Tap Sign full screen for a finger signature."
                existingUrl={trip.pod?.signatureDataUrl}
              />
              <button
                type="button"
                disabled={busy}
                onClick={onSaveWarehousePod}
                className={primaryBtn('bg-teal-700 text-white')}
              >
                Save warehouse e-POD
              </button>
            </section>
          )}

          {podSigned && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 font-semibold">
              Proof of delivery signed ✓ — {trip.pod?.receiverName}
              {trip.pod?.receiverRole ? ` · ${trip.pod.receiverRole}` : ''}
            </div>
          )}
        </div>

        <Section title="Vehicle & documents" icon={<FileText className="w-3.5 h-3.5" />} defaultOpen={false}>
          <DocRow label="Vehicle" value={plateLabel} />
          <DocRow label="Seal" value={sealLabel} />
          <DocRow label="Delivery Note" value={dnLabel} />
          <DocRow label="Gate Pass" value={gpLabel} />
          <button
            type="button"
            onClick={onOpenDeliveryNote}
            className={primaryBtn('bg-blue-600 text-white mt-1')}
          >
            <span className="inline-flex items-center justify-center gap-2">
              <FileText className="w-5 h-5" />
              View official Delivery Note
            </span>
          </button>
        </Section>

        <Section title="Checklist" defaultOpen={false}>
          <GateRow done={pickupStamped} label="Pickup GPS stamped" />
          <GateRow done={dispatcherSigned} label="Dispatcher signed yard release" />
          <GateRow done={Boolean(trip.deliveryNoteNumber?.trim())} label="Official Delivery Note" />
          <GateRow done={Boolean(trip.gatePassNumber?.trim())} label="Gate Pass" />
          <GateRow done={sealPhoto} label="Seal photo / seal number" />
          <GateRow done={driverSigned} label="Driver received sealed cargo" />
          <GateRow
            done={deliveryStamped || trip.status === 'Inbound' || trip.status === 'Delivered'}
            label="Arrival / delivery GPS"
          />
          <GateRow done={podSigned} label="Warehouse / consignee POD" />
        </Section>

        <Section title="More location / photos" icon={<MapPin className="w-3.5 h-3.5" />} defaultOpen={false}>
          <button
            type="button"
            disabled={busy || pickupStamped}
            onClick={onStampPickup}
            className={primaryBtn(
              pickupStamped ? 'bg-slate-200 text-slate-500' : 'bg-slate-900 text-white'
            )}
          >
            {pickupStamped ? 'Pickup GPS stamped ✓' : 'Stamp pickup GPS'}
          </button>
          <button
            type="button"
            disabled={busy || !canMoveCargo || deliveryStamped}
            onClick={onStampDelivery}
            className={primaryBtn(
              deliveryStamped
                ? 'bg-slate-200 text-slate-500'
                : 'bg-white text-slate-800 border border-slate-200'
            )}
          >
            {deliveryStamped ? 'Delivery GPS stamped ✓' : 'Stamp delivery GPS'}
          </button>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            id="driver-seal-again"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onSealPhoto(file);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => document.getElementById('driver-seal-again')?.click()}
            className={primaryBtn('border border-slate-200 bg-white text-slate-900')}
          >
            {sealPhoto ? 'Seal photo ✓ / retake' : 'Seal photo'}
          </button>
        </Section>
      </div>

      {stickyAction && (
        <div
          className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur border-t border-slate-200 px-3 pt-2.5"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <div className="max-w-lg mx-auto">
            <button
              type="button"
              disabled={stickyAction.disabled}
              onClick={stickyAction.onClick}
              className={primaryBtn(stickyAction.className)}
            >
              {busy ? 'Saving…' : stickyAction.label}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
