import { useState } from 'react';
import { useFreight } from '../../context/FreightContext';
import type { Trip } from '../../types';

function money(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function CrewPayPanel({ trip }: { trip: Trip }) {
  const { updateTrip, currentUser, drivers } = useFreight();
  const helper = drivers.find((d) => d.id === trip.helperId);
  const pay = trip.crewPay;
  const [driverPay, setDriverPay] = useState(pay?.driverTripPayPhp ? String(pay.driverTripPayPhp) : '');
  const [driverFood, setDriverFood] = useState(pay?.driverFoodPhp ? String(pay.driverFoodPhp) : '');
  const [helperPay, setHelperPay] = useState(pay?.helperTripPayPhp ? String(pay.helperTripPayPhp) : '');
  const [helperFood, setHelperFood] = useState(pay?.helperFoodPhp ? String(pay.helperFoodPhp) : '');

  if (trip.status !== 'Delivered' && trip.status !== 'Invoiced' && !pay) return null;

  const save = () => {
    updateTrip(trip.id, {
      crewPay: {
        driverTripPayPhp: money(driverPay),
        driverFoodPhp: money(driverFood),
        helperTripPayPhp: helper ? money(helperPay) : 0,
        helperFoodPhp: helper ? money(helperFood) : 0,
        recordedAt: new Date().toISOString(),
        recordedBy: currentUser.name || currentUser.email,
      },
    });
  };

  return (
    <div className="md:col-span-2 bg-white border border-slate-200 rounded-xl p-4 space-y-3">
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-slate-700">What this trip owes the crew</div>
        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
          Save an amount here when this trip should differ from the person’s rate. Drivers &amp; Helpers adds the week from the rate, or from this amount when it is saved. It is not added to the customer’s bill, and it is not a payslip.
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <MoneyField label="Driver trip pay" value={driverPay} onChange={setDriverPay} />
        <MoneyField label="Driver food" value={driverFood} onChange={setDriverFood} />
        <MoneyField label="Helper trip pay" value={helperPay} onChange={setHelperPay} disabled={!helper} />
        <MoneyField label="Helper food" value={helperFood} onChange={setHelperFood} disabled={!helper} />
      </div>
      {!helper && (
        <p className="text-[11px] text-slate-500">No helper is assigned on this trip.</p>
      )}
      <button type="button" onClick={save} className="h-9 px-3 rounded-lg bg-slate-900 text-white text-xs font-bold">
        Save crew pay
      </button>
    </div>
  );
}

function MoneyField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="text-[11px] font-semibold text-slate-600">
      {label}
      <input
        type="number"
        min="0"
        step="0.01"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full h-9 bg-white border border-slate-200 rounded-lg px-2 text-xs font-mono text-slate-900 disabled:bg-slate-50"
      />
    </label>
  );
}
