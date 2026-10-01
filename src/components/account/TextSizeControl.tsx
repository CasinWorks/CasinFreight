import { useEffect, useState } from 'react';
import { applyTextSize, readTextSize, subscribeTextSize, type TextSizeId } from '../../lib/textSize';

const OPTIONS: { id: TextSizeId; label: string; sample: string }[] = [
  { id: 'normal', label: 'Normal', sample: '15px' },
  { id: 'large', label: 'Large', sample: '18px' },
  { id: 'xlarge', label: 'Extra large', sample: '22px' },
];

export function TextSizeControl() {
  const [size, setSize] = useState<TextSizeId>(readTextSize);

  useEffect(() => subscribeTextSize(setSize), []);

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
      <div>
        <div className="text-sm font-bold text-slate-900">Text size</div>
        <p className="text-sm text-slate-600 mt-0.5 leading-snug">
          Makes labels and fine print easier to read. Saved on this browser.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map((option) => {
          const selected = size === option.id;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={selected}
              onClick={() => applyTextSize(option.id)}
              className={`min-h-16 rounded-xl border px-2 py-2 text-center transition-colors ${
                selected
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white border-slate-200 text-slate-800 hover:border-blue-300'
              }`}
            >
              <span className="block font-bold leading-none" style={{ fontSize: option.sample }}>
                Aa
              </span>
              <span className={`block mt-1 text-xs font-semibold ${selected ? 'text-white' : 'text-slate-600'}`}>
                {option.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
