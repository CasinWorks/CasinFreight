import React, { useMemo, useState } from 'react';
import { FileStack } from 'lucide-react';
import { useFreight } from '../../context/FreightContext';
import { formatPhp, statementDraft, statementLineForTrip, statementMonthLabel } from '../../lib/statementOfAccount';
import { manilaDateKey } from '../../lib/dispatchPapers';
import { StatementPreviewModal } from './StatementPreviewModal';
import type { StatementOfAccount } from '../../types';

interface StatementPanelProps {
  onOpenInvoice: (invoiceId: string) => void;
  onOpenTrip: (tripId: string) => void;
}

export const StatementPanel: React.FC<StatementPanelProps> = ({ onOpenInvoice, onOpenTrip }) => {
  const { clients, trips, invoices, statements, createStatement, removeStatement } = useFreight();
  const [clientId, setClientId] = useState('');
  const [period, setPeriod] = useState(() => manilaDateKey().slice(0, 7));
  const [openStatement, setOpenStatement] = useState<StatementOfAccount | null>(null);

  const shippers = useMemo(
    () => [...clients].sort((a, b) => a.name.localeCompare(b.name)),
    [clients]
  );
  const draft = useMemo(
    () => (clientId ? statementDraft(trips, statements, clientId, period) : null),
    [clientId, trips, statements, period]
  );
  const saved = useMemo(
    () => statements
      .filter((statement) => (!clientId || statement.clientId === clientId) && statement.period === period)
      .sort((a, b) => b.statementNumber.localeCompare(a.statementNumber)),
    [statements, clientId, period]
  );

  const handleGenerate = () => {
    try {
      const statement = createStatement(clientId, period);
      setOpenStatement(statement);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not generate the statement.');
    }
  };

  const handleRemove = (id: string) => {
    const statement = statements.find((item) => item.id === id);
    const label = statement?.statementNumber || 'this statement';
    if (!window.confirm(`Remove ${label}? The trip bills stay. Those trips can go on a new statement.`)) return;
    removeStatement(id);
    setOpenStatement((current) => (current?.id === id ? null : current));
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <FileStack className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-slate-900 text-sm">One statement per shipper, per month</div>
            <p className="text-[11px] text-slate-500 mt-0.5 max-w-2xl leading-relaxed">
              Pulls every delivered or invoiced trip for that shipper in the month that is not already on a statement.
              Trip bills stay. A shortage, damage, or refusal that is still open stays off the statement.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="text-xs text-slate-600 min-w-[220px] flex-1">
            <span className="block font-semibold mb-1">Shipper</span>
            <select
              value={clientId}
              onChange={(event) => setClientId(event.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
            >
              <option value="">Select shipper</option>
              {shippers.map((client) => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-600">
            <span className="block font-semibold mb-1">Month</span>
            <input
              type="month"
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
            />
          </label>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!draft?.included.length}
            className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-500 text-white text-xs font-bold"
          >
            Generate statement{draft ? ` (${draft.included.length})` : ''}
          </button>
        </div>
      </div>

      {draft && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <div className="px-4 py-3 border-b border-slate-200 text-xs font-semibold text-slate-700">
            Trips that will go on the next statement
          </div>
          {draft.included.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-slate-400">
              Nothing waiting for {shippers.find((client) => client.id === clientId)?.name || 'this shipper'} in {statementMonthLabel(period)}.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px]">
                <tr>
                  <th className="py-2 px-4">Date</th>
                  <th className="py-2 px-4">Waybill</th>
                  <th className="py-2 px-4">Route</th>
                  <th className="py-2 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {draft.included.map((trip) => {
                  const line = statementLineForTrip(trip, invoices);
                  return (
                    <tr key={trip.id}>
                      <td className="py-2.5 px-4 font-mono text-slate-600">{line.serviceDate || '—'}</td>
                      <td className="py-2.5 px-4">
                        <button type="button" onClick={() => onOpenTrip(trip.id)} className="font-mono font-bold text-blue-700 hover:underline">
                          {line.waybillNumber}
                        </button>
                        {!line.invoiceNumber && (
                          <div className="text-[10px] text-slate-400">Freight bill not created yet</div>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-slate-700">{line.description}</td>
                      <td className="py-2.5 px-4 text-right font-mono">{formatPhp(line.grandTotalPhp)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {draft.held.length > 0 && (
            <div className="border-t border-amber-200 bg-amber-50 px-4 py-3 text-[11px] text-amber-950 space-y-1">
              <div className="font-bold">Held until the claim is closed</div>
              {draft.held.map(({ trip }) => (
                <div key={trip.id} className="font-mono">{trip.waybillNumber} · close the shortage, damage, or refusal before it can go on a statement</div>
              ))}
            </div>
          )}
          {draft.alreadyListed.length > 0 && (
            <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-[11px] text-slate-600 space-y-1">
              <div className="font-bold text-slate-800">Already on a statement</div>
              {draft.alreadyListed.map(({ trip, statement }) => (
                <button
                  key={trip.id}
                  type="button"
                  onClick={() => setOpenStatement(statement)}
                  className="block font-mono text-blue-700 hover:underline"
                >
                  {trip.waybillNumber} · {statement.statementNumber}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="px-4 py-3 border-b border-slate-200 text-xs font-semibold text-slate-700">
          Statements for {statementMonthLabel(period)}
        </div>
        {saved.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-slate-400">No statement saved for this month yet.</div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px]">
              <tr>
                <th className="py-2 px-4">Statement</th>
                <th className="py-2 px-4">Shipper</th>
                <th className="py-2 px-4">Trips</th>
                <th className="py-2 px-4 text-right">Amount due</th>
                <th className="py-2 px-4 text-right"> </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {saved.map((statement) => {
                const client = clients.find((item) => item.id === statement.clientId);
                return (
                  <tr key={statement.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold text-blue-700">{statement.statementNumber}</td>
                    <td className="py-3 px-4">{client?.name}</td>
                    <td className="py-3 px-4">{statement.lines.length}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold">{formatPhp(statement.grandTotalPhp)}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setOpenStatement(statement)}
                        className="px-2.5 py-1 rounded bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {openStatement && (
        <StatementPreviewModal
          statement={openStatement}
          onClose={() => setOpenStatement(null)}
          onOpenInvoice={onOpenInvoice}
          onOpenTrip={onOpenTrip}
          onRemove={handleRemove}
        />
      )}
    </div>
  );
}
