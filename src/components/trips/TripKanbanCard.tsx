import React from 'react';
import {
  AlertTriangle,
  Ban,
  ChevronRight,
  Clock,
  FileText,
  Lock,
  PauseCircle,
  Play,
  Radio,
  Weight,
} from 'lucide-react';
import {
  CANCEL_EXCEPTION_KINDS,
  Client,
  Driver,
  HOLD_EXCEPTION_KINDS,
  RolePermissionCheck,
  Trip,
  TripExceptionKind,
  TripStatus,
  Truck,
  LiveTracking,
} from '../../types';

import { resumeTarget } from '../../lib/stageGates';

export { resumeTarget };

export function exceptionKindLabel(kind?: TripExceptionKind): string | undefined {
  if (!kind) return undefined;
  return [...HOLD_EXCEPTION_KINDS, ...CANCEL_EXCEPTION_KINDS].find((item) => item.id === kind)?.label;
}

interface TripKanbanCardProps {
  trip: Trip;
  truck?: Truck;
  driver?: Driver;
  client?: Client;
  effectiveSearch: string;
  selectedTruckId: string;
  selectedClientId: string;
  onSelectTrip: (trip: Trip) => void;
  onOpenDeliveryNote: (trip: Trip) => void;
  onDirectStatusChange: (e: React.MouseEvent, trip: Trip, status: TripStatus) => void;
  onNextStatus: (e: React.MouseEvent, trip: Trip) => void;
  onHold: (e: React.MouseEvent, trip: Trip) => void;
  onCancel: (e: React.MouseEvent, trip: Trip) => void;
  canManipulateTripStatus: (targetStatus: TripStatus, currentStatus?: TripStatus) => RolePermissionCheck;
  tracking?: LiveTracking;
  hasTruckBan?: boolean;
  compact?: boolean;
}

