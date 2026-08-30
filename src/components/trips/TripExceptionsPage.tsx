import React, { useMemo, useState } from 'react';
import { Ban, PauseCircle, Search } from 'lucide-react';
import { useFreight } from '../../context/FreightContext';
import { CANCEL_EXCEPTION_KINDS, HOLD_EXCEPTION_KINDS, Trip, TripExceptionKind, TripStatus } from '../../types';
import { matchingTruckBans } from '../../lib/truckBans';
import { DeliveryNoteModal } from './DeliveryNoteModal';
import { TripExceptionModal } from './TripExceptionModal';
import { resumeTarget, TripKanbanCard } from './TripKanbanCard';
import { FeatureHowTo } from '../help/FeatureHowTo';

interface TripExceptionsPageProps {
  onSelectTrip: (trip: Trip) => void;
}

const COLUMNS: { id: 'On Hold' | 'Cancelled'; label: string; desc: string; countColor: string; border: string }[] = [
  {
    id: 'On Hold',
    label: 'On Hold',
    desc: 'Waiting, breakdown, weather, refused — resume when the load can move again.',
    countColor: 'bg-amber-50 text-amber-800 border-amber-200',
    border: 'border-amber-300',
  },
  {
    id: 'Cancelled',
    label: 'Cancelled',
    desc: 'Booking will not run. Kept here so dispatch can still look it up.',
    countColor: 'bg-rose-50 text-rose-700 border-rose-200',
    border: 'border-rose-200',
  },
];

