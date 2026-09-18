import React, { useState } from 'react';
import { ChevronDown, CircleHelp, Sparkles } from 'lucide-react';
import { guideById, tutorialStepForGuide } from '../../content/helpContent';
import { useTutorial } from '../tutorial';

interface FeatureHowToProps {
  feature: string;
  compact?: boolean;
}

export const FeatureHowTo: React.FC<FeatureHowToProps> = ({ feature, compact = false }) => {
  const [open, setOpen] = useState(false);
  const guide = guideById(feature);
  const { startTutorialAt } = useTutorial();
  if (!guide) return null;

  const stepId = tutorialStepForGuide(feature);

  const showOnScreen = () => {
    if (!stepId) return;
    setOpen(false);
    window.setTimeout(() => startTutorialAt(stepId, { single: true }), 80);
  };

  return (
    <div
      data-tutorial={`howto-${feature}`}
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
          {stepId && (
            <button
              type="button"
              onClick={showOnScreen}
              className={`mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold ${
                compact ? 'px-2 py-1 text-[10px]' : 'px-2.5 py-1.5 text-[11px]'
              }`}
            >
              <Sparkles className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
              Show on screen
            </button>
          )}
        </div>
      )}
    </div>
  );
};
