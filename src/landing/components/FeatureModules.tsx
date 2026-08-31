import React, { useState } from 'react';
import { Scale, FileCheck2, Receipt, Users, ShieldAlert, CheckCircle2, ChevronRight, Calculator, Sparkles, Building2, PhoneCall } from 'lucide-react';
import { IMAGES, TRUCK_PRESETS } from '../data/mockData';
import { TextScale, LanguageMode } from '../types';

interface FeatureModulesProps {
  textScale: TextScale;
  languageMode: LanguageMode;
  onOpenAuth: (mode: 'signin' | 'signup') => void;
}

export const FeatureModules: React.FC<FeatureModulesProps> = ({
  textScale,
  languageMode,
  onOpenAuth,
}) => {
  const [activeTab, setActiveTab] = useState<'payload' | 'epod' | 'bir' | 'roles'>('payload');
  const [selectedTruckIndex, setSelectedTruckIndex] = useState(1); // 10-Wheeler default
  const [testCargoWeight, setTestCargoWeight] = useState(15000);

  const selectedTruck = TRUCK_PRESETS[selectedTruckIndex];
  const totalWeight = selectedTruck.tareKg + testCargoWeight;
  const isOverweight = totalWeight > selectedTruck.maxGvwrKg;
  const weightPercent = Math.min(100, Math.round((totalWeight / selectedTruck.maxGvwrKg) * 100));

  const isLarge = textScale === 'large';

  const selectTab = (tab: 'payload' | 'epod' | 'bir' | 'roles') => {
    setActiveTab(tab);
    if (window.matchMedia('(max-width: 1023px)').matches) {
      window.requestAnimationFrame(() => {
        document.getElementById('feature-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  };

  return (
    <section id="features" className="py-10 sm:py-24 bg-slate-50 border-b border-slate-200 scroll-mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100 text-blue-900 text-xs sm:text-sm font-bold">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>
              {languageMode === 'en'
                ? 'Built Specially for Philippine Roads & Regulations'
                : 'Pang-Pilipinas: DPWH weight check at VAT/EWT kwenta'}
            </span>
          </div>

          <h2
            className={`font-black text-slate-900 tracking-tight font-display ${
              isLarge ? 'text-3xl sm:text-4xl lg:text-5xl' : 'text-2xl sm:text-3xl lg:text-4xl'
            }`}
          >
            {languageMode === 'en'
              ? '4 Core Tools Every Trucking Owner Needs'
              : '4 na Mahalagang Gamit para sa May-ari ng Truck'}
          </h2>

          <p className="text-slate-600 text-base sm:text-lg">
            {languageMode === 'en'
              ? 'Replace messy paper notebooks and avoid penalties with simple, automated tools.'
              : 'Iwanan ang manu-manong notebook at iwasan ang multa sa simpleng paraan.'}
          </p>
        </div>

        {/* 4 Feature Selector Buttons (Large & Accessible) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-4 lg:mb-10">
          <button
            type="button"
            id="feature-card-payload"
            onClick={() => selectTab('payload')}
            className={`p-3 sm:p-5 rounded-2xl text-left border-2 transition-all cursor-pointer flex flex-col justify-between scroll-mt-16 ${
              activeTab === 'payload'
                ? 'bg-white border-blue-600 shadow-lg ring-2 ring-blue-500/20'
                : 'bg-white/70 hover:bg-white border-slate-200 text-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div
                className={`w-9 h-9 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center ${
                  activeTab === 'payload' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700'
                }`}
              >
                <Scale className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <span className="text-xs font-black uppercase tracking-wider text-slate-400">01</span>
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-lg">Payload & GVWR</h3>
              <p className="hidden sm:block text-xs text-slate-500 mt-1">Weighbridge checks & anti-overload alerts.</p>
            </div>
          </button>

          <button
            type="button"
            id="feature-card-epod"
            onClick={() => selectTab('epod')}
            className={`p-3 sm:p-5 rounded-2xl text-left border-2 transition-all cursor-pointer flex flex-col justify-between scroll-mt-16 ${
              activeTab === 'epod'
                ? 'bg-white border-blue-600 shadow-lg ring-2 ring-blue-500/20'
                : 'bg-white/70 hover:bg-white border-slate-200 text-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  activeTab === 'epod' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700'
                }`}
              >
                <FileCheck2 className="w-6 h-6" />
              </div>
              <span className="text-xs font-black uppercase tracking-wider text-slate-400">02</span>
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-lg">Digital e-POD</h3>
              <p className="hidden sm:block text-xs text-slate-500 mt-1">Seals, delivery notes, and phone signatures.</p>
            </div>
          </button>

          <button
            type="button"
            id="feature-card-bir"
            onClick={() => selectTab('bir')}
            className={`p-3 sm:p-5 rounded-2xl text-left border-2 transition-all cursor-pointer flex flex-col justify-between scroll-mt-16 ${
              activeTab === 'bir'
                ? 'bg-white border-blue-600 shadow-lg ring-2 ring-blue-500/20'
                : 'bg-white/70 hover:bg-white border-slate-200 text-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  activeTab === 'bir' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700'
                }`}
              >
                <Receipt className="w-6 h-6" />
              </div>
              <span className="text-xs font-black uppercase tracking-wider text-slate-400">03</span>
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-lg">VAT + EWT calculator</h3>
              <p className="hidden sm:block text-xs text-slate-500 mt-1">12% VAT and 2% EWT auto-calculation.</p>
            </div>
          </button>

          <button
            type="button"
            id="feature-card-roles"
            onClick={() => selectTab('roles')}
            className={`p-3 sm:p-5 rounded-2xl text-left border-2 transition-all cursor-pointer flex flex-col justify-between scroll-mt-16 ${
              activeTab === 'roles'
                ? 'bg-white border-blue-600 shadow-lg ring-2 ring-blue-500/20'
                : 'bg-white/70 hover:bg-white border-slate-200 text-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  activeTab === 'roles' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700'
                }`}
              >
                <Users className="w-6 h-6" />
              </div>
              <span className="text-xs font-black uppercase tracking-wider text-slate-400">04</span>
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-lg">Team Roles</h3>
              <p className="hidden sm:block text-xs text-slate-500 mt-1">Live roles & permissions for drivers & staff.</p>
            </div>
          </button>
        </div>

        {/* Feature Detail Active Card */}
        <div id="feature-detail" className="bg-white rounded-3xl p-4 sm:p-10 border-2 border-slate-200 shadow-xl scroll-mt-16">
          {activeTab === 'payload' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-6 space-y-5 text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-900 text-xs font-bold rounded-lg">
                  <ShieldAlert className="w-4 h-4 text-amber-700" />
                  <span>Republic Act 8794 & DPWH Anti-Overloading Protection</span>
                </div>

                <h3 className={`font-black text-slate-900 ${isLarge ? 'text-3xl' : 'text-2xl'}`}>
                  Never get hit by ₱20,000+ DPWH weighbridge fines again.
                </h3>

                <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
                  In the Philippines, overloaded trucks face severe penalties and impounding at NLEX, SLEX, and provincial weighbridges. CasinFreight computes your tare weight and cargo capacity in real-time, warning your dispatcher before the truck leaves your garage.
                </p>

                <div className="space-y-2.5">
                  <div className="flex items-center gap-2.5 text-slate-800 font-semibold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>Instant Gross Vehicle Weight Rating (GVWR) calculation</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-slate-800 font-semibold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>Preset axle limits for 4W, 6W, 10W Wingvans, and 18-Wheelers</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-slate-800 font-semibold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>Alerts driver directly on phone if cargo exceeds safe capacity</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => onOpenAuth('signup')}
                    className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-base rounded-xl transition-all cursor-pointer shadow-md shadow-blue-600/20"
                  >
                    Protect My Trucks Now →
                  </button>
                </div>
              </div>

              {/* Interactive Weight Simulator */}
              <div className="lg:col-span-6 bg-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl space-y-5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <span className="font-extrabold text-sm text-slate-300 flex items-center gap-2">
                    <Scale className="w-4 h-4 text-blue-400" />
                    Live DPWH Weight Calculator
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                      isOverweight ? 'bg-red-500 text-white animate-pulse' : 'bg-emerald-500 text-white'
                    }`}
                  >
                    {isOverweight ? '⚠️ OVERWEIGHT (FLAGGED)' : '✓ SAFE TO DISPATCH'}
                  </span>
                </div>

                {/* Truck Selector */}
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-2">Select Truck Model:</label>
                  <div className="grid grid-cols-2 gap-2">
                    {TRUCK_PRESETS.map((truck, idx) => (
                      <button
                        type="button"
                        key={truck.name}
                        onClick={() => setSelectedTruckIndex(idx)}
                        className={`p-2.5 rounded-xl text-left text-xs font-bold transition-all border ${
                          selectedTruckIndex === idx
                            ? 'bg-blue-600 border-blue-400 text-white'
                            : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                        }`}
                      >
                        <span className="mr-1.5">{truck.icon}</span>
                        {truck.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cargo Slider */}
                <div>
                  <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                    <span className="text-slate-300">Cargo Payload Weight:</span>
                    <span className="text-amber-400 font-mono text-sm">{testCargoWeight.toLocaleString()} kg</span>
                  </div>
                  <input
                    type="range"
                    min={1000}
                    max={30000}
                    step={500}
                    value={testCargoWeight}
                    onChange={(e) => setTestCargoWeight(Number(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>

                {/* Live Stats */}
                <div className="bg-slate-800/80 p-4 rounded-2xl space-y-2 border border-slate-700 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span>Truck Tare Weight:</span>
                    <span className="font-bold font-mono">{selectedTruck.tareKg.toLocaleString()} kg</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Max Legal DPWH Limit:</span>
                    <span className="font-bold font-mono">{selectedTruck.maxGvwrKg.toLocaleString()} kg</span>
                  </div>
                  <div className="pt-2 border-t border-slate-700 flex justify-between text-sm font-black">
                    <span>Total Gross Weight:</span>
                    <span className={isOverweight ? 'text-red-400' : 'text-emerald-400'}>
                      {totalWeight.toLocaleString()} kg ({weightPercent}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'epod' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-6 space-y-5 text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-900 text-xs font-bold rounded-lg">
                  <FileCheck2 className="w-4 h-4 text-blue-700" />
                  <span>Zero Lost Waybills & Faster Collection</span>
                </div>

                <h3 className={`font-black text-slate-900 ${isLarge ? 'text-3xl' : 'text-2xl'}`}>
                  Get paid 14 days faster with instant digital delivery proofs.
                </h3>

                <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
                  Tired of waiting days for drivers to physically bring back crumpled, stained delivery receipts from the province? With CasinFreight e-POD, the warehouse manager signs directly on the driver’s smartphone and you get the proof immediately in Manila.
                </p>

                <div className="space-y-2.5">
                  <div className="flex items-center gap-2.5 text-slate-800 font-semibold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>Digital finger signatures with timestamp & container seal photo</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-slate-800 font-semibold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>Clients instantly receive a copy via email and SMS</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-slate-800 font-semibold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>Works offline in remote ports and rural areas without cellular signal</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => onOpenAuth('signup')}
                    className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-base rounded-xl transition-all cursor-pointer shadow-md shadow-blue-600/20"
                  >
                    Try Digital e-POD Free →
                  </button>
                </div>
              </div>

              {/* Visual Card */}
              <div className="lg:col-span-6">
                <div className="rounded-2xl overflow-hidden aspect-4/3 bg-slate-100 border-2 border-slate-200 shadow-lg relative">
                  <img
                    src={IMAGES.driverEpod}
                    alt="Driver showing electronic signature screen"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-xs p-3.5 rounded-xl border border-slate-200 shadow-md">
                    <p className="text-xs font-black text-slate-900">
                      ✓ Instant Signed Waybill: Batangas Container Terminal
                    </p>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Receiver signed: 10:24 AM • Seal #99421 Intact • 0 damaged boxes
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'bir' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-6 space-y-5 text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-900 text-xs font-bold rounded-lg">
                  <Receipt className="w-4 h-4 text-purple-700" />
                  <span>Computes 12% VAT + 2% EWT for your bookkeeper</span>
                </div>

                <h3 className={`font-black text-slate-900 ${isLarge ? 'text-3xl' : 'text-2xl'}`}>
                  No more tax calculation headaches for your office bookkeeper.
                </h3>

                <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
                  CasinFreight computes 12% VAT and 2% EWT on the freight bill so your bookkeeper can review it. Print or export a billing summary — this is an aid for your accountant, not a BIR-registered Sales Invoice or Official Receipt.
                </p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  CasinFreight does not register, transmit, or certify invoices with BIR. This is not a Sales Invoice, Official Receipt, or CAS/PTU e-invoice.
                </p>

                <div className="space-y-2.5">
                  <div className="flex items-center gap-2.5 text-slate-800 font-semibold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>Auto-calculates Net Billing, 12% VAT, and 2% EWT deductions</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-slate-800 font-semibold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>Export Excel (.xlsx) for your accountant — CasinFreight does not file 2550M/2550Q for you</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-slate-800 font-semibold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>Attach toll receipts (RFID, Easytrip, Autosweep) directly to invoices</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => onOpenAuth('signup')}
                    className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-base rounded-xl transition-all cursor-pointer shadow-md shadow-blue-600/20"
                  >
                    See VAT + EWT calculator →
                  </button>
                </div>
              </div>

              {/* Office Image */}
              <div className="lg:col-span-6">
                <div className="rounded-2xl overflow-hidden aspect-4/3 bg-slate-100 border-2 border-slate-200 shadow-lg relative">
                  <img
                    src={IMAGES.birOffice}
                    alt="Bookkeeper reviewing VAT and EWT on a freight bill"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-xs p-3.5 rounded-xl border border-slate-200 shadow-md">
                    <p className="text-xs font-black text-slate-900">
                      ✓ VAT + EWT computed on the freight bill
                    </p>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Quarterly VAT summaries generated automatically. Zero manual calculator errors.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'roles' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-6 space-y-5 text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-900 text-xs font-bold rounded-lg">
                  <Users className="w-4 h-4 text-emerald-700" />
                  <span>Role-Based Access • Boss, Dispatcher, Cashier, Driver</span>
                </div>

                <h3 className={`font-black text-slate-900 ${isLarge ? 'text-3xl' : 'text-2xl'}`}>
                  Keep your sensitive business profits private from staff.
                </h3>

                <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
                  As the business owner, you see full company profits and rates. Your dispatchers only see truck schedules, and your drivers only see their assigned delivery destinations. Safe, organized, and clean.
                </p>

                <div className="space-y-2.5">
                  <div className="flex items-center gap-2.5 text-slate-800 font-semibold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span><strong>Owner/Boss:</strong> Full financial reports, cash flow, and truck additions</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-slate-800 font-semibold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span><strong>Dispatcher:</strong> Assigns trips, checks weighbridges, and tracks delays</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-slate-800 font-semibold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span><strong>Drivers:</strong> Super simple big-button interface on any mobile phone</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => onOpenAuth('signup')}
                    className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-base rounded-xl transition-all cursor-pointer shadow-md shadow-blue-600/20"
                  >
                    Create Company Account →
                  </button>
                </div>
              </div>

              {/* Roles Breakdown Box */}
              <div className="lg:col-span-6 bg-slate-50 p-6 sm:p-8 rounded-3xl border-2 border-slate-200 space-y-3">
                <div className="p-4 bg-white rounded-2xl border border-slate-200 flex items-center gap-4 shadow-xs">
                  <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black">
                    👑
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-base">Fleet Owner / CEO</h4>
                    <p className="text-xs text-slate-500">Sees total revenue, profit margins, and fleet health</p>
                  </div>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-slate-200 flex items-center gap-4 shadow-xs">
                  <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black">
                    📋
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-base">Operations Dispatcher</h4>
                    <p className="text-xs text-slate-500">Assigns loads, checks weighbridges, and monitors schedules</p>
                  </div>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-slate-200 flex items-center gap-4 shadow-xs">
                  <div className="w-11 h-11 rounded-xl bg-amber-600 text-white flex items-center justify-center font-black">
                    🚚
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-base">Truck Driver / Pahinante</h4>
                    <p className="text-xs text-slate-500">1-touch navigation and customer e-POD digital signature</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
