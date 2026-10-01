import React, { useMemo, useState } from 'react';
import { useFreight } from '../../context/FreightContext';
import {
  DETENTION_ESTIMATE_LABEL,
  buildContainerMonthReport,
  currentManilaMonth,
  formatEstimatedPeso,
  type ContainerReportGroup,
} from '../../lib/containerTracking';

function GroupTable({ title, rows }: { title: string; rows: ContainerReportGroup[] }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100">
        <h2 className="text-sm font-bold text-slate-900">{title}</h2>
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-xs text-slate-500">Nothing to summarize for this month.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-2">Group</th>
                <th className="px-4 py-2">Estimated detention</th>
                <th className="px-4 py-2">No-slot attempts</th>
                <th className="px-4 py-2">Avg queue minutes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.label}>
                  <td className="px-4 py-3 font-semibold text-slate-800">{row.label}</td>
                  <td className="px-4 py-3">
                    <div className="font-mono font-bold text-slate-900">{formatEstimatedPeso(row.estimatedDetentionPhp)}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5 max-w-[220px]">{DETENTION_ESTIMATE_LABEL}</div>
                  </td>
                  <td className="px-4 py-3 font-mono">{row.noSlotAttempts}</td>
                  <td className="px-4 py-3 font-mono">{row.averageQueueMinutes === null ? '—' : row.averageQueueMinutes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export const ContainerReturnReport: React.FC = () => {
  const { trips, company } = useFreight();
  const [monthKey, setMonthKey] = useState(currentManilaMonth);
  const report = useMemo(() => buildContainerMonthReport(trips, monthKey), [trips, monthKey]);

  if (!company.containerTrackingEnabled) return null;

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <div className="p-4 md:px-6 md:pt-6 md:pb-4 border-b border-slate-200 bg-white">
        <h1 className="text-xl font-bold text-slate-900">Container return summary</h1>
        <p className="text-xs text-slate-500 mt-1 max-w-2xl">
          Free-time estimates for container bookings only. Direct warehouse moves are not in this report. {DETENTION_ESTIMATE_LABEL}
        </p>
        <label className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
          Month
          <input
            type="month"
            value={monthKey}
            onChange={(e) => setMonthKey(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-2 py-1 font-mono"
          />
        </label>
      </div>
      <div className="p-4 md:p-6 space-y-4">
        <GroupTable title="By return depot" rows={report.byDepot} />
        <GroupTable title="By shipping line" rows={report.byShippingLine} />
      </div>
    </div>
  );
};
