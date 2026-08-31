import React, { useState, useRef } from 'react';
import { Truck, CheckCircle2, FileText, ArrowRight, RotateCcw, Printer, Share2, Sparkles, MapPin, ShieldCheck, Download } from 'lucide-react';
import { TRUCK_PRESETS } from '../data/mockData';
import { TextScale, LanguageMode } from '../types';

interface InteractiveLiveDemoProps {
  textScale: TextScale;
  languageMode: LanguageMode;
  onOpenAuth: (mode: 'signin' | 'signup') => void;
}

export const InteractiveLiveDemo: React.FC<InteractiveLiveDemoProps> = ({
  textScale,
  languageMode,
  onOpenAuth,
}) => {
  const [selectedTruck, setSelectedTruck] = useState(TRUCK_PRESETS[1]); // 10-Wheeler Wingvan
  const [plateNumber, setPlateNumber] = useState('NDB-8492');
  const [clientName, setClientName] = useState('Juan Travel Corp.');
  const [routeDestination, setRouteDestination] = useState('Batangas Port Terminal');
  const [deliveryFee, setDeliveryFee] = useState(35000);
  const [cargoWeightKg, setCargoWeightKg] = useState(14500);
  const [isSigned, setIsSigned] = useState(false);
  const [signerName, setSignerName] = useState('Engr. Danilo Ramos');
  const [invoiceReady, setInvoiceReady] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);

  const vat12 = deliveryFee * 0.12;
  const ewt2 = deliveryFee * 0.02;
  const totalInvoice = deliveryFee + vat12 - ewt2;

  const totalGrossKg = selectedTruck.tareKg + cargoWeightKg;
  const isSafeWeight = totalGrossKg <= selectedTruck.maxGvwrKg;

  const isLarge = textScale === 'large';

  // Signature drawing logic
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1e3a8a';

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    setIsSigned(true);
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsSigned(false);
  };

  return (
    <section id="demo" className="py-10 sm:py-24 bg-white border-b border-slate-200 scroll-mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Title */}
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100 text-emerald-900 text-xs sm:text-sm font-bold">
            <Sparkles className="w-4 h-4 text-emerald-700" />
            <span>
              {languageMode === 'en' ? 'Interactive 1-Minute Simulator' : 'Subukan Mismo: 1-Minutong Sandbox'}
            </span>
          </div>

          <h2
            className={`font-black text-slate-900 tracking-tight font-display ${
              isLarge ? 'text-3xl sm:text-4xl lg:text-5xl' : 'text-2xl sm:text-3xl lg:text-4xl'
            }`}
          >
            {languageMode === 'en'
              ? 'Test-Drive CasinFreight in Real Time'
              : 'Subukang Gumawa ng Biyahe at Resibo Ngayon'}
          </h2>

          <p className="text-slate-600 text-base sm:text-lg">
            {languageMode === 'en'
              ? 'See how simple it is to assign a truck, sign an e-POD, and calculate BIR tax in under 60 seconds.'
              : 'Tingnan kung gaano kabilis mag-assign ng truck, pumirma sa phone, at magkwenta ng BIR tax.'}
          </p>
        </div>

        {/* Interactive Workspace Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Step 1 & 2: Trip Dispatch & Weight Checker (Left Column) */}
          <div className="lg:col-span-6 bg-slate-50 border-2 border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-sm">
                  1
                </span>
                <h3 className="font-extrabold text-slate-900 text-lg">Create Test Trip</h3>
              </div>
              <span className="text-xs text-blue-700 font-bold bg-blue-100 px-2.5 py-1 rounded-full">
                Interactive Controls
              </span>
            </div>

            {/* Inputs */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Select Vehicle Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {TRUCK_PRESETS.slice(0, 2).map((t) => (
                    <button
                      type="button"
                      key={t.name}
                      onClick={() => setSelectedTruck(t)}
                      className={`p-3 rounded-xl text-left text-xs font-bold border-2 transition-all cursor-pointer ${
                        selectedTruck.name === t.name
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="text-base mb-1">{t.icon}</div>
                      <div>{t.name}</div>
                      <div className="text-[10px] opacity-80 mt-0.5">Max GVWR: {t.maxGvwrKg.toLocaleString()} kg</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Plate Number</label>
                  <input
                    type="text"
                    value={plateNumber}
                    onChange={(e) => setPlateNumber(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Client Name</label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Delivery Fee (PHP ₱)</label>
                  <input
                    type="number"
                    step={1000}
                    value={deliveryFee}
                    onChange={(e) => setDeliveryFee(Number(e.target.value))}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Cargo Weight (kg)</label>
                  <input
                    type="number"
                    step={500}
                    value={cargoWeightKg}
                    onChange={(e) => setCargoWeightKg(Number(e.target.value))}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Weight Status */}
              <div
                className={`p-4 rounded-2xl border-2 transition-all ${
                  isSafeWeight
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                    : 'bg-red-50 border-red-300 text-red-950'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold mb-1">
                  <span>DPWH Compliance Check:</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase ${
                      isSafeWeight ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                    }`}
                  >
                    {isSafeWeight ? '✓ Legal Weight' : '⚠️ Overweight'}
                  </span>
                </div>
                <p className="text-xs mt-1">
                  Total Weight: <strong>{totalGrossKg.toLocaleString()} kg</strong> (Legal Limit:{' '}
                  {selectedTruck.maxGvwrKg.toLocaleString()} kg)
                </p>
              </div>

              {/* Step 2: Sign e-POD */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <span>2. Customer Touch Signature (Draw below):</span>
                  </label>
                  {isSigned && (
                    <button
                      type="button"
                      onClick={clearSignature}
                      className="text-xs text-red-600 font-bold hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="border-2 border-dashed border-blue-400 rounded-2xl bg-white p-2 relative">
                  <canvas
                    ref={canvasRef}
                    width={400}
                    height={100}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-24 bg-blue-50/20 rounded-xl cursor-crosshair touch-none"
                  />
                  {!isSigned && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-xs text-slate-400 font-bold">
                      ✍️ Sign your name here with finger or mouse
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setInvoiceReady(true)}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-base rounded-2xl shadow-lg shadow-blue-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Generate Instant BIR Invoicing Preview</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Step 3: Instant Live BIR Invoice Preview (Right Column) */}
          <div className="lg:col-span-6 bg-white border-2 border-slate-300 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 relative overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b-2 border-slate-800 pb-4">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-blue-600 block">
                  Official Billing Summary
                </span>
                <h3 className="text-xl font-black text-slate-900 font-display">CASINFREIGHT LOGISTICS PH</h3>
                <p className="text-xs text-slate-500">TIN: 481-992-301-000 • VAT Registered</p>
              </div>
              <div className="text-right">
                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-extrabold">
                  {isSigned ? '✓ POD SIGNED' : 'PENDING SIGNATURE'}
                </span>
                <p className="text-[11px] text-slate-500 mt-1 font-mono">INV-2026-0839</p>
              </div>
            </div>

            {/* Bill Details */}
            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div>
                <span className="text-slate-500 block font-bold">Billed Client:</span>
                <span className="font-extrabold text-slate-900 text-sm">{clientName}</span>
                <span className="text-slate-600 block mt-0.5">Dest: {routeDestination}</span>
              </div>
              <div>
                <span className="text-slate-500 block font-bold">Assigned Vehicle:</span>
                <span className="font-extrabold text-slate-900 text-sm">{plateNumber}</span>
                <span className="text-slate-600 block mt-0.5">{selectedTruck.name}</span>
              </div>
            </div>

            {/* Tax Calculation Breakdown */}
            <div className="space-y-3 pt-2 text-sm">
              <div className="flex justify-between text-slate-700">
                <span>Trip Freight Subtotal:</span>
                <span className="font-bold text-slate-900 font-mono">₱{deliveryFee.toLocaleString()}.00</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span className="flex items-center gap-1">
                  <span>Add: 12% Value Added Tax (VAT)</span>
                </span>
                <span className="font-bold text-emerald-700 font-mono">+ ₱{vat12.toLocaleString()}.00</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span className="flex items-center gap-1">
                  <span>Less: 2% BIR Form 2307 (EWT)</span>
                </span>
                <span className="font-bold text-amber-700 font-mono">- ₱{ewt2.toLocaleString()}.00</span>
              </div>

              <div className="pt-4 border-t-2 border-slate-900 flex justify-between items-center text-lg font-black text-slate-900">
                <span>Net Total Collectible:</span>
                <span className="text-blue-600 text-2xl font-mono">₱{totalInvoice.toLocaleString()}.00</span>
              </div>
            </div>

            {/* Electronic Proof of Delivery Box */}
            <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-200 text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-blue-950">Customer e-POD Verification:</span>
                <span className="text-slate-500 font-mono">Seal #88193</span>
              </div>
              <p className="text-slate-700">
                Signer: <strong>{signerName}</strong>
              </p>
              <div className="text-[11px] text-slate-500 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Seal verified • Batangas Terminal Weighbridge Passed</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={() => onOpenAuth('signup')}
                className="w-full sm:flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-base rounded-2xl shadow-lg shadow-emerald-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Get This for Your Fleet (1 Month Free)</span>
              </button>

              <button
                type="button"
                onClick={() => alert('PDF generation is enabled in your live CasinFreight account!')}
                className="px-5 py-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm rounded-2xl border border-slate-300 transition-all cursor-pointer flex items-center gap-1.5"
                title="Download sample PDF"
              >
                <Download className="w-4 h-4" />
                <span>PDF Export</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
