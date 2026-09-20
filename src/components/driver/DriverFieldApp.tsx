import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
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
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${color}`}>
      {status}
    </span>
  );
}

function GateRow({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-slate-700">
      <CheckCircle2 className={`w-4 h-4 shrink-0 ${done ? 'text-emerald-600' : 'text-slate-300'}`} />
      <span className={done ? 'font-semibold text-slate-900' : ''}>{label}</span>
    </div>
  );
}

export const DriverFieldApp: React.FC = () => {
  const {
    currentUser,
    trips,
    fieldEvents,
    assignedDriverRosterId,
    logout,
    uploadWorkspaceFile,
    saveAssignedDriverSignoff,
    markAssignedDriverArrived,
    addAssignedDriverFieldEvent,
  } = useFreight();

  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const driverPadRef = useRef<SignaturePadHandle>(null);
  const sealInputRef = useRef<HTMLInputElement | null>(null);

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
    window.setTimeout(() => setMessage(null), 4000);
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
      <div className="min-h-[100dvh] bg-slate-50 text-slate-900 flex flex-col">
        <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
          <div>
            <div className="text-sm font-extrabold">CasinFreight Driver</div>
            <div className="text-[11px] text-slate-500">{currentUser.name || currentUser.email}</div>
          </div>
          <button type="button" onClick={() => logout()} className="p-2 text-slate-500 hover:text-slate-800">
            <LogOut className="w-4 h-4" />
          </button>
        </header>
        <div className="p-6 text-sm text-amber-800 bg-amber-50 border-b border-amber-200">
          Your login works, but Driver Roster has no matching email. Ask dispatch to save your email on your driver record.
        </div>
      </div>
    );
  }

  if (selectedTrip) {
    return (
      <DriverTripDetail
        trip={selectedTrip}
        eventKinds={eventKinds}
        busy={busy}
        message={message}
        driverPadRef={driverPadRef}
        sealInputRef={sealInputRef}
        onBack={() => setSelectedTripId(null)}
        onLogout={() => logout()}
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
            if (!ink) throw new Error('Sign on the pad first.');
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
          run(() => markAssignedDriverArrived(selectedTrip.id), 'Inbound set. Hand the Driver phone app to warehouse for e-POD.')
        }
      />
    );
  }

  return (
    <div className="min-h-[100dvh] bg-slate-50 text-slate-900 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div>
          <div className="text-base font-extrabold tracking-tight">My trips</div>
          <div className="text-[11px] text-slate-500">{currentUser.name || currentUser.email} · Driver</div>
        </div>
        <button
          type="button"
          onClick={() => logout()}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 px-2 py-1.5 rounded-lg hover:bg-slate-100"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign out
        </button>
      </header>

      {message && (
        <div className="mx-4 mt-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
          {message}
        </div>
      )}

      <div className="mx-4 mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[11px] text-slate-600 leading-relaxed">
        Browser driver mode matches the phone app for <strong>your</strong> cargo signature and arrival.
        Warehouse e-POD stays on the Driver phone app (hand the phone) or office web — not this login.
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {myTrips.length === 0 ? (
          <div className="text-center text-sm text-slate-500 py-16">No assigned trips yet.</div>
        ) : (
          myTrips.map((trip) => (
            <button
              key={trip.id}
              type="button"
              onClick={() => setSelectedTripId(trip.id)}
              className="w-full text-left bg-white border border-slate-200 rounded-2xl p-4 shadow-xs hover:border-slate-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="font-extrabold text-sm text-slate-900">{trip.tripNumber || trip.id}</div>
                <StatusPill status={trip.status} />
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-700">
                <Route className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>
                  {trip.originZone} → {trip.destinationZone}
                </span>
              </div>
              {trip.cargoDescription && (
                <div className="mt-1.5 text-[11px] text-slate-500 line-clamp-2">{trip.cargoDescription}</div>
              )}
              <div className="mt-3 text-[11px] font-semibold text-blue-700">Open trip →</div>
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
  driverPadRef,
  sealInputRef,
  onBack,
  onLogout,
  onStampPickup,
  onSealPhoto,
  onSaveDriverSign,
  onStampDelivery,
  onArrived,
}: {
  trip: Trip;
  eventKinds: Set<string>;
  busy: boolean;
  message: string | null;
  driverPadRef: React.RefObject<SignaturePadHandle | null>;
  sealInputRef: React.RefObject<HTMLInputElement | null>;
  onBack: () => void;
  onLogout: () => void;
  onStampPickup: () => void;
  onSealPhoto: (file: File) => void;
  onSaveDriverSign: () => void;
  onStampDelivery: () => void;
  onArrived: () => void;
}) {
  const next = driverNextStepForTrip(trip, eventKinds);
  const driverSigned = hasSignedInk(trip.driverSignoff?.signatureDataUrl);
  const dispatcherSigned = hasSignedInk(trip.dispatcherSignoff?.signatureDataUrl);
  const podSigned = hasSignedInk(trip.pod?.signatureDataUrl);
  const pickupStamped = eventKinds.has('pickup_geo');
  const sealPhoto = eventKinds.has('seal_photo') || Boolean(trip.securitySealNumber?.trim());
  const deliveryStamped = eventKinds.has('delivery_geo');
  const canMoveCargo = driverSigned && dispatcherSigned;
  const sealedEnough =
    sealPhoto ||
    trip.status === 'Loaded' ||
    trip.status === 'In Transit' ||
    trip.status === 'Inbound';
  const canSignDispatch = !driverSigned && sealedEnough;

  return (
    <div className="min-h-[100dvh] bg-slate-50 text-slate-900 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-3 py-2.5 flex items-center gap-2 sticky top-0 z-10">
        <button type="button" onClick={onBack} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-extrabold truncate">{trip.tripNumber || trip.id}</div>
          <div className="text-[11px] text-slate-500 truncate">
            {trip.originZone} → {trip.destinationZone}
          </div>
        </div>
        <StatusPill status={trip.status} />
        <button type="button" onClick={onLogout} className="p-2 text-slate-500 hover:text-slate-800">
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-10">
        {message && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">{message}</div>
        )}

        <div
          className={`rounded-2xl border p-4 ${
            next.done ? 'border-emerald-200 bg-emerald-50/70' : 'border-blue-200 bg-blue-50/70'
          }`}
        >
          <div className={`text-sm font-extrabold ${next.done ? 'text-emerald-800' : 'text-blue-800'}`}>
            {next.title}
          </div>
          <p className="text-xs text-slate-700 mt-1 leading-relaxed">{next.detail}</p>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Checklist</div>
          <GateRow done={pickupStamped} label="Pickup GPS stamped" />
          <GateRow done={dispatcherSigned} label="Dispatcher signed yard release (web)" />
          <GateRow done={sealPhoto} label="Seal photo / seal number on file" />
          <GateRow done={driverSigned} label="Driver received sealed cargo" />
          <GateRow done={deliveryStamped || trip.status === 'Inbound' || trip.status === 'Delivered'} label="Arrival / delivery GPS" />
          <GateRow done={podSigned} label="Warehouse / consignee signed POD" />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" /> Location stamps
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onStampPickup}
            className="w-full min-h-11 rounded-xl bg-slate-900 text-white text-xs font-bold disabled:opacity-50"
          >
            {pickupStamped ? 'Stamp pickup GPS again' : 'Stamp pickup GPS'}
          </button>
          <button
            type="button"
            disabled={busy || !canMoveCargo}
            onClick={onStampDelivery}
            className="w-full min-h-11 rounded-xl bg-slate-100 text-slate-800 border border-slate-200 text-xs font-bold disabled:opacity-50"
          >
            {deliveryStamped ? 'Stamp delivery GPS again' : 'Stamp delivery GPS'}
          </button>
          {(trip.status === 'In Transit' || trip.status === 'Inbound') && (
            <button
              type="button"
              disabled={busy || !canMoveCargo}
              onClick={onArrived}
              className={`w-full min-h-12 rounded-xl text-white text-xs font-bold disabled:opacity-50 ${
                trip.status === 'Inbound' ? 'bg-emerald-700' : 'bg-cyan-700'
              }`}
            >
              {trip.status === 'Inbound' ? 'Arrived (Inbound) ✓' : 'I have arrived (Inbound)'}
            </button>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5" /> Photos
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
            className="w-full min-h-11 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 disabled:opacity-50"
          >
            {sealPhoto ? 'Seal photo ✓ / take again' : 'Seal photo *'}
          </button>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5" /> Your signature
          </div>
          {driverSigned ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900 font-semibold">
              Driver cargo receipt signed ✓
            </div>
          ) : (
            <>
              <SignaturePad
                ref={driverPadRef}
                label="Sign that you received sealed cargo *"
                hint="This is your hauling receipt — not the warehouse e-POD."
                existingUrl={trip.driverSignoff?.signatureDataUrl}
              />
              <button
                type="button"
                disabled={busy || !canSignDispatch}
                onClick={onSaveDriverSign}
                className="w-full min-h-12 rounded-xl bg-blue-600 text-white text-xs font-bold disabled:opacity-50"
              >
                Save my cargo signature
              </button>
              {!sealedEnough && (
                <p className="text-[11px] text-amber-700">Take a seal photo first (or wait for the seal number on the trip).</p>
              )}
              {!driverSigned && sealedEnough && !dispatcherSigned && (
                <p className="text-[11px] text-slate-500">
                  You can sign now. In Transit unlocks after dispatch also signs on the web.
                </p>
              )}
            </>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-slate-100/80 p-4 space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5" /> Warehouse e-POD
          </div>
          {podSigned ? (
            <p className="text-xs text-emerald-800 font-semibold">Proof of delivery signed ✓</p>
          ) : (
            <p className="text-xs text-slate-600 leading-relaxed">
              Browser driver login cannot sign as warehouse. After Inbound, open the{' '}
              <strong>CasinFreight Driver phone app</strong> and use “Warehouse signs on this phone”, or ask office to stamp e-POD on the web.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
