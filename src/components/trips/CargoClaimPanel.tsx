import { useEffect, useState } from 'react';
import { useFreight } from '../../context/FreightContext';
import { claimKindForCondition } from '../../lib/cargoClaim';
import type { CargoClaim, CargoClaimKind, Trip } from '../../types';

const KIND_LABEL: Record<CargoClaimKind, string> = {
  shortage: 'Shortage',
  damage: 'Damage',
  refusal: 'Customer refused the load',
};

function peso(value: number): string {
  return `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function savedLine(claim: CargoClaim | undefined, podKind: CargoClaimKind | null): { tone: string; title: string; detail: string } {
  if (!claim && podKind) {
    return {
      tone: 'bg-rose-50 border-rose-200 text-rose-950',
      title: `${KIND_LABEL[podKind]} is on the proof of delivery`,
      detail: 'Waive it or enter a deduction before the freight bill can be created.',
    };
  }
  if (!claim) {
    return {
      tone: 'bg-slate-50 border-slate-200 text-slate-700',
      title: 'No claim on this trip',
      detail: 'The freight bill is not held by a shortage, damage, or refusal.',
    };
  }
  const who = claim.loggedBy ? ` Saved by ${claim.loggedBy}.` : '';
  if (claim.status === 'waived') {
    return {
      tone: 'bg-emerald-50 border-emerald-200 text-emerald-950',
      title: `${KIND_LABEL[claim.kind]} waived`,
      detail: `Nothing is deducted. You can create the freight bill.${who}`,
    };
  }
  if (claim.status === 'debit_memo') {
    return {
      tone: 'bg-amber-50 border-amber-200 text-amber-950',
      title: `${KIND_LABEL[claim.kind]} · debit memo ${peso(Number(claim.debitMemoPhp) || 0)}`,
      detail: `That amount is deducted when the freight bill is created.${who}`,
    };
  }
  return {
    tone: 'bg-rose-50 border-rose-200 text-rose-950',
    title: `Open ${KIND_LABEL[claim.kind].toLowerCase()}`,
    detail: `The freight bill stays blocked until you waive this or enter a debit memo.${who}`,
  };
}

export function CargoClaimPanel({ trip }: { trip: Trip }) {
  const { updateTrip, currentUser } = useFreight();
  const existing = trip.cargoClaim;
  const [kind, setKind] = useState<CargoClaimKind>(existing?.kind || 'shortage');
  const [note, setNote] = useState(existing?.note || '');
  const [amount, setAmount] = useState(existing?.debitMemoPhp ? String(existing.debitMemoPhp) : '');
  const [showDebit, setShowDebit] = useState(existing?.status === 'debit_memo');

  useEffect(() => {
    setKind(existing?.kind || 'shortage');
    setNote(existing?.note || '');
    setAmount(existing?.debitMemoPhp ? String(existing.debitMemoPhp) : '');
    setShowDebit(existing?.status === 'debit_memo');
  }, [existing?.id, existing?.status, existing?.kind, existing?.debitMemoPhp, existing?.note]);

  if (trip.status !== 'Inbound' && trip.status !== 'Delivered' && trip.status !== 'Invoiced' && !existing) {
    return null;
  }

  const status = savedLine(existing, claimKindForCondition(trip.pod?.conditionStatus));

  const write = (status: CargoClaim['status'], debitMemoPhp?: number) => {
    updateTrip(trip.id, {
      cargoClaim: {
        id: existing?.id || `claim-${Date.now()}`,
        kind,
        status,
        note: note.trim(),
        debitMemoPhp,
        loggedAt: new Date().toISOString(),
        loggedBy: currentUser.name || currentUser.email,
      },
    });
  };

  const saveDebit = () => {
    const debit = Number(amount);
    if (!(debit > 0)) {
      window.alert('Enter the debit memo amount in pesos.');
      return;
    }
    write('debit_memo', debit);
  };

  return (
    <div className="md:col-span-2 bg-white border border-slate-200 rounded-xl p-4 space-y-3">
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-slate-700">Shortage, damage, or refusal</div>
        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
          Choose one result. The box above the buttons is what is saved on this trip.
        </p>
      </div>

      <div className={`rounded-lg border px-3 py-2 ${status.tone}`}>
        <div className="text-xs font-bold">{status.title}</div>
        <p className="text-[11px] mt-0.5 leading-relaxed">{status.detail}</p>
        {existing?.note ? <p className="text-[11px] mt-1">Note: {existing.note}</p> : null}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
          Note
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. 4 cartons short at the Laguna warehouse"
            className="mt-1 w-full h-9 bg-white border border-slate-200 rounded-lg px-2 text-xs text-slate-900"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => write('waived')}
          className="h-9 px-3 rounded-lg bg-emerald-700 text-white text-xs font-bold"
        >
          Waive — no deduction
        </button>
        <button
          type="button"
          onClick={() => setShowDebit(true)}
          className="h-9 px-3 rounded-lg bg-slate-900 text-white text-xs font-bold"
        >
          Deduct on the bill
        </button>
        {existing && (
          <button
            type="button"
            onClick={() => {
              if (!window.confirm('Remove this claim from the trip? Nothing will be deducted.')) return;
              updateTrip(trip.id, { cargoClaim: undefined });
            }}
            className="h-9 px-3 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-semibold"
          >
            Remove claim
          </button>
        )}
      </div>

      {showDebit && (
        <div className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <label className="text-[11px] font-semibold text-slate-600">
            Amount to deduct (₱)
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 w-40 h-9 bg-white border border-slate-200 rounded-lg px-2 text-xs font-mono text-slate-900"
            />
          </label>
          <button
            type="button"
            onClick={saveDebit}
            className="h-9 px-3 rounded-lg bg-slate-900 text-white text-xs font-bold"
          >
            Save deduction
          </button>
        </div>
      )}
    </div>
  );
}