export const TripKanbanCard: React.FC<TripKanbanCardProps> = ({
  trip,
  truck,
  driver,
  client,
  effectiveSearch,
  selectedTruckId,
  selectedClientId,
  onSelectTrip,
  onOpenDeliveryNote,
  onDirectStatusChange,
  onNextStatus,
  onHold,
  onCancel,
  canManipulateTripStatus,
  tracking,
  hasTruckBan,
  compact = false,
}) => {
  const netCap = truck ? truck.netPayloadKg : 10000;
  const loadPercent = Math.min(100, Math.round((trip.cargoWeightKg / netCap) * 100));
  const isPlateMatched = Boolean(effectiveSearch && truck?.plateNumber.toLowerCase().includes(effectiveSearch));
  const isClientMatched = Boolean(effectiveSearch && client?.name.toLowerCase().includes(effectiveSearch));
  const exceptionLabel = exceptionKindLabel(trip.exceptionKind);
  const canHold = trip.status !== 'Invoiced' && trip.status !== 'Cancelled' && trip.status !== 'On Hold';
  const canCancel = trip.status !== 'Invoiced' && trip.status !== 'Cancelled';
  const holdPerm = canManipulateTripStatus('On Hold', trip.status);
  const cancelPerm = canManipulateTripStatus('Cancelled', trip.status);

  const nextTarget: TripStatus =
    trip.status === 'Pending' ? 'Loaded' :
    trip.status === 'Loaded' ? 'In Transit' :
    trip.status === 'In Transit' ? 'Delivered' :
    trip.status === 'Delivered' ? 'Invoiced' :
    trip.status === 'On Hold' ? resumeTarget(trip) :
    'Invoiced';

  const perm = trip.status === 'Cancelled'
    ? { allowed: false, allowedRoles: [] as string[] }
    : trip.status === 'On Hold'
    ? holdPerm
    : trip.status !== 'Invoiced'
    ? canManipulateTripStatus(nextTarget, trip.status)
    : { allowed: true, allowedRoles: [] as string[] };

  const leftBorder =
    trip.status === 'Cancelled' ? 'border-l-rose-500' :
    trip.status === 'On Hold' ? 'border-l-amber-600' :
    trip.isOverweight ? 'border-l-rose-500' :
    trip.status === 'In Transit' ? 'border-l-blue-500' :
    trip.status === 'Delivered' ? 'border-l-emerald-500' :
    trip.status === 'Loaded' ? 'border-l-indigo-500' :
    'border-l-slate-400';

  return (
    <div
      onClick={() => onSelectTrip(trip)}
      className={`bg-white border border-slate-200 rounded-lg shadow-xs hover:shadow-md transition-all cursor-pointer group select-none text-left border-l-4 ${leftBorder} ${
        compact ? 'p-2.5' : 'p-3'
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <span className={`text-xs font-bold font-mono px-1.5 py-0.5 rounded ${
          isPlateMatched || selectedTruckId === trip.truckId
            ? 'bg-blue-100 text-blue-800 border border-blue-200'
            : 'text-slate-600 bg-slate-50'
        }`}>
          {truck?.plateNumber} <span className="font-sans font-normal text-slate-400">• {truck?.type.split(' ')[0]}</span>
        </span>
        <div className="flex items-center gap-1">
          {tracking && (
            <span
              title={!tracking.gpsEnabled ? 'Driver GPS is off' : tracking.isMocked ? 'Mock GPS' : 'Live from driver app'}
              className={`text-[10px] px-1.5 py-0.5 rounded border font-bold flex items-center gap-0.5 ${
                !tracking.gpsEnabled || tracking.isMocked
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              <Radio className="w-2.5 h-2.5" />
              {!tracking.gpsEnabled ? 'GPS off' : tracking.isMocked ? 'Fake GPS' : 'Live'}
            </span>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDeliveryNote(trip);
            }}
            className="text-[10px] bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded flex items-center gap-0.5 font-medium transition-colors"
            title="View official Delivery Note / DR"
          >
            <FileText className="w-2.5 h-2.5" />
            <span>DN</span>
          </button>
          <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono font-medium">
            #{trip.tripNumber}
          </span>
          {trip.activeStatusRetraction?.status === 'Pending_Approval' && (
            <span className="text-[10px] bg-amber-50 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded font-bold">
              Rollback pending
            </span>
          )}
        </div>
      </div>

      <p className="font-bold text-sm text-slate-900 line-clamp-1 mb-0.5">
        {trip.originZone} → {trip.destinationZone}
      </p>

      <div className="text-xs mb-1.5 truncate">
        <span className={`font-semibold ${
          isClientMatched || selectedClientId === trip.clientId
            ? 'text-blue-700 bg-blue-50 px-1 rounded'
            : 'text-slate-800'
        }`}>
          {client?.name}
        </span>
        <span className="text-slate-400 mx-1">•</span>
        <span className="text-slate-500">{trip.cargoDescription}</span>
      </div>

      {!compact && (
      <div className="mb-2 bg-slate-50 p-1.5 rounded border border-slate-100">
        <div className="flex items-center justify-between text-[10px] mb-1 text-slate-500">
          <span className="flex items-center gap-1 font-medium">
            <Weight className="w-3 h-3" />
            <span>{(trip.cargoWeightKg / 1000).toFixed(1)} MT / {(netCap / 1000).toFixed(1)} MT</span>
          </span>
          <span className={`font-mono font-bold ${
            trip.isOverweight ? 'text-rose-600' : loadPercent > 90 ? 'text-amber-600' : 'text-blue-600'
          }`}>
            {trip.isOverweight ? `+${(trip.overweightKg / 1000).toFixed(1)} MT OVER` : `${loadPercent}%`}
          </span>
        </div>
        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              trip.isOverweight ? 'bg-rose-500' : loadPercent > 85 ? 'bg-amber-500' : 'bg-blue-600'
            }`}
            style={{ width: `${Math.min(100, (trip.cargoWeightKg / netCap) * 100)}%` }}
          />
        </div>
      </div>
      )}

      <div className={`flex flex-wrap gap-1 ${compact ? 'mb-1.5' : 'mb-2'}`}>
        {exceptionLabel && (trip.status === 'On Hold' || trip.status === 'Cancelled') && (
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border flex items-center gap-1 ${
            trip.status === 'Cancelled'
              ? 'bg-rose-50 text-rose-700 border-rose-200'
              : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}>
            {trip.status === 'Cancelled' ? <Ban className="w-2.5 h-2.5" /> : <PauseCircle className="w-2.5 h-2.5" />}
            {exceptionLabel}
          </span>
        )}
        {trip.isOverweight && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
            <AlertTriangle className="w-2.5 h-2.5 text-rose-500" />
            DPWH Surcharge
          </span>
        )}
        {hasTruckBan && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
            <Ban className="w-2.5 h-2.5" />
            Truck ban
          </span>
        )}
        {trip.demurrageHours > 0 && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
            <Clock className="w-2.5 h-2.5 text-amber-500" />
            {trip.demurrageHours}h Demurrage
          </span>
        )}
        {trip.multiStopCount > 0 && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
            +{trip.multiStopCount} Drop
          </span>
        )}
        {trip.fuelSurchargePercent > 0 && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
            FAF {trip.fuelSurchargePercent}%
          </span>
        )}
      </div>

      {trip.status !== 'Cancelled' && trip.status !== 'On Hold' && !compact && (
        <div className="mb-2 pt-2 border-t border-slate-100 flex items-center justify-between gap-1" onClick={(e) => e.stopPropagation()}>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Stage:</span>
          <div className="flex items-center gap-1 bg-slate-100/90 p-0.5 rounded-md border border-slate-200/80">
            {(['Pending', 'Loaded', 'In Transit', 'Delivered', 'Invoiced'] as TripStatus[]).map((stg) => {
              const isCurrent = trip.status === stg;
              const label = stg === 'Pending' ? 'P' : stg === 'Loaded' ? 'L' : stg === 'In Transit' ? 'T' : stg === 'Delivered' ? 'D' : 'INV';

              return (
                <button
                  key={stg}
                  onClick={(e) => onDirectStatusChange(e, trip, stg)}
                  title={`Push/switch to ${stg}`}
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded transition-all ${
                    isCurrent
                      ? stg === 'Pending' ? 'bg-slate-700 text-white shadow-2xs'
                      : stg === 'Loaded' ? 'bg-blue-600 text-white shadow-2xs'
                      : stg === 'In Transit' ? 'bg-amber-500 text-white shadow-2xs'
                      : stg === 'Delivered' ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-purple-600 text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-white'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-700 shrink-0">
            {driver ? driver.name.split(' ').map((n) => n[0]).join('').slice(0, 2) : 'DR'}
          </div>
          <p className="text-[11px] text-slate-600 font-medium truncate max-w-[72px]">
            {driver?.name.split(' ')[0]}
          </p>
        </div>

        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {canHold && (
            <button
              type="button"
              onClick={(e) => onHold(e, trip)}
              disabled={!holdPerm.allowed}
              title={holdPerm.allowed ? 'Hold this trip' : `Requires ${holdPerm.allowedRoles.join(', ')}`}
              className="p-1 rounded border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 disabled:opacity-50"
            >
              <PauseCircle className="w-3.5 h-3.5" />
            </button>
          )}
          {canCancel && (
            <button
              type="button"
              onClick={(e) => onCancel(e, trip)}
              disabled={!cancelPerm.allowed}
              title={cancelPerm.allowed ? 'Cancel this trip' : `Requires ${cancelPerm.allowedRoles.join(', ')}`}
              className="p-1 rounded border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:opacity-50"
            >
              <Ban className="w-3.5 h-3.5" />
            </button>
          )}
          <span className="font-mono font-bold text-xs text-slate-800 ml-0.5">
            ₱{trip.baseRatePhp.toLocaleString()}
          </span>
          <button
            onClick={(e) => onNextStatus(e, trip)}
            disabled={trip.status === 'Cancelled'}
            className={`text-[10px] font-bold px-2 py-1 rounded flex items-center gap-0.5 transition-all shadow-2xs active:scale-95 disabled:opacity-50 ${
              trip.status === 'Cancelled'
                ? 'bg-slate-100 text-slate-400'
                : !perm.allowed && trip.status !== 'Invoiced'
                ? 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                : trip.status === 'Pending'
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : trip.status === 'Loaded'
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                : trip.status === 'In Transit'
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : trip.status === 'Delivered'
                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                : trip.status === 'On Hold'
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
            title={
              trip.status === 'Cancelled' ? 'Cancelled bookings stay in this column'
              : !perm.allowed && trip.status !== 'Invoiced'
              ? `Restricted: Requires ${perm.allowedRoles.join(', ')} role`
              : trip.status === 'On Hold' ? `Resume to ${nextTarget}`
              : 'Push to next stage'
            }
          >
            {!perm.allowed && trip.status !== 'Invoiced' && trip.status !== 'Cancelled' && <Lock className="w-2.5 h-2.5 mr-0.5" />}
            {trip.status === 'On Hold' && <Play className="w-2.5 h-2.5" />}
            <span>
              {trip.status === 'Pending' && 'Load'}
              {trip.status === 'Loaded' && 'Dispatch'}
              {trip.status === 'In Transit' && 'Deliver'}
              {trip.status === 'Delivered' && 'Invoice'}
              {trip.status === 'Invoiced' && 'View'}
              {trip.status === 'On Hold' && 'Resume'}
              {trip.status === 'Cancelled' && 'Cancelled'}
            </span>
            {trip.status !== 'Cancelled' && <ChevronRight className="w-3 h-3" />}
          </button>
        </div>
      </div>
    </div>
  );
};
