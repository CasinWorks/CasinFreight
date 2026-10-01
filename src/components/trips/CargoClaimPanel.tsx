import { useState } from 'react';
import { useFreight } from '../../context/FreightContext';
import type { CargoClaimKind, CargoClaimStatus, Trip } from '../../types';

const KIND_LABEL: Record<CargoClaimKind, string> = {
  shortage: 'Shortage',
  damage: 'Damage',
  refusal: 'Customer refused the load',
};

export function CargoClaimPanel({ trip }: { trip: Trip }) {
  const { updateTrip, currentUser } = useFreight();
  const existing = trip.cargoClaim;
  const [kind, setKind] = useState<CargoClaimKind>(existing?.kind || 'shortage');
  const [note, setNote] = useState(existing?.note || '');
  const [outcome, setOutcome] = useState<CargoClaimStatus>(existing?.status || 'open');
  const [amount, setAmount] = useState(existing?.debitMemoPhp ? String(existing.debitMemoPhp) : '');

  if (trip.status !== 'Inbound' && trip.status !== 'Delivered' && trip.status !== 'Invoiced' && !existing) {
    return null;
  }

  const save = () => {
    const debit = Number(amount);
    if (outcome === 'debit_memo' && !(debit > 0)) {
      window.alert('Enter the debit memo amount in pesos.');
      return;
    }
    updateTrip(trip.id, {
      cargoClaim: {
        id: existing?.id || `claim-${Date.now()}`,
        kind,
        status: outcome,
        note: note.trim(),
        debitMemoPhp: outcome === 'debit_memo' ? debit : undefined,
        loggedAt: new Date().toISOString(),
        loggedBy: currentUser.name || currentUser.email,
      },
    });
  };

  return (
    <div className="md:col-span-2 bg-white border border-slate-200 rounded-xl p-4 space-y-3">
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-slate-700">Shortage, damage, or refusal</div>
        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
          A freight bill cannot be created while this is still open. A debit memo is deducted on the bill. Waived means the customer accepted it and there is no deduction.
        </p>
      </div>
      {existing?.status === 'open' && (
        <p className="text-[11px] font-semibold text-rose-800 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5">
          Open {KIND_LABEL[existing.kind].toLowerCase()}. Close it before invoicing.
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <label className="text-[11px] font-semibold text-slate-600">
          What happened
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as CargoClaimKind)}
            className="mt-1 w-full h-9 bg-white border border-slate-200 rounded-lg px-2 text-xs text-slate-900"
          >
            <option value="shortage">Shortage</option>
            <option value="damage">Damage</option>
            <option value="refusal">Customer refused the load</option>
          </select>
        </label>
        <label className="text-[11px] font-semibold text-slate-600">
          Outcome
          <select
            value={outcome}
            onChange={(e) => setOutcome(e.target.value as CargoClaimStatus)}
            className="mt-1 w-full h-9 bg-white border border-slate-200 rounded-lg px-2 text-xs text-slate-900"
          >
            <option value="open">Still open</option>
            <option value="debit_memo">Debit memo</option>
            <option value="waived">Waived — no charge</option>
          </select>
        </label>
        <label className="text-[11px] font-semibold text-slate-600">
          Debit memo (₱)
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={outcome !== 'debit_memo'}
            className="mt-1 w-full h-9 bg-white border border-slate-200 rounded-lg px-2 text-xs font-mono text-slate-900 disabled:bg-slate-50"
          />
        </label>
      </div>
      <label className="block text-[11px] font-semibold text-slate-600">
        Note
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. 4 cartons short at the Laguna warehouse"
          className="mt-1 w-full h-9 bg-white border border-slate-200 rounded-lg px-2 text-xs text-slate-900"
        />
      </label>
      <button
        type="button"
        onClick={save}
        className="h-9 px-3 rounded-lg bg-slate-900 text-white text-xs font-bold"
      >
        Save claim
      </button>
    </div>
  );
}