export const TripExceptionsPage: React.FC<TripExceptionsPageProps> = ({ onSelectTrip }) => {
  const {
    company,
    trips,
    trucks,
    drivers,
    clients,
    updateTripStatus,
    canManipulateTripStatus,
    liveTracking,
    truckBans,
  } = useFreight();

  const [search, setSearch] = useState('');
  const [exceptionTarget, setExceptionTarget] = useState<{ trip: Trip; mode: 'hold' | 'cancel' } | null>(null);
  const [deliveryNoteTrip, setDeliveryNoteTrip] = useState<Trip | null>(null);

  const holdCount = trips.filter((t) => t.status === 'On Hold').length;
  const cancelledCount = trips.filter((t) => t.status === 'Cancelled').length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return trips.filter((trip) => {
      if (trip.status !== 'On Hold' && trip.status !== 'Cancelled') return false;
      if (!q) return true;
      const truck = trucks.find((item) => item.id === trip.truckId);
      const driver = drivers.find((item) => item.id === trip.driverId);
      const client = clients.find((item) => item.id === trip.clientId);
      const hay = [
        trip.tripNumber,
        trip.waybillNumber,
        trip.originZone,
        trip.destinationZone,
        trip.cargoDescription,
        truck?.plateNumber,
        driver?.name,
        client?.name,
        trip.exceptionKind,
        trip.exceptionNote,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [trips, trucks, drivers, clients, search]);

  const handleExceptionConfirm = (kind: TripExceptionKind, note: string) => {
    if (!exceptionTarget) return;
    const { trip, mode } = exceptionTarget;
    if (trip.status === 'Invoiced') {
      setExceptionTarget(null);
      return;
    }
    const kinds = mode === 'hold' ? HOLD_EXCEPTION_KINDS : CANCEL_EXCEPTION_KINDS;
    const reasonLabel = kinds.find((item) => item.id === kind)?.label || kind;
    const noteText = [reasonLabel, note].filter(Boolean).join('. ');
    const previous = trip.status === 'On Hold' || trip.status === 'Cancelled' ? resumeTarget(trip) : trip.status;
    updateTripStatus(trip.id, mode === 'hold' ? 'On Hold' : 'Cancelled', noteText, undefined, {
      holdFromStatus: previous,
      exceptionKind: kind,
      exceptionNote: note || undefined,
    });
    setExceptionTarget(null);
  };

  const handleNextStatus = (e: React.MouseEvent, trip: Trip) => {
    e.stopPropagation();
    if (trip.status === 'On Hold') {
      updateTripStatus(trip.id, resumeTarget(trip), 'Resumed from hold.');
    }
  };

  const handleDirectStatusChange = (_e: React.MouseEvent, trip: Trip, targetStatus: TripStatus) => {
    if (trip.status === 'On Hold' && targetStatus !== 'On Hold' && targetStatus !== 'Cancelled') {
      updateTripStatus(trip.id, targetStatus, 'Resumed from hold.');
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC] text-slate-900 overflow-hidden">
      <div className="p-4 md:px-6 md:pt-5 md:pb-4 border-b border-slate-200 bg-white shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Exceptions</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 font-bold border border-amber-200">
                {holdCount + cancelledCount} off pipeline
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Holds and cancellations leave the trip board so dispatch stays on the happy path.
            </p>
            <div className="mt-3 max-w-xl">
              <FeatureHowTo feature="exceptions" />
            </div>
          </div>
          <div className="relative w-full lg:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Plate, client, trip, reason…"
              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-400"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 p-3 md:p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 h-full min-h-0">
          {COLUMNS.map((column) => {
            const columnTrips = filtered.filter((t) => t.status === column.id);
            return (
              <div
                key={column.id}
                className={`bg-white border rounded-xl flex flex-col min-h-0 overflow-hidden ${column.border}`}
              >
                <div className="px-4 py-3 border-b border-slate-100 flex items-start justify-between gap-3 shrink-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {column.id === 'On Hold' ? (
                        <PauseCircle className="w-4 h-4 text-amber-600" />
                      ) : (
                        <Ban className="w-4 h-4 text-rose-600" />
                      )}
                      <span className="text-sm font-bold text-slate-800">{column.label}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{column.desc}</p>
                  </div>
                  <span className={`text-[11px] font-mono px-2 py-0.5 rounded font-bold border shrink-0 ${column.countColor}`}>
                    {columnTrips.length}
                  </span>
                </div>
                <div className="p-3 overflow-y-auto space-y-2 flex-1 min-h-0 custom-scrollbar">
                  {columnTrips.length === 0 ? (
                    <div className="py-10 px-4 text-center text-slate-400 text-xs">
                      {column.id === 'On Hold' ? 'No on-hold trips' : 'No cancelled trips'}
                    </div>
                  ) : (
                    columnTrips.map((trip) => (
                      <TripKanbanCard
                        key={trip.id}
                        trip={trip}
                        truck={trucks.find((item) => item.id === trip.truckId)}
                        driver={drivers.find((item) => item.id === trip.driverId)}
                        client={clients.find((item) => item.id === trip.clientId)}
                        effectiveSearch={search}
                        selectedTruckId="ALL"
                        selectedClientId="ALL"
                        onSelectTrip={onSelectTrip}
                        onOpenDeliveryNote={(t) => setDeliveryNoteTrip(t)}
                        onDirectStatusChange={handleDirectStatusChange}
                        onNextStatus={handleNextStatus}
                        onHold={(e, t) => {
                          e.stopPropagation();
                          setExceptionTarget({ trip: t, mode: 'hold' });
                        }}
                        onCancel={(e, t) => {
                          e.stopPropagation();
                          setExceptionTarget({ trip: t, mode: 'cancel' });
                        }}
                        canManipulateTripStatus={canManipulateTripStatus}
                        tracking={liveTracking.find((item) => item.tripId === trip.id || item.id === trip.id)}
                        hasTruckBan={
                          matchingTruckBans({
                            bans: truckBans,
                            originZone: trip.originZone,
                            originAddress: trip.originAddress,
                            destinationZone: trip.destinationZone,
                            destinationAddress: trip.destinationAddress,
                            scheduledPickup: trip.scheduledPickup,
                            scheduledDelivery: trip.scheduledDelivery,
                            truckType: trucks.find((item) => item.id === trip.truckId)?.type,
                            includeNow: trip.status === 'In Transit' || trip.status === 'Loaded',
                          }).length > 0
                        }
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {exceptionTarget && (
        <TripExceptionModal
          trip={exceptionTarget.trip}
          mode={exceptionTarget.mode}
          onClose={() => setExceptionTarget(null)}
          onConfirm={handleExceptionConfirm}
        />
      )}

      {deliveryNoteTrip && (
        <DeliveryNoteModal
          isOpen={Boolean(deliveryNoteTrip)}
          onClose={() => setDeliveryNoteTrip(null)}
          trip={deliveryNoteTrip}
          truck={trucks.find((t) => t.id === deliveryNoteTrip.truckId)}
          driver={drivers.find((d) => d.id === deliveryNoteTrip.driverId)}
          helper={drivers.find((d) => d.id === deliveryNoteTrip.helperId)}
          client={clients.find((c) => c.id === deliveryNoteTrip.clientId)}
          company={company}
        />
      )}
    </div>
  );
};
