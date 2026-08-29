import React from 'react';
import { Sparkles } from 'lucide-react';
import {
  foundingEligibilityEnd,
  foundingUrgencyCopy,
  isFoundingSignupOpen,
} from '../../lib/subscriptionPrice';

export const FoundingUrgencyBanner: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    if (!isFoundingSignupOpen()) return undefined;
    const timer = window.setInterval(() => setTick((n) => n + 1), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  if (!isFoundingSignupOpen()) return null;

  const ms = foundingEligibilityEnd().getTime() - Date.now();
  const days = Math.max(0, Math.ceil(ms / 86_400_000));

  return (
    <div className={`rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 ${className}`}>
      <div className="flex items-start gap-2">
        <Sparkles className="w-3.5 h-3.5 text-amber-700 mt-0.5 shrink-0" />
        <div>
          <p className="text-[11px] font-extrabold text-amber-950">{foundingUrgencyCopy()}</p>
          <p className="text-[10px] text-amber-800 mt-0.5">
            {days} day{days === 1 ? '' : 's'} left · cutoff is Dec 31, 2026, 11:59 PM PH time.
          </p>
        </div>
      </div>
    </div>
  );
};
