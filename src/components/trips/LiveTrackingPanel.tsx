import React, { useEffect, useState } from 'react';
import { AlertTriangle, Camera, MapPin, PenTool, Radio, ShieldAlert } from 'lucide-react';
import { FieldEvent, FieldEventKind, LiveTracking } from '../../types';
import { drivingRoute, geocodeLabel, googleMapsRouteUrl, reversePlace, wazePointUrl, type MapPoint } from '../../lib/placeMap';
import { safeHttpsUrl } from '../../lib/safeUrl';
import { MarkedRouteMap, RouteMark } from './MarkedRouteMap';

const KIND_LABEL: Record<FieldEventKind, string> = {
  dispatch_signature: 'Dispatch signature',
  pod_signature: 'Proof of delivery signature',
  seal_photo: 'Seal photo',
  parcel_photo: 'Parcel photo',
  container_photo: 'Container photo',
  pickup_geo: 'Arrived at pickup',
  delivery_geo: 'Arrived at consignee',
  gps_disabled: 'GPS was turned off',
  gps_mocked: 'Mock / fake GPS detected',
};

function formatWhen(iso?: string) {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' });
}

function mapsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

interface LiveTrackingPanelProps {
  tripId: string;
  tracking?: LiveTracking;
  events: FieldEvent[];
  origin?: string;
  destination?: string;
  extraDropCount?: number;
  /** Route card on the trip: map and arrival pins only. */
  compact?: boolean;
}

type MapPin = { label: string; lat: number; lng: number; when?: string; accuracyM?: number };

function latestPin(events: FieldEvent[], kind: FieldEventKind, label: string): MapPin | null {
  const hit = events.find((event) => event.kind === kind && event.lat != null && event.lng != null);
  if (!hit || hit.lat == null || hit.lng == null) return null;
  return { label, lat: hit.lat, lng: hit.lng, when: hit.createdAt, accuracyM: hit.accuracyM };
}

