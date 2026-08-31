import React, { useState } from 'react';
import { Calculator, TrendingUp, ShieldCheck, DollarSign, ArrowRight, CheckCircle2 } from 'lucide-react';
import { TextScale, LanguageMode } from '../types';

interface SavingsCalculatorProps {
  textScale: TextScale;
  languageMode: LanguageMode;
  onOpenAuth: (mode: 'signin' | 'signup') => void;
}

export const SavingsCalculator: React.FC<SavingsCalculatorProps> = ({
  textScale,
  languageMode,
  onOpenAuth,
}) => {
  const [truckCount, setTruckCount] = useState(5);
  const [avgTripsPerTruck, setAvgTripsPerTruck] = useState(12);

  const totalTrips = truckCount * avgTripsPerTruck;
  // Estimated estimated savings:
  // 1. Overload fines prevented (estimated 1 violation avoided every 3 months = ~₱6,500/mo)
  const overloadSavings = Math.round(truckCount * 1300);
  // 2. Faster cashflow & billing admin labor savings (~₱1,500 per truck/mo)
  const adminSavings = Math.round(truckCount * 1800);
  // 3. Fuel & unlogged trips leak reduction (~₱2,400 per truck/mo)
  const fuelSavings = Math.round(truckCount * 2400);

  const totalEstimatedMonthlySavings = overloadSavings + adminSavings + fuelSavings;
  const casinFreightCost = truckCount <= 5 ? 899 : 899 + (truckCount - 5) * 150;
  const netMonthlyBenefit = totalEstimatedMonthlySavings - casinFreightCost;

  const isLarge = textScale === 'large';

  return (
    <section id="calculator" className="py-10 sm:py-24 bg-slate-50 border-b border-slate-200 scroll-mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100 text-blue-900 text-xs sm:text-sm font-bold">
            <Calculator className="w-4 h-4 text-blue-700" />
            <span>
              {languageMode === 'en' ? 'Fleet ROI & Savings Calculator' : 'Kalkulahin ang Matitipid ng Iyong Kompanya'}
            </span>
          </div>

          <h2
            className={`font-black text-slate-900 tracking-tight font-display ${
              isLarge ? 'text-3xl sm:text-4xl lg:text-5xl' : 'text-2xl sm:text-3xl lg:text-4xl'
            }`}
          >
            {languageMode === 'en'
              ? 'See How Much Money & Time You Save Each Month'
              : 'Tingnan ang Halaga ng Pera at Oras na Maibabalik sa Iyo'}
          </h2>

          <p className="text-slate-600 text-base sm:text-lg">
            {languageMode === 'en'
              ? 'Move the slider below to match your fleet size. See the direct impact on your bottom line.'
              : 'I-adjust ang dami ng iyong truck para makita ang eksaktong tipid sa buwanang gastos.'}
          </p>
        </div>

        {/* Calculator Main Box */}
        <div className="max-w-5xl mx-auto bg-white rounded-3xl p-6 sm:p-10 border-2 border-slate-200 shadow-xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Sliders (Left Column) */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-black text-slate-900">
                  Number of Trucks in Your Fleet:
                </label>
                <span className="px-3.5 py-1 bg-blue-600 text-white font-black text-lg rounded-xl shadow-xs">
                  {truckCount} Trucks
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={30}
                value={truckCount}
                onChange={(e) => setTruckCount(Number(e.target.value))}
                className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-xs text-slate-400 font-bold mt-1">
                <span>1 Truck</span>
                <span>10 Trucks</span>
                <span>20 Trucks</span>
                <span>30+ Trucks</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-black text-slate-900">
                  Average Trips per Month per Truck:
                </label>
                <span className="px-3.5 py-1 bg-slate-800 text-white font-bold text-base rounded-xl">
                  {avgTripsPerTruck} Trips/truck
                </span>
              </div>
              <input
                type="range"
                min={2}
                max={30}
                value={avgTripsPerTruck}
                onChange={(e) => setAvgTripsPerTruck(Number(e.target.value))}
                className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-700"
              />
              <p className="text-xs text-slate-500 font-medium mt-1">
                Total Fleet Volume: <strong>{totalTrips} monthly trips</strong> managed with zero lost paperwork.
              </p>
            </div>

            {/* Breakdown item list */}
            <div className="pt-4 border-t border-slate-200 space-y-2.5 text-sm">
              <div className="flex justify-between items-center text-slate-700">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>DPWH & MMDA overload fine prevention:</span>
                </span>
                <span className="font-bold text-slate-900 font-mono">~₱{overloadSavings.toLocaleString()}/mo</span>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Eliminating lost paper receipts & faster client collection:</span>
                </span>
                <span className="font-bold text-slate-900 font-mono">~₱{adminSavings.toLocaleString()}/mo</span>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Fuel leakage & unauthorized trip reduction:</span>
                </span>
                <span className="font-bold text-slate-900 font-mono">~₱{fuelSavings.toLocaleString()}/mo</span>
              </div>
            </div>
          </div>

          {/* Results Summary Box (Right Column) */}
          <div className="lg:col-span-5 bg-gradient-to-br from-blue-900 via-blue-950 to-slate-950 text-white p-6 sm:p-8 rounded-3xl shadow-2xl space-y-6 text-left relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

            <div>
              <span className="text-xs font-black uppercase tracking-widest text-blue-300">
                Estimated Monthly Value
              </span>
              <div className="text-3xl sm:text-4xl font-black text-emerald-400 font-mono mt-1">
                +₱{netMonthlyBenefit.toLocaleString()}
              </div>
              <p className="text-xs text-blue-200 font-medium mt-1">
                Net profit gain after CasinFreight subscription
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-xs p-4 rounded-2xl border border-white/10 space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Total Monthly Savings:</span>
                <span className="font-bold text-white font-mono">₱{totalEstimatedMonthlySavings.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>CasinFreight Founding Cost:</span>
                <span className="font-bold text-amber-300 font-mono">₱{casinFreightCost.toLocaleString()}/mo</span>
              </div>
              <div className="pt-2 border-t border-white/10 flex justify-between text-sm font-bold text-emerald-300">
                <span>Return on Investment:</span>
                <span>{Math.round((totalEstimatedMonthlySavings / casinFreightCost) * 100)}% ROI</span>
              </div>
            </div>

            <button
              type="button"
              id="calculator-start-trial-button"
              onClick={() => onOpenAuth('signup')}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-950 font-black text-base rounded-2xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Start Free 1-Month Trial</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
