import React, { useEffect, useState } from 'react';
import { Sparkles, X } from 'lucide-react';

const DISMISS_KEY = 'casinfreight_beta_popup_dismissed';

interface BetaPromoPopupProps {
  onJoin: () => void;
}

export const BetaPromoPopup: React.FC<BetaPromoPopupProps> = ({ onJoin }) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(DISMISS_KEY) === '1') return;
    if (new URLSearchParams(window.location.search).get('join') === '1') return;
    const timer = window.setTimeout(() => setOpen(true), 600);
    return () => window.clearTimeout(timer);
  }, []);

  if (!open) return null;

  const close = () => {
    sessionStorage.setItem(DISMISS_KEY, '1');
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-slate-950/75 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg max-h-[96dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-slate-950 text-white shadow-2xl border border-amber-400/40">
        <div className="absolute -top-16 -right-10 h-40 w-40 rounded-full bg-amber-400/30 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-blue-500/30 blur-3xl pointer-events-none" />
        <button
          type="button"
          onClick={close}
          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
          aria-label="Close beta offer"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="relative px-6 pt-6 pb-7 sm:px-8 sm:pt-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-400 text-amber-950 px-3 py-1 text-[11px] font-black tracking-wide">
            <Sparkles className="w-3.5 h-3.5" />
            BETA TESTER
          </div>
          <h2 className="mt-4 text-2xl sm:text-3xl font-black leading-tight">
            Free Premium until December 31, 2026
          </h2>
          <p className="mt-2 text-sm text-slate-300">
            Join the CasinFreight beta. The whole app is free Premium while you run your fleet with us. No payment — we are not collecting fees yet.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-slate-200">
            <li>Premium tools, free through the end of 2026</li>
            <li>January 1, 2027: your account becomes a Founder account</li>
            <li>After that, you can choose Premium. Still no payment until we are a registered business</li>
          </ul>
          <button
            type="button"
            onClick={() => {
              close();
              onJoin();
            }}
            className="mt-6 w-full py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-base"
          >
            Join as a Beta Tester
          </button>
          <button
            type="button"
            onClick={close}
            className="mt-2 w-full py-2 text-xs font-bold text-slate-400 hover:text-white"
          >
            Keep browsing
          </button>
        </div>
      </div>
    </div>
  );
};