export const LiveTrackingPanel: React.FC<LiveTrackingPanelProps> = ({
  tripId,
  tracking,
  events,
  origin,
  destination,
  extraDropCount = 0,
  compact = false,
}) => {
  const tripEvents = events
    .filter((event) => event.tripId === tripId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const arrivalPins = [
    latestPin(tripEvents, 'pickup_geo', 'Arrived at pickup'),
    latestPin(tripEvents, 'delivery_geo', 'Arrived at destination'),
  ].filter((pin): pin is MapPin => Boolean(pin));

  const stale = tracking?.updatedAt
    ? Date.now() - new Date(tracking.updatedAt).getTime() > 3 * 60 * 1000
    : true;

  const [marks, setMarks] = useState<RouteMark[]>([]);
  const [road, setRoad] = useState<MapPoint[]>([]);
  const [routeState, setRouteState] = useState<'idle' | 'loading' | 'missing'>('idle');

  const pickupEvent = tripEvents.find((event) => event.kind === 'pickup_geo');
  const dropoffEvent = tripEvents.find((event) => event.kind === 'delivery_geo');
  const ping =
    tracking?.lat != null && tracking.lng != null
      ? { lat: tracking.lat, lng: tracking.lng, when: tracking.updatedAt, accuracyM: tracking.accuracyM }
      : null;
  const pickupStamp = arrivalPins.find((pin) => pin.label === 'Arrived at pickup')
    || (pickupEvent && !dropoffEvent && ping ? { ...ping, label: 'Arrived at pickup' } : null);
  const dropoffStamp = arrivalPins.find((pin) => pin.label === 'Arrived at destination')
    || (dropoffEvent && ping ? { ...ping, label: 'Arrived at destination' } : null);
  const pickupKey = [
    pickupEvent?.id || '',
    pickupStamp ? `${pickupStamp.lat},${pickupStamp.lng}` : '',
    ping ? `${ping.lat},${ping.lng}` : '',
  ].join('|');
  const dropoffKey = [
    dropoffEvent?.id || '',
    dropoffStamp ? `${dropoffStamp.lat},${dropoffStamp.lng}` : '',
  ].join('|');

  useEffect(() => {
    if (!origin && !destination && !pickupKey && !dropoffKey) {
      setMarks([]);
      setRouteState('missing');
      return;
    }
    let cancelled = false;
    setRouteState('loading');
    (async () => {
      const pickupPoint = pickupStamp
        ? { lat: pickupStamp.lat, lng: pickupStamp.lng }
        : origin
          ? await geocodeLabel(origin)
          : null;
      const dropoffPoint = dropoffStamp
        ? { lat: dropoffStamp.lat, lng: dropoffStamp.lng }
        : destination
          ? await geocodeLabel(destination)
          : null;
      if (cancelled) return;
      const build = (pickupPlace?: string | null, dropoffPlace?: string | null): RouteMark[] => {
        const next: RouteMark[] = [];
        if (pickupPoint) {
          next.push({
            id: 'pickup',
            label: 'Pickup',
            place: pickupPlace || undefined,
            accuracyM: pickupStamp?.accuracyM,
            detail: pickupStamp?.when
              ? `Marked ${formatWhen(pickupStamp.when)}`
              : pickupEvent
                ? 'Marked, GPS not saved'
                : 'Booked yard',
            lat: pickupPoint.lat,
            lng: pickupPoint.lng,
            stamped: Boolean(pickupStamp || pickupEvent),
          });
        }
        if (dropoffPoint) {
          next.push({
            id: 'dropoff',
            label: 'Dropoff',
            place: dropoffPlace || undefined,
            accuracyM: dropoffStamp?.accuracyM,
            detail: dropoffStamp?.when
              ? `Marked ${formatWhen(dropoffStamp.when)}`
              : dropoffEvent
                ? 'Marked, GPS not saved'
                : 'Booked gate',
            lat: dropoffPoint.lat,
            lng: dropoffPoint.lng,
            stamped: Boolean(dropoffStamp || dropoffEvent),
          });
        }
        return next;
      };
      const first = build();
      setMarks(first);
      setRouteState(first.length ? 'idle' : 'missing');
      const [pickupPlace, dropoffPlace] = await Promise.all([
        pickupStamp && pickupPoint ? reversePlace(pickupPoint) : Promise.resolve(null),
        dropoffStamp && dropoffPoint ? reversePlace(dropoffPoint) : Promise.resolve(null),
      ]);
      if (cancelled || (!pickupPlace && !dropoffPlace)) return;
      setMarks(build(pickupPlace, dropoffPlace));
    })();
    return () => {
      cancelled = true;
    };
  }, [origin, destination, pickupKey, dropoffKey]);

  const roadKey = marks.map((mark) => `${mark.id}:${mark.lat.toFixed(5)},${mark.lng.toFixed(5)}`).join('|');

  useEffect(() => {
    const pickup = marks.find((mark) => mark.id === 'pickup');
    const dropoff = marks.find((mark) => mark.id === 'dropoff');
    if (!pickup || !dropoff) {
      setRoad([]);
      return;
    }
    let cancelled = false;
    drivingRoute([pickup, dropoff]).then((line) => {
      if (!cancelled) setRoad(line || []);
    });
    return () => {
      cancelled = true;
    };
  }, [roadKey, marks]); // pickup and dropoff stamps are included in the keys

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-2xs">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <div className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
          <Radio className={`w-4 h-4 ${tracking?.gpsEnabled && !stale ? 'text-emerald-600' : 'text-slate-400'}`} />
          <span>{compact ? 'Route map' : 'Driver app · live GPS & field captures'}</span>
        </div>
        {tracking && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
            !tracking.gpsEnabled || tracking.isMocked
              ? 'bg-rose-50 text-rose-700 border-rose-200'
              : stale
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}>
            {!tracking.gpsEnabled ? 'GPS off' : tracking.isMocked ? 'Fake GPS' : stale ? 'Last location' : 'Live'}
          </span>
        )}
      </div>

      {marks.length > 0 ? (
        <div className="space-y-2">
          <MarkedRouteMap marks={marks} path={road} />
          {marks.some((mark) => mark.id === 'pickup') && marks.some((mark) => mark.id === 'dropoff') && (
            <div className="grid grid-cols-2 gap-2">
              <a
                href={googleMapsRouteUrl(
                  marks.find((mark) => mark.id === 'pickup') as MapPoint,
                  marks.find((mark) => mark.id === 'dropoff') as MapPoint
                )}
                target="_blank"
                rel="noreferrer"
                className="h-9 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-900 flex items-center justify-center hover:bg-slate-50"
              >
                Google Maps
              </a>
              <a
                href={wazePointUrl(marks.find((mark) => mark.id === 'dropoff') as MapPoint)}
                target="_blank"
                rel="noreferrer"
                className="h-9 rounded-lg bg-slate-900 text-xs font-bold text-white flex items-center justify-center hover:bg-slate-800"
              >
                Waze
              </a>
            </div>
          )}
          {extraDropCount > 0 && (
            <p className="text-[11px] text-slate-500">
              This trip bills {extraDropCount} extra drop{extraDropCount > 1 ? 's' : ''}. Those stops have no address of their own, so the road shown is pickup to the final dropoff.
            </p>
          )}
          <div className="flex flex-col gap-2">
            {marks.map((mark) => (
              <div key={mark.id} className="text-[11px] leading-snug">
                <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                  <span className={`h-2.5 w-2.5 rounded-full ${mark.id === 'pickup' ? 'bg-emerald-600' : 'bg-blue-600'}`} />
                  {mark.label}
                </div>
                {mark.stamped && mark.lat != null && (
                  <p className="pl-4 font-semibold text-emerald-800">
                    Stamped at {mark.place ? `${mark.place} · ` : ''}
                    {mark.lat.toFixed(5)}, {mark.lng.toFixed(5)}
                    {mark.accuracyM != null && Number.isFinite(mark.accuracyM)
                      ? ` · within ${Math.round(mark.accuracyM)} m`
                      : ''}
                  </p>
                )}
                <p className={`pl-4 ${mark.stamped ? 'text-slate-600' : 'text-slate-500'}`}>{mark.detail}</p>
              </div>
            ))}
          </div>
          {tracking && (!tracking.gpsEnabled || tracking.isMocked) && (
            <div className="flex items-start gap-2 text-[11px] bg-rose-50 border border-rose-200 text-rose-800 rounded-lg p-2">
              <ShieldAlert className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>
                {tracking.isMocked
                  ? 'Mock location app detected. Treat this ping as untrusted.'
                  : `GPS was disabled on the phone${tracking.gpsDisabledAt ? ` at ${formatWhen(tracking.gpsDisabledAt)}` : ''}. The driver app blocks photos and signatures until GPS is back on.`}
              </span>
            </div>
          )}
        </div>
      ) : (
        <p className="text-[11px] text-slate-500">
          {routeState === 'loading' ? 'Loading the route map…' : 'No pickup or dropoff location yet.'}
        </p>
      )}

      {!compact && (
      <div className="pt-1">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Field timeline (phone)</div>
        {tripEvents.length === 0 ? (
          <p className="text-[11px] text-slate-400">Seal photos, parcel photos, pickup/delivery GPS, and signatures from the driver app land here with time stamps.</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {tripEvents.map((event) => (
              <div key={event.id} className="border border-slate-200 rounded-lg p-2.5 text-[11px] bg-slate-50/80">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    {event.photoUrl ? <Camera className="w-3 h-3 text-blue-600" /> : event.signatureDataUrl ? <PenTool className="w-3 h-3 text-indigo-600" /> : event.kind.startsWith('gps') ? <AlertTriangle className="w-3 h-3 text-rose-600" /> : <MapPin className="w-3 h-3 text-emerald-600" />}
                    {KIND_LABEL[event.kind] || event.kind}
                  </div>
                  <span className="text-slate-400 whitespace-nowrap">{formatWhen(event.createdAt)}</span>
                </div>
                <div className="text-slate-500 mt-0.5">
                  {event.actorName || 'Driver'}
                  {event.lat != null && event.lng != null && (
                    <>
                      {' · '}
                      <a className="text-blue-700 font-medium" href={mapsUrl(event.lat, event.lng)} target="_blank" rel="noreferrer">
                        {event.lat.toFixed(4)}, {event.lng.toFixed(4)}
                      </a>
                    </>
                  )}
                </div>
                {event.note && <p className="mt-1 text-slate-600">{event.note}</p>}
                {safeHttpsUrl(event.photoUrl) && (
                  <a href={safeHttpsUrl(event.photoUrl)} target="_blank" rel="noreferrer">
                    <img src={safeHttpsUrl(event.photoUrl)} alt={event.kind} className="mt-2 h-24 w-full object-cover rounded border border-slate-200" />
                  </a>
                )}
                {event.signatureDataUrl && (
                  <img src={event.signatureDataUrl} alt="Signature" className="mt-2 h-16 w-full object-contain bg-white rounded border border-slate-200" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      )}
    </div>
  );
};
