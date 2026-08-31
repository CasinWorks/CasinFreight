import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  CheckCircle,
  Truck,
  Scale,
  FileCheck2,
  Receipt,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  MapPin,
  Check,
} from 'lucide-react';
import { STORY_SLIDES, IMAGES } from '../data/mockData';
import { TextScale, LanguageMode } from '../types';

interface StoryTutorialSectionProps {
  textScale: TextScale;
  languageMode: LanguageMode;
  onOpenAuth: (mode: 'signin' | 'signup') => void;
}

export const StoryTutorialSection: React.FC<StoryTutorialSectionProps> = ({
  textScale,
  languageMode,
  onOpenAuth,
}) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [hasDrawnSignature, setHasDrawnSignature] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);

  const currentSlide = STORY_SLIDES[currentSlideIndex];
  const isLarge = textScale === 'large';

  // Story Auto-Advance Timer (like Instagram/WhatsApp stories)
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (isPlaying) {
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            setCurrentSlideIndex((oldIndex) => (oldIndex + 1) % STORY_SLIDES.length);
            return 0;
          }
          return prev + 1.25; // ~8 seconds per slide
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentSlideIndex]);

  const handleNext = () => {
    setProgress(0);
    setCurrentSlideIndex((prev) => (prev + 1) % STORY_SLIDES.length);
  };

  const handlePrev = () => {
    setProgress(0);
    setCurrentSlideIndex((prev) => (prev === 0 ? STORY_SLIDES.length - 1 : prev - 1));
  };

  const handleSelectSlide = (index: number) => {
    setProgress(0);
    setCurrentSlideIndex(index);
  };

  // Simple signature canvas drawing handler
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
    setHasDrawnSignature(true);
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
    setHasDrawnSignature(false);
  };

  const renderPhoneScreen = () => {
    switch (currentSlide.phoneScreenType) {
      case 'dispatch':
        return (
          <div className="p-4 space-y-3 text-slate-800 bg-white h-full overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-black uppercase text-blue-600 tracking-wider">Step 1: Assign Trip</span>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md">
                Active Ready
              </span>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-2">
              <div>
                <label className="text-[11px] font-bold text-slate-500 block">Select Assigned Truck</label>
                <div className="font-extrabold text-slate-900 flex items-center gap-1.5 mt-0.5">
                  <span className="p-1 bg-blue-600 text-white rounded">🚚</span>
                  <span>NDB-8492 (10-Wheeler Wingvan)</span>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 block">Assigned Driver</label>
                <div className="font-bold text-slate-800 mt-0.5">Kuya Junjun Mendoza (📱 0918-555-0192)</div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 block">Route & Client</label>
                <div className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  <span>Valenzuela Warehouse → Batangas Port</span>
                </div>
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-[11px] font-bold text-emerald-900">
                Driver instantly receives SMS & app route alert.
              </span>
            </div>
          </div>
        );

      case 'weight':
        return (
          <div className="p-4 space-y-3 text-slate-800 bg-white h-full overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-black uppercase text-blue-600 tracking-wider">Step 2: DPWH Check</span>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md flex items-center gap-1">
                <Check className="w-3 h-3" /> SAFE GVWR
              </span>
            </div>

            <div className="bg-slate-900 text-white p-3 rounded-xl space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Truck Tare Weight:</span>
                <span className="font-bold">9,800 kg</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Cargo Payload:</span>
                <span className="font-bold text-emerald-400">14,500 kg (Electronics)</span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-sm font-black">
                <span>Total Gross Weight:</span>
                <span className="text-emerald-400">24,300 kg</span>
              </div>
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full w-[86%]" />
              </div>
              <p className="text-[10px] text-slate-400 text-right">Legal Max DPWH Limit: 28,000 kg (86% capacity)</p>
            </div>

            <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-900 font-medium">
              ✓ NLEX & SLEX weighbridge pass guaranteed. No overload fines!
            </div>
          </div>
        );

      case 'driver_sign':
        return (
          <div className="p-4 space-y-3 text-slate-800 bg-white h-full flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-black uppercase text-blue-600 tracking-wider">Step 3: Driver e-POD</span>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded-md">
                  Delivered at Batangas
                </span>
              </div>

              <div className="text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1">
                <p className="font-bold text-slate-900">Cargo Seal #99421 — Verified Intact</p>
                <p className="text-slate-500 text-[11px]">Receiver: Engr. Miguel Santos (Warehouse Mgr)</p>
              </div>

              {/* Interactive Sign Pad */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] font-bold text-slate-600">
                    Customer Signature (Sign below with finger/mouse):
                  </label>
                  {hasDrawnSignature && (
                    <button
                      type="button"
                      onClick={clearSignature}
                      className="text-[10px] text-red-600 font-bold hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="border-2 border-dashed border-blue-300 rounded-xl bg-blue-50/40 p-1 relative">
                  <canvas
                    ref={canvasRef}
                    width={220}
                    height={75}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-18 bg-white rounded-lg cursor-crosshair touch-none"
                  />
                  {!hasDrawnSignature && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-[11px] text-slate-400 font-medium">
                      ✍️ Sign here on glass
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-900 font-bold text-center">
              {hasDrawnSignature ? '✓ Signature Saved & Uploaded!' : '👆 Try signing to see live sync!'}
            </div>
          </div>
        );

      case 'bir_invoice':
        return (
          <div className="p-4 space-y-2.5 text-slate-800 bg-white h-full overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-black uppercase text-blue-600 tracking-wider">Step 4: BIR Invoicing</span>
              <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-[10px] font-bold rounded-md">
                VAT & 2% EWT
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1.5 font-mono">
              <div className="flex justify-between text-slate-600 font-sans">
                <span>Trip Subtotal:</span>
                <span className="font-bold text-slate-900">₱28,000.00</span>
              </div>
              <div className="flex justify-between text-slate-600 font-sans">
                <span>12% Output VAT:</span>
                <span className="font-bold text-slate-900">+ ₱3,360.00</span>
              </div>
              <div className="flex justify-between text-amber-700 font-sans">
                <span>Less 2% EWT (BIR 2307):</span>
                <span className="font-bold">- ₱560.00</span>
              </div>
              <div className="pt-2 border-t border-slate-300 flex justify-between text-sm font-black font-sans text-blue-900">
                <span>Net Collectible:</span>
                <span>₱30,800.00</span>
              </div>
            </div>

            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
              <p className="text-xs font-black text-emerald-900">✓ Official PDF Receipt Ready</p>
              <p className="text-[10px] text-emerald-700">1-click send to client’s accounting & WhatsApp</p>
            </div>
          </div>
        );
    }
  };

  return (
    <section id="how-it-works" className="py-10 sm:py-24 bg-white border-b border-slate-200 scroll-mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-6 sm:mb-12 space-y-3 sm:space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-sm font-bold">
            <Smartphone className="w-4 h-4 text-blue-600" />
            <span>
              {languageMode === 'en' ? 'Mobile App Story Tutorial' : 'Panoorin ang Simpleng Hakbang'}
            </span>
          </div>

          <h2
            className={`font-black text-slate-900 tracking-tight font-display ${
              isLarge ? 'text-3xl sm:text-4xl lg:text-5xl' : 'text-2xl sm:text-3xl lg:text-4xl'
            }`}
          >
            {languageMode === 'en'
              ? 'How CasinFreight Works in 4 Friendly Steps'
              : 'Paano Ginagamit ang CasinFreight sa 4 na Hakbang'}
          </h2>

          <p className="text-slate-600 text-base sm:text-lg">
            {languageMode === 'en'
              ? 'No computer training required. Here is the entire journey from dispatch to cash collection.'
              : 'Walang technical na kaalaman na kailangan. Ganito kabilis ang biyahe hanggang singilan.'}
          </p>
        </div>

        {/* Story Interactive Player Container */}
        <div className="bg-slate-50 border-2 border-slate-200/90 rounded-3xl p-4 sm:p-8 lg:p-10 shadow-xl max-w-5xl mx-auto">
          {/* Top Story Step Progress Bars (Instagram/Mobile App Style) */}
          <div className="grid grid-cols-4 gap-2 sm:gap-3 mb-6">
            {STORY_SLIDES.map((slide, index) => {
              const isActive = index === currentSlideIndex;
              const isPast = index < currentSlideIndex;

              return (
                <button
                  type="button"
                  key={slide.id}
                  onClick={() => handleSelectSlide(index)}
                  className="group focus:outline-hidden text-left cursor-pointer"
                >
                  <div className="h-2 rounded-full bg-slate-200 overflow-hidden relative">
                    <div
                      className={`h-full rounded-full transition-all duration-100 ${
                        isPast
                          ? 'bg-blue-600 w-full'
                          : isActive
                          ? 'bg-blue-600'
                          : 'w-0'
                      }`}
                      style={{
                        width: isActive ? `${progress}%` : isPast ? '100%' : '0%',
                      }}
                    />
                  </div>
                  <div className="mt-2 hidden sm:flex items-center gap-1.5 text-xs font-bold">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : isPast
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {slide.stepNumber}
                    </span>
                    <span
                      className={`truncate ${
                        isActive ? 'text-blue-900 font-extrabold' : 'text-slate-500'
                      }`}
                    >
                      {slide.title}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="lg:hidden mb-4 rounded-2xl overflow-hidden aspect-video bg-slate-100 border-2 border-slate-200">
            <img src={currentSlide.image} alt={currentSlide.title} className="w-full h-full object-cover" />
          </div>

          {/* Main Story Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-center">
            {/* Left Story Explainer Card */}
            <div className="lg:col-span-7 space-y-3 sm:space-y-6 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-900 rounded-lg text-xs font-extrabold uppercase tracking-wider">
                <span>Step {currentSlide.stepNumber} of 4</span>
              </div>

              <h3
                className={`font-black text-slate-900 leading-tight ${
                  isLarge ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'
                }`}
              >
                {currentSlide.title}
              </h3>

              <p className="text-blue-700 font-bold text-base sm:text-lg">
                {currentSlide.tagline}
              </p>

              <p
                className={`text-slate-700 leading-relaxed ${
                  isLarge ? 'text-lg sm:text-xl' : 'text-base sm:text-lg'
                }`}
              >
                {currentSlide.explanation}
              </p>

              {/* Simple Tip Pill */}
              <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
                <p className="text-slate-800 font-semibold text-sm">
                  {currentSlide.simpleTip}
                </p>
              </div>

              {/* Story Step Controls with BIG Senior-Friendly Buttons */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-2 sticky bottom-0 bg-slate-50/95 py-2 -mx-1">
                <button
                  type="button"
                  id="story-prev-button"
                  onClick={handlePrev}
                  className="px-4 sm:px-5 py-3 rounded-xl bg-white hover:bg-slate-100 border-2 border-slate-300 text-slate-800 font-extrabold text-sm sm:text-base flex items-center gap-2 transition-all cursor-pointer shadow-xs"
                >
                  <ChevronLeft className="w-5 h-5 text-slate-700" />
                  <span>Prev</span>
                </button>

                <button
                  type="button"
                  id="story-play-pause-button"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="px-4 py-3 rounded-xl bg-white hover:bg-slate-100 border-2 border-slate-300 text-slate-800 font-bold text-sm flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  title={isPlaying ? 'Pause auto-play' : 'Play auto-advance'}
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-4 h-4 text-slate-700" />
                      <span className="hidden sm:inline">Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 text-slate-700 fill-slate-700" />
                      <span className="hidden sm:inline">Play</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  id="story-next-button"
                  onClick={handleNext}
                  className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-base flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-blue-600/30"
                >
                  <span>Next Step</span>
                  <ChevronRight className="w-5 h-5 text-white" />
                </button>

                <button
                  type="button"
                  onClick={() => onOpenAuth('signup')}
                  className="ml-auto text-blue-700 hover:text-blue-900 font-black text-sm flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <span>Skip to Free Month</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Right Story Visual: Mobile Device Simulator + Real Image Thumbnail */}
            <div className="hidden lg:flex lg:col-span-5 flex-col items-center">
              {/* Smartphone Mockup */}
              <div className="w-full max-w-[300px] sm:max-w-[320px] bg-slate-900 rounded-[40px] p-3 shadow-2xl border-4 border-slate-800 relative">
                {/* Phone Speaker & Camera Notch */}
                <div className="w-24 h-4 bg-slate-950 rounded-full mx-auto mb-2 flex items-center justify-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-slate-800" />
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                </div>

                {/* Inner Screen */}
                <div className="bg-white rounded-[28px] overflow-hidden border border-slate-200 h-[380px] flex flex-col shadow-inner relative">
                  {/* Status Bar */}
                  <div className="bg-slate-100 px-4 py-1.5 text-[10px] text-slate-600 font-bold flex justify-between items-center border-b border-slate-200">
                    <span>9:41 AM</span>
                    <span className="flex items-center gap-1">
                      <span>4G LTE</span>
                      <span>📶 🔋 100%</span>
                    </span>
                  </div>

                  {/* Dynamic Interactive Phone Content */}
                  <div className="flex-1 overflow-hidden">{renderPhoneScreen()}</div>

                  {/* Virtual Home Bar */}
                  <div className="bg-white py-2 flex justify-center border-t border-slate-100">
                    <div className="w-24 h-1 bg-slate-300 rounded-full" />
                  </div>
                </div>
              </div>

              {/* Supporting context */}
              <div className="mt-4 text-center">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-2xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Runs on any Android phone (Samsung, Xiaomi, Vivo, Oppo)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
