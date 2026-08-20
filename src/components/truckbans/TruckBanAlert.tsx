import React from 'react';
import { AlertTriangle, Clock, MapPin } from 'lucide-react';
import { TruckBan, TruckBanWindow } from '../../types';
import { formatBanDays, formatBanWindows, TruckBanHit, uniqueBansFromHits } from '../../lib/truckBans';

interface TruckBanAlertProps {
  hits: TruckBanHit[];
  compact?: boolean;
}

function windowLabel(window: TruckBanWindow): string {
  return `${window.startTime}–${window.endTime}`;
}

export const TruckBanAlert: React.FC<TruckBanAlertProps> = ({ hits, compact }) => {
  if (hits.length === 0) return null;
  const bans = uniqueBansFromHits(hits);

  return (
    <div className={`rounded-lg border border-amber-200 bg-amber-50 ${compact ? 'p-2.5' : 'p-3'} text-xs`}>
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="font-bold text-amber-900">
            Truck ban on this corridor
          </div>
          <p className="text-[11px] text-amber-800/80 mt-0.5">
            Pickup or delivery falls inside a recorded ban window. Reroute, use window hours, or wait it out.
          </p>
          <ul className="mt-2 space-y-1.5">
            {bans.map((ban) => (
              <li key={ban.id} className="text-amber-950">
                <span className="font-semibold">{ban.name}</span>
                <span className="text-amber-800">
                  {' · '}
                  {ban.area}
                  {ban.cityOrLgu ? ` · ${ban.cityOrLgu}` : ''}
                  {' · '}
                  {formatBanDays(ban.days)} {formatBanWindows(ban.windows)}
                </span>
                {ban.exemptionNote && (
                  <div className="text-[11px] text-amber-800/90 mt-0.5">{ban.exemptionNote}</div>
                )}
              </li>
            ))}
          </ul>
          {!compact && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {hits.slice(0, 4).map((hit, index) => (
                <span
                  key={`${hit.ban.id}-${hit.where}-${hit.when}-${index}`}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white border border-amber-200 text-[10px] font-medium text-amber-800"
                >
                  {hit.where === 'origin' ? <MapPin className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                  {hit.where} {hit.when} {windowLabel(hit.window)}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export function banSummary(ban: TruckBan): string {
  return `${ban.area} · ${formatBanDays(ban.days)} · ${formatBanWindows(ban.windows)}`;
}
