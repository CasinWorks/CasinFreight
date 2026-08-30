import React, { useState } from 'react';
import { ChevronDown, CircleHelp } from 'lucide-react';
import { guideById } from '../../content/helpContent';

interface FeatureHowToProps {
  feature: string;
  compact?: boolean;
}

export const FeatureHowTo: React.FC<FeatureHowToProps> = ({ feature, compact = false }) => {
  const [open, setOpen] = useState(false);
  const guide = guideById(feature);
  if (!guide) return null;

  return (
    <div
      className={`rounded-xl border ${
        compact
          ? 'border-slate-200 bg-white'
          : 'border-blue-200 bg-blue-50/70'
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`w-full flex items-center gap-2 text-left ${compact ? 'px-2.5 py-1.5' : 'px-3 py-2'}`}
        aria-expanded={open}
      >
        <CircleHelp className={`shrink-0 ${compact ? 'w-3.5 h-3.5 text-blue-600' : 'w-4 h-4 text-blue-600'}`} />
        <span className={`font-bold text-blue-800 ${compact ? 'text-[11px]' : 'text-xs'}`}>How to</span>
        <span className={`min-w-0 flex-1 truncate font-medium text-slate-600 ${compact ? 'text-[11px]' : 'text-xs'}`}>
          {guide.summary}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${open ? '' : '-rotate-90'}`}
        />
      </button>
      {open && (
        <div className={`pb-3 ${compact ? 'px-2.5' : 'px-3'}`}>
          <ol className="list-decimal pl-4 space-y-1 text-[11px] text-slate-700">
            {guide.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          {guide.tips && guide.tips.length > 0 && (
            <ul className="mt-2 space-y-1 text-[11px] text-slate-500">
              {guide.tips.map((tip) => (
                <li key={tip}>• {tip}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
