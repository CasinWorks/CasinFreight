import React, { useMemo, useState } from 'react';
import { useFreight } from '../../context/FreightContext';
import { formatPhp, statementDraft, statementLineForTrip, statementMonthLabel } from '../../lib/statementOfAccount';
import { manilaDateKey } from '../../lib/dispatchPapers';
import { StatementPreviewModal } from './StatementPreviewModal';
import type { Client, Invoice, StatementOfAccount, Trip } from '../../types';

interface StatementPanelProps {
  onOpenInvoice: (invoiceId: string) => void;
  onOpenTrip: (tripId: string) => void;
}

export const StatementPanel: React.FC<StatementPanelProps> = ({ onOpenInvoice, onOpenTrip }) => {
  const { clients, trips, invoices, statements, createStatement, removeStatement } = useFreight();
  const [clientId, setClientId] = useState('');
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState(() => manilaDateKey().slice(0, 7));
  const [openId, setOpenId] = useState<string | null>(null);
  const [openStatement, setOpenStatement] = useState<StatementOfAccount | null>(null);

  const shippers = useMemo(
    () => [...clients].sort((a, b) => a.name.localeCompare(b.name)),
    [clients]
  );

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return shippers
      .filter((client) => !clientId || client.id === clientId)
      .filter((client) => !query || client.name.toLowerCase().includes(query))
      .map((client) => {
        const draft = statementDraft(trips, statements, client.id, period);
        const saved = statements
          .filter((statement) => statement.clientId === client.id && statement.period === period)
          .sort((a, b) => a.statementNumber.localeCompare(b.statementNumber));
        return { client, draft, saved };
      })
      .filter((row) => clientId || row.saved.length > 0 || row.draft.included.length > 0 || row.draft.held.length > 0)
      .sort((a, b) => {
        const aHas = a.saved.length > 0 ? 0 : 1;
        const bHas = b.saved.length > 0 ? 0 : 1;
        return aHas - bHas || a.client.name.localeCompare(b.client.name);
      });
  }, [shippers, clientId, search, trips, statements, period]);

  const handleGenerate = (nextClientId: string) => {
    try {
      const statement = createStatement(nextClientId, period);
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
        <div className="font-bold text-slate-900 text-sm">Statements by shipper</div>
        <p className="text-[11px] text-slate-500 mt-0.5 max-w-2xl leading-relaxed">
          Each row is one company for {statementMonthLabel(period)}. Filter the month and the shipper above the list.
          A shortage, damage, or refusal that is still open stays off the statement. Trip bills stay.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="text-xs text-slate-600">
            <span className="block font-semibold mb-1">Month</span>
            <input
              type="month"
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
            />
          </label>
          <label className="text-xs text-slate-600 min-w-[220px] flex-1">
            <span className="block font-semibold mb-1">Company</span>
            <select
              value={clientId}
              onChange={(event) => setClientId(event.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
            >
              <option value="">All companies</option>
              {shippers.map((client) => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-600 min-w-[180px] flex-1">
            <span className="block font-semibold mb-1">Find a company</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Type a shipper name"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
            />
          </label>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="px-4 py-3 border-b border-slate-200 text-xs font-semibold text-slate-700">
          {rows.length} {rows.length === 1 ? 'company' : 'companies'} · {statementMonthLabel(period)}
        </div>
        {rows.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-slate-400">
            No company has a statement or a delivered trip in {statementMonthLabel(period)}.
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px]">
              <tr>
                <th className="py-2 px-4">Company</th>
                <th className="py-2 px-4">Statement</th>
                <th className="py-2 px-4 text-right">Trips</th>
                <th className="py-2 px-4 text-right">Amount due</th>
                <th className="py-2 px-4 text-right"> </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <CompanyRow
                  key={row.client.id}
                  client={row.client}
                  saved={row.saved}
                  included={row.draft.included}
                  heldCount={row.draft.held.length}
                  open={openId === row.client.id}
                  invoices={invoices}
                  onToggle={() => setOpenId(openId === row.client.id ? null : row.client.id)}
                  onOpenStatement={setOpenStatement}
                  onOpenTrip={onOpenTrip}
                  onGenerate={() => handleGenerate(row.client.id)}
                />
              ))}
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
};

const CompanyRow: React.FC<{
  client: Client;
  saved: StatementOfAccount[];
  included: Trip[];
  heldCount: number;
  open: boolean;
  invoices: Invoice[];
  onToggle: () => void;
  onOpenStatement: (statement: StatementOfAccount) => void;
  onOpenTrip: (tripId: string) => void;
  onGenerate: () => void;
}> = ({
  client,
  saved,
  included,
  heldCount,
  open,
  invoices,
  onToggle,
  onOpenStatement,
  onOpenTrip,
  onGenerate,
}) => {
  const amount = saved.reduce((sum, statement) => sum + statement.grandTotalPhp, 0);
  const tripsOnStatement = saved.reduce((sum, statement) => sum + statement.lines.length, 0);

  return (
    <>
      <tr className="hover:bg-slate-50 cursor-pointer" onClick={onToggle}>
        <td className="py-3 px-4 font-semibold text-slate-900">{client.name}</td>
        <td className="py-3 px-4" onClick={(event) => event.stopPropagation()}>
          {saved.length === 0 ? (
            <span className="text-slate-400">No statement yet</span>
          ) : (
            <div className="space-y-1">
              {saved.map((statement) => (
                <button
                  key={statement.id}
                  type="button"
                  onClick={() => onOpenStatement(statement)}
                  className="block font-mono font-bold text-blue-700 hover:underline"
                >
                  {statement.statementNumber}
                </button>
              ))}
            </div>
          )}
        </td>
        <td className="py-3 px-4 text-right font-mono">
          {saved.length > 0 ? tripsOnStatement : '—'}
          {included.length > 0 && (
            <div className="text-[10px] font-sans font-semibold text-amber-700">{included.length} waiting</div>
          )}
          {heldCount > 0 && (
            <div className="text-[10px] font-sans font-semibold text-rose-700">{heldCount} held</div>
          )}
        </td>
        <td className="py-3 px-4 text-right font-mono font-bold">
          {saved.length > 0 ? formatPhp(amount) : '—'}
        </td>
        <td className="py-3 px-4 text-right" onClick={(event) => event.stopPropagation()}>
          <div className="flex items-center justify-end gap-1.5">
            {saved.map((statement) => (
              <button
                key={statement.id}
                type="button"
                onClick={() => onOpenStatement(statement)}
                className="px-2.5 py-1 rounded bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200"
              >
                View
              </button>
            ))}
            {included.length > 0 && (
              <button
                type="button"
                onClick={onGenerate}
                className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
              >
                {saved.length > 0 ? `Add ${included.length}` : `Generate (${included.length})`}
              </button>
            )}
          </div>
        </td>
      </tr>
      {open && (
        <tr className="bg-slate-50">
          <td colSpan={5} className="px-4 py-3">
            {included.length === 0 ? (
              <div className="text-[11px] text-slate-500">
                {heldCount > 0
                  ? 'The remaining trips stay off the statement until the shortage, damage, or refusal is closed.'
                  : 'Every delivered trip for this month is already on a statement.'}
              </div>
            ) : (
              <div className="space-y-1">
                <div className="text-[10px] uppercase font-semibold text-slate-500">Trips that will go on the next statement</div>
                {included.map((trip) => {
                  const line = statementLineForTrip(trip, invoices);
                  return (
                    <div key={trip.id} className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                      <button type="button" onClick={() => onOpenTrip(trip.id)} className="font-mono font-bold text-blue-700 hover:underline">
                        {line.serviceDate || '—'} · {line.waybillNumber}
                      </button>
                      <span className="text-slate-600">{line.description}</span>
                      <span className="font-mono font-bold text-slate-900">{formatPhp(line.grandTotalPhp)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
};
