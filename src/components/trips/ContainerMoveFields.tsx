import React from 'react';
import {
  CONTAINER_SIZES,
  DETENTION_ESTIMATE_LABEL,
  type ContainerDraft,
  computeReturnBy,
  lookupContainerRateDefault,
  patchContainerDraft,
} from '../../lib/containerTracking';
import type { ContainerRateDefault } from '../../types';

interface ContainerMoveFieldsProps {
  draft: ContainerDraft;
  onChange: (next: ContainerDraft) => void;
  suggestions: string[];
  rateDefaults?: ContainerRateDefault[];
  idPrefix?: string;
}

export const ContainerMoveFields: React.FC<ContainerMoveFieldsProps> = ({
  draft,
  onChange,
  suggestions,
  rateDefaults,
  idPrefix = 'container',
}) => {
  const update = (patch: Partial<ContainerDraft>) => {
    let next = patchContainerDraft(draft, patch);
    const identityChanged =
      (patch.shippingLine !== undefined && patch.shippingLine !== draft.shippingLine) ||
      (patch.containerSize !== undefined && patch.containerSize !== draft.containerSize);
    if (identityChanged && draft.detentionRatePerDay.trim() === '' && next.detentionRatePerDay.trim() === '') {
      const remembered = lookupContainerRateDefault(rateDefaults, next.shippingLine, next.containerSize);
      if (remembered !== undefined) next = { ...next, detentionRatePerDay: String(remembered) };
    }
    onChange(next);
  };
  const computed =
    draft.freeTimeStartDate && draft.freeTimeDays.trim() !== ''
      ? computeReturnBy(draft.freeTimeStartDate, Number(draft.freeTimeDays))
      : '';
  const listId = `${idPrefix}-shipping-lines`;

  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 space-y-3">
      <div>
        <div className="text-xs font-bold text-slate-800">Container return</div>
        <p className="text-[11px] text-slate-500 mt-0.5">
          All of this is optional. Leaving it blank still saves, dispatches, and invoices the booking. {DETENTION_ESTIMATE_LABEL}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="block">
          <span className="block text-xs font-semibold text-slate-700 mb-1">Container no.</span>
          <input
            value={draft.containerNo}
            onChange={(e) => update({ containerNo: e.target.value })}
            placeholder="e.g. TCLU 123456 7"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500"
          />
        </label>
        <label className="block">
          <span className="block text-xs font-semibold text-slate-700 mb-1">Shipping line</span>
          <input
            list={listId}
            value={draft.shippingLine}
            onChange={(e) => update({ shippingLine: e.target.value })}
            placeholder="Type any line"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500"
          />
          <datalist id={listId}>
            {suggestions.map((line) => (
              <option key={line} value={line} />
            ))}
          </datalist>
        </label>
        <label className="block">
          <span className="block text-xs font-semibold text-slate-700 mb-1">Size</span>
          <select
            value={draft.containerSize}
            onChange={(e) =>
              update({ containerSize: e.target.value as ContainerDraft['containerSize'] })
            }
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500"
          >
            <option value="">Not set</option>
            {CONTAINER_SIZES.map((size) => (
              <option key={size} value={size}>
                {size === 'other' ? 'Other' : size}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <label className="block">
          <span className="block text-xs font-semibold text-slate-700 mb-1">Pickup date</span>
          <input
            type="date"
            value={draft.pickupDate}
            onChange={(e) => update({ pickupDate: e.target.value })}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500"
          />
        </label>
        <label className="block">
          <span className="block text-xs font-semibold text-slate-700 mb-1">Free-time days</span>
          <input
            type="number"
            min="0"
            step="1"
            value={draft.freeTimeDays}
            onChange={(e) => update({ freeTimeDays: e.target.value })}
            placeholder="You enter this"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500"
          />
        </label>
        <label className="block">
          <span className="block text-xs font-semibold text-slate-700 mb-1">Free time starts</span>
          <input
            type="date"
            value={draft.freeTimeStartDate}
            onChange={(e) => update({ freeTimeStartDate: e.target.value })}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500"
          />
        </label>
        <label className="block">
          <span className="block text-xs font-semibold text-slate-700 mb-1">Return by</span>
          <input
            type="date"
            value={draft.returnBy}
            onChange={(e) => update({ returnBy: e.target.value })}
            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500"
          />
          <span className="block text-[10px] text-slate-500 mt-1">
            {draft.returnByOverridden
              ? 'You typed this date.'
              : computed
                ? `Computed: start date + ${draft.freeTimeDays || 0} day${draft.freeTimeDays === '1' ? '' : 's'}.`
                : 'Fills in from the start date plus free-time days.'}
            {draft.returnByOverridden && (
              <button
                type="button"
                onClick={() => update({ returnByOverridden: false })}
                className="ml-1 text-blue-700 font-semibold hover:underline"
              >
                Use computed date
              </button>
            )}
          </span>
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="block text-xs font-semibold text-slate-700 mb-1">Return depot</span>
          <input
            value={draft.returnDepot}
            onChange={(e) => update({ returnDepot: e.target.value })}
            placeholder="Depot or yard name"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500"
          />
        </label>
        <label className="block">
          <span className="block text-xs font-semibold text-slate-700 mb-1">Detention rate (₱ / day)</span>
          <input
            type="number"
            min="0"
            step="any"
            value={draft.detentionRatePerDay}
            onChange={(e) => update({ detentionRatePerDay: e.target.value })}
            placeholder="You enter this"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500"
          />
        </label>
      </div>

      <label className="flex items-start gap-2 text-[11px] text-slate-600">
        <input
          type="checkbox"
          checked={draft.saveRateDefault}
          onChange={(e) => onChange({ ...draft, saveRateDefault: e.target.checked })}
          className="mt-0.5"
        />
        <span>Remember this peso rate for this shipping line and size on the next container booking. It is only a shortcut, not the line’s official tariff.</span>
      </label>
    </div>
  );
};
