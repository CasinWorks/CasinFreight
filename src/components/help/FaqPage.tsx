import React, { useState } from 'react';
import { ArrowLeft, CircleHelp, HelpCircle } from 'lucide-react';
import { CasinFreightLogo } from '../brand/CasinFreightLogo';
import { CasinWorksCredit } from '../brand/CasinWorksCredit';
import { FAQ_ITEMS, FEATURE_HIGHLIGHTS } from '../../content/helpContent';

interface FaqPageProps {
  onBack: () => void;
}

export const FaqPage: React.FC<FaqPageProps> = ({ onBack }) => {
  const [openId, setOpenId] = useState<string | null>(FAQ_ITEMS[0]?.id ?? null);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="px-6 py-4 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/80 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <CasinFreightLogo className="h-10 w-10 rounded-xl" />
          <div>
            <div className="font-extrabold text-base tracking-tight text-white">CasinFreight</div>
            <div className="text-[11px] text-slate-400">FAQ & features</div>
          </div>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-300 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to landing
        </button>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 space-y-8">
        <div>
          <div className="inline-flex items-center gap-2 text-blue-400 text-xs font-bold uppercase tracking-wider">
            <HelpCircle className="w-4 h-4" />
            Philippine trucking SaaS
          </div>
          <h1 className="text-2xl font-extrabold text-white mt-2">Features & frequently asked questions</h1>
          <p className="text-sm text-slate-400 mt-2">
            Office web app for dispatch, billing, and books. Driver phone app for seals and e-POD.
            This is fleet software for your own trucks — not a public load board.
          </p>
        </div>

        <section>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">What you get</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FEATURE_HIGHLIGHTS.map((item) => (
              <div key={item.title} className="rounded-xl border border-slate-800 bg-slate-900/70 p-3.5">
                <div className="text-sm font-bold text-white">{item.title}</div>
                <p className="text-[12px] text-slate-400 mt-1">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">FAQ</h2>
          <div className="space-y-2">
            {FAQ_ITEMS.map((item) => {
              const open = openId === item.id;
              return (
                <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-900/70 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : item.id)}
                    className="w-full flex items-center gap-2 px-3.5 py-3 text-left"
                    aria-expanded={open}
                  >
                    <CircleHelp className="w-4 h-4 text-blue-400 shrink-0" />
                    <span className="flex-1 text-sm font-semibold text-white">{item.question}</span>
                    <span className="text-slate-500 text-xs">{open ? '−' : '+'}</span>
                  </button>
                  {open && <p className="px-3.5 pb-3 text-[13px] text-slate-300 leading-relaxed">{item.answer}</p>}
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="px-6 py-4 border-t border-slate-800/80">
        <CasinWorksCredit className="text-center text-[11px] text-slate-400" />
      </footer>
    </div>
  );
};
