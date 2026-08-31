import React from 'react';
import { Play, CheckCircle2, ArrowRight, Sparkles, Clock, ShieldCheck, HeartHandshake } from 'lucide-react';
import { IMAGES } from '../data/mockData';
import { TextScale, LanguageMode } from '../types';

interface HeroProps {
  textScale: TextScale;
  languageMode: LanguageMode;
  onOpenAuth: (mode: 'signin' | 'signup') => void;
  onOpenStoryModal: () => void;
  onOpenDemo: () => void;
}

export const Hero: React.FC<HeroProps> = ({
  textScale,
  languageMode,
  onOpenAuth,
  onOpenStoryModal,
  onOpenDemo,
}) => {
  const isLarge = textScale === 'large';

  return (
    <section className="relative overflow-hidden pt-5 pb-10 lg:pt-14 lg:pb-24 bg-gradient-to-b from-white via-slate-50/70 to-white border-b border-slate-200">
      {/* Background Subtle Geometric Glows for Premium Polish */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-100/50 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-10 left-10 w-80 h-80 bg-emerald-100/40 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Founding Member Offer Banner */}
        <div className="mb-8 max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-amber-50 via-amber-100/80 to-amber-50 border-2 border-amber-300/80 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm shrink-0">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-amber-950 text-base sm:text-lg">
                    ₱899/mo for your first year — includes 5 trucks.
                  </span>
                  <span className="hidden md:inline-block px-2.5 py-0.5 text-xs font-black bg-amber-400 text-amber-950 rounded-full">
                    FOUNDING OFFER
                  </span>
                </div>
                <p className="text-amber-900 text-sm font-medium flex items-center gap-1.5 mt-0.5">
                  <Clock className="w-4 h-4 text-amber-700" />
                  Founding pricing ends Dec 31, 2026 • Cut-off is Dec 31, 2026, 11:59 PM PH time
                </p>
              </div>
            </div>
            <button
              type="button"
              id="hero-claim-founding-button"
              onClick={() => onOpenAuth('signup')}
              className="w-full sm:w-auto px-5 py-2.5 bg-amber-950 hover:bg-black text-white font-bold text-sm rounded-xl transition-all shadow-xs shrink-0 cursor-pointer text-center"
            >
              Lock in ₱899 Rate →
            </button>
          </div>
        </div>

        {/* Hero Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Hero Content */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-sm font-bold shadow-2xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              {languageMode === 'en'
                ? 'Designed for Non-Tech Filipino Fleet Owners & Seniors'
                : 'Ginawa para sa mga May-ari ng Truck at Logistics Operators'}
            </div>

            <h1
              className={`font-black tracking-tight text-slate-900 leading-tight font-display ${
                isLarge ? 'text-3xl sm:text-5xl lg:text-6xl' : 'text-2xl sm:text-4xl lg:text-5xl'
              }`}
            >
              {languageMode === 'en' ? (
                <>
                  Full fleet ops.{' '}
                  <span className="text-blue-600 underline decoration-blue-200 decoration-wavy decoration-2">
                    One month free
                  </span>
                  , then Founding.
                </>
              ) : (
                <>
                  Pamahalaan ang trucking.{' '}
                  <span className="text-blue-600 underline decoration-blue-200 decoration-wavy decoration-2">
                    1 buwang libre
                  </span>
                  , walang sakit sa ulo.
                </>
              )}
            </h1>

            <p
              className={`text-slate-600 font-normal leading-relaxed ${
                isLarge ? 'text-xl sm:text-2xl' : 'text-lg sm:text-xl'
              }`}
            >
              {languageMode === 'en' ? (
                <>
                  Start free for 1 month: up to <strong>5 trucks, 1 account, 10 trips</strong>. ₱899/mo for your
                  first year — includes 5 trucks. After year 1: ₱1,599/mo, and you keep your 5-truck allowance for
                  life. +₱150/truck beyond 5.
                </>
              ) : (
                <>
                  Subukan ng 1 buwan nang libre: hanggang <strong>5 trucks, 1 account, 10 biyahe</strong>. ₱899/buwan
                  sa unang taon. Pagkatapos ng Year 1: ₱1,599/buwan, panatilihin ang 5-truck allowance habambuhay.
                  +₱150/truck lampas 5.
                </>
              )}
            </p>

            {/* 3 Senior-Friendly Guarantee Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <span className="text-sm font-bold text-slate-800 leading-snug">
                  {languageMode === 'en' ? 'DPWH Overload Fine Protection' : 'Iwas Huli sa DPWH Overload'}
                </span>
              </div>
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
                <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <span className="text-sm font-bold text-slate-800 leading-snug">
                  {languageMode === 'en' ? 'Digital e-POD (No Lost Papers)' : 'Pirma sa Phone (Walang Nawawalang Resibo)'}
                </span>
              </div>
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
                <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <span className="text-sm font-bold text-slate-800 leading-snug">
                  {languageMode === 'en' ? 'VAT + EWT calculator' : 'Kusang kwenta ng 12% VAT at 2% EWT'}
                </span>
              </div>
            </div>

            {/* BIG Senior-Friendly Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-4">
              <button
                type="button"
                id="hero-cta-free-trial"
                onClick={() => onOpenAuth('signup')}
                className={`flex items-center justify-center gap-3 rounded-2xl font-black text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-xl shadow-blue-600/30 hover:shadow-2xl hover:shadow-blue-600/40 transition-all cursor-pointer transform hover:-translate-y-0.5 ${
                  isLarge ? 'py-5 px-8 text-xl' : 'py-4.5 px-7 text-lg'
                }`}
              >
                <span>{languageMode === 'en' ? 'Start Free 1-Month Trial' : 'Subukan Libre sa 1 Buwan'}</span>
                <ArrowRight className="w-6 h-6 text-white" />
              </button>

              <button
                type="button"
                id="hero-cta-story-walkthrough"
                onClick={onOpenStoryModal}
                className={`flex items-center justify-center gap-3 rounded-2xl font-black text-slate-800 bg-white hover:bg-slate-100 active:bg-slate-200 border-2 border-slate-300 shadow-sm transition-all cursor-pointer ${
                  isLarge ? 'py-5 px-7 text-lg' : 'py-4.5 px-6 text-base'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700">
                  <Play className="w-4 h-4 fill-blue-700 ml-0.5" />
                </div>
                <span>{languageMode === 'en' ? 'Watch Story Tutorial' : 'Panoorin ang Tutorial'}</span>
              </button>
            </div>

            {/* Reassurance text */}
            <div className="flex items-center gap-4 text-xs sm:text-sm text-slate-500 font-medium pt-1">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                No credit card needed
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <HeartHandshake className="w-4 h-4 text-blue-600" />
                Free setup support by phone
              </span>
            </div>
          </div>

          {/* Right Hero Visual Card - High Quality Photography + Live Trust Elements */}
          <div className="lg:col-span-5">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              {/* Outer Glow Card */}
              <div className="relative rounded-3xl bg-white p-3 sm:p-4 shadow-2xl shadow-slate-300/60 border border-slate-200/90 overflow-hidden">
                {/* Real Friendly Owner Image */}
                <div className="relative rounded-2xl overflow-hidden aspect-4/3 bg-slate-100">
                  <img
                    src={IMAGES.heroOwner}
                    alt="Friendly Philippine Fleet Owner with blue trucks"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />

                  {/* On-Image Overlay Badge */}
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                      <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-300">
                        Manila • Bulacan • Batangas • Cebu
                      </span>
                    </div>
                    <p className="text-sm sm:text-base font-bold leading-tight drop-shadow-sm">
                      “Laking ginhawa sa opisina. Wala nang nawawalang delivery receipt, at alam agad kung safe sa timbang.”
                    </p>
                    <p className="text-xs text-slate-300 mt-1 font-medium">— Tito Ramon, 12-Truck Fleet Owner</p>
                  </div>
                </div>

                {/* Quick Interactive Demo Trigger Banner */}
                <div className="mt-3.5 p-3.5 bg-blue-50/80 rounded-xl border border-blue-200/80 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Play className="w-4 h-4 fill-white ml-0.5" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-blue-950">
                        {languageMode === 'en' ? 'Interactive 1-Minute Live Demo' : 'Subukan sa 1 Minuto'}
                      </p>
                      <p className="text-[11px] text-blue-700 font-medium">
                        {languageMode === 'en' ? 'Click to simulate a real delivery' : 'Pindutin para masubukan ang biyahe'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenDemo}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shrink-0"
                  >
                    Try Now →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
