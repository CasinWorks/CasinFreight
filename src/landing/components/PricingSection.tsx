import React from 'react';
import { Check, Sparkles, Clock, ShieldCheck, ArrowRight, PhoneCall, HelpCircle } from 'lucide-react';
import { TextScale, LanguageMode } from '../types';

interface PricingSectionProps {
  textScale: TextScale;
  languageMode: LanguageMode;
  onOpenAuth: (mode: 'signin' | 'signup') => void;
}

export const PricingSection: React.FC<PricingSectionProps> = ({
  textScale,
  languageMode,
  onOpenAuth,
}) => {
  const isLarge = textScale === 'large';

  return (
    <section id="pricing" className="py-10 sm:py-24 bg-white border-b border-slate-200 scroll-mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-100 text-amber-900 text-xs sm:text-sm font-black">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>Special Founding Member Rate • Limited Until Dec 31, 2026</span>
          </div>

          <h2
            className={`font-black text-slate-900 tracking-tight font-display ${
              isLarge ? 'text-3xl sm:text-4xl lg:text-5xl' : 'text-2xl sm:text-3xl lg:text-4xl'
            }`}
          >
            {languageMode === 'en'
              ? 'Simple, Honest Pricing for Growing Trucking Fleets'
              : 'Malinaw at Abot-Kayang Presyo para sa Lahat'}
          </h2>

          <p className="text-slate-600 text-base sm:text-lg">
            {languageMode === 'en'
              ? 'Start 100% free for 30 days. No hidden software fees, no surprise setup charges.'
              : 'Subukan nang libre sa 30 araw. Walang nakatagong bayarin.'}
          </p>
        </div>

        {/* Pricing Card Grid */}
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
          {/* Plan 1: 1-Month Free Trial */}
          <div className="bg-slate-50 rounded-3xl p-6 sm:p-8 border-2 border-slate-200 flex flex-col justify-between shadow-xs">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="px-3 py-1 bg-slate-200 text-slate-800 rounded-lg text-xs font-black uppercase">
                  Zero Risk Test
                </span>
                <span className="text-xs font-bold text-slate-500">30 Days Full Access</span>
              </div>

              <div>
                <h3 className="text-2xl font-black text-slate-900">1-Month Free Trial</h3>
                <p className="text-xs text-slate-500 mt-1">Perfect to test with your drivers and staff</p>
              </div>

              <div className="flex items-baseline gap-1 text-slate-900">
                <span className="text-4xl font-black font-mono">₱0</span>
                <span className="text-slate-500 font-bold text-sm">/ first month</span>
              </div>

              <div className="pt-4 border-t border-slate-200 space-y-3 text-sm text-slate-700">
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Up to <strong>5 trucks included</strong></span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>10 test trips with digital e-POD</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>DPWH GVWR weight calculator</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>No credit card or commitment required</span>
                </div>
              </div>
            </div>

            <div className="pt-8">
              <button
                type="button"
                id="pricing-card-free-trial"
                onClick={() => onOpenAuth('signup')}
                className="w-full py-4 bg-white hover:bg-slate-100 border-2 border-slate-300 text-slate-900 font-extrabold text-base rounded-2xl transition-all cursor-pointer shadow-xs"
              >
                Start Free Trial →
              </button>
            </div>
          </div>

          {/* Plan 2: Founding Member Plan (Featured) */}
          <div className="bg-gradient-to-b from-blue-900 to-slate-950 text-white rounded-3xl p-6 sm:p-8 border-2 border-blue-500 flex flex-col justify-between shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-amber-400 text-amber-950 font-black text-xs px-4 py-1.5 rounded-bl-2xl uppercase tracking-wider">
              ⭐ Recommended Founding
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-blue-800 text-blue-200 rounded-lg text-xs font-black uppercase">
                  Lifetime Value Lock
                </span>
              </div>

              <div>
                <h3 className="text-2xl font-black text-white">Founding Member</h3>
                <p className="text-xs text-blue-200 mt-1">Includes 5 trucks allowance for your fleet</p>
              </div>

              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-4xl sm:text-5xl font-black font-mono text-emerald-400">₱899</span>
                  <span className="text-blue-200 font-bold text-sm">/ month for year 1</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Standard renewal after Year 1 is ₱1,599/mo (includes 5 trucks for life). +₱150/truck beyond 5.
                </p>
              </div>

              <div className="pt-4 border-t border-blue-800/80 space-y-3 text-sm text-blue-100">
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span><strong>5 Trucks included</strong> (+₱150/mo per extra truck)</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span><strong>Unlimited trips & electronic signatures</strong></span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>BIR 12% VAT + 2% EWT official PDF invoicing</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>DPWH & NLEX weighbridge compliance alerts</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Dedicated Manila phone & Viber priority support</span>
                </div>
              </div>
            </div>

            <div className="pt-8">
              <button
                type="button"
                id="pricing-card-founding-cta"
                onClick={() => onOpenAuth('signup')}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-950 font-black text-base rounded-2xl shadow-xl shadow-emerald-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Lock in Founding ₱899 Rate</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Founding Countdown Callout */}
        <div className="mt-8 max-w-2xl mx-auto text-center bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-center gap-2 text-xs sm:text-sm text-slate-700 font-medium">
          <Clock className="w-4 h-4 text-amber-600" />
          <span>Founding offer cutoff is Dec 31, 2026, 11:59 PM PH time. Rates increase after limit is reached.</span>
        </div>
      </div>
    </section>
  );
};
