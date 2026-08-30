import React from 'react';
import { AlertTriangle, Camera, MapPin, Navigation, PenTool, Radio, ShieldAlert } from 'lucide-react';
import { FieldEvent, FieldEventKind, LiveTracking } from '../../types';
import { safeHttpsUrl } from '../../lib/safeUrl';

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
}

export const LiveTrackingPanel: React.FC<LiveTrackingPanelProps> = ({ tripId, tracking, events }) => {
  const tripEvents = events
    .filter((event) => event.tripId === tripId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const stale = tracking?.updatedAt
    ? Date.now() - new Date(tracking.updatedAt).getTime() > 3 * 60 * 1000
    : true;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-2xs">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <div className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
          <Radio className={`w-4 h-4 ${tracking?.gpsEnabled && !stale ? 'text-emerald-600' : 'text-slate-400'}`} />
          <span>Driver app · live GPS & field captures</span>
        </div>
        {tracking && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
            !tracking.gpsEnabled || tracking.isMocked
              ? 'bg-rose-50 text-rose-700 border-rose-200'
              : stale
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}>
            {!tracking.gpsEnabled ? 'GPS off' : tracking.isMocked ? 'Fake GPS' : stale ? 'Stale ping' : 'Live'}
          </span>
        )}
      </div>

      {!tracking ? (
        <p className="text-[11px] text-slate-500">
          No driver-app ping yet. When the assigned driver opens CasinFreight Driver with GPS on, the truck appears here.
        </p>
      ) : (
        <div className="space-y-2">
          {(!tracking.gpsEnabled || tracking.isMocked) && (
            <div className="flex items-start gap-2 text-[11px] bg-rose-50 border border-rose-200 text-rose-800 rounded-lg p-2">
              <ShieldAlert className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>
                {tracking.isMocked
                  ? 'Mock location app detected. Treat this ping as untrusted.'
                  : `GPS was disabled on the phone${tracking.gpsDisabledAt ? ` at ${formatWhen(tracking.gpsDisabledAt)}` : ''}. The driver app blocks photos and signatures until GPS is back on.`}
              </span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Last ping</div>
              <div className="font-semibold text-slate-900 mt-0.5">{formatWhen(tracking.updatedAt)}</div>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Speed / accuracy</div>
              <div className="font-semibold text-slate-900 mt-0.5">
                {tracking.speedKmh != null ? `${tracking.speedKmh.toFixed(0)} km/h` : '—'} · ±{tracking.accuracyM != null ? Math.round(tracking.accuracyM) : '—'} m
              </div>
            </div>
          </div>
          {tracking.lat != null && tracking.lng != null && (
            <>
          <a
            href={mapsUrl(tracking.lat, tracking.lng)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between gap-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 hover:bg-blue-100"
          >
            <span className="flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5" />
              {tracking.lat.toFixed(5)}, {tracking.lng.toFixed(5)}
            </span>
            <span>Open map</span>
          </a>
          <iframe
            title="Live truck map"
            className="w-full h-44 rounded-lg border border-slate-200"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${tracking.lng - 0.02}%2C${tracking.lat - 0.02}%2C${tracking.lng + 0.02}%2C${tracking.lat + 0.02}&layer=mapnik&marker=${tracking.lat}%2C${tracking.lng}`}
          />
            </>
          )}
        </div>
      )}

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
    </div>
  );
};
