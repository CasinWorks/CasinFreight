import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Sparkles, ArrowRight } from 'lucide-react';
import { STORY_SLIDES } from '../data/mockData';
import { TextScale, LanguageMode } from '../types';

interface StoryTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  textScale: TextScale;
  languageMode: LanguageMode;
  onOpenAuth: (mode: 'signin' | 'signup') => void;
}

export const StoryTutorialModal: React.FC<StoryTutorialModalProps> = ({
  isOpen,
  onClose,
  textScale,
  languageMode,
  onOpenAuth,
}) => {
  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    setSlideIndex(0);
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setSlideIndex((prev) => (prev + 1) % STORY_SLIDES.length);
      if (e.key === 'ArrowLeft') setSlideIndex((prev) => (prev === 0 ? STORY_SLIDES.length - 1 : prev - 1));
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentSlide = STORY_SLIDES[slideIndex];
  const isLarge = textScale === 'large';
  const isLast = slideIndex >= STORY_SLIDES.length - 1;

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/80 md:flex md:items-center md:justify-center md:p-6">
      <div className="relative w-full h-dvh md:h-auto md:max-h-[90dvh] md:max-w-4xl bg-white md:rounded-3xl shadow-2xl border-0 md:border border-slate-200 overflow-hidden flex flex-col landing-auth-in">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shrink-0">
              {currentSlide.stepNumber}
            </span>
            <div className="min-w-0">
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-lg truncate">
                CasinFreight Story Guide
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Step {slideIndex + 1} of {STORY_SLIDES.length}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white hover:bg-slate-200 border border-slate-200 flex items-center justify-center text-slate-600"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2 px-4 sm:px-6 pt-3 bg-white shrink-0">
          {STORY_SLIDES.map((slide, idx) => (
            <button
              type="button"
              key={slide.id}
              onClick={() => setSlideIndex(idx)}
              className={`h-1.5 sm:h-2 rounded-full transition-all ${
                idx === slideIndex ? 'bg-blue-600' : idx < slideIndex ? 'bg-blue-300' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="p-4 sm:p-8 grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 items-start">
            <div className="md:col-span-6 relative">
              <div className="rounded-2xl overflow-hidden aspect-video md:aspect-4/3 bg-slate-100 border-2 border-slate-200 shadow-md relative">
                <img
                  src={currentSlide.image}
                  alt={currentSlide.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3 bg-white/95 px-3 py-1 rounded-full text-xs font-black text-blue-900 border border-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Feature {currentSlide.stepNumber}</span>
                </div>
                <button
                  type="button"
                  className="absolute inset-y-0 left-0 w-1/3 md:hidden"
                  aria-label="Previous step"
                  onClick={() => setSlideIndex((prev) => (prev === 0 ? STORY_SLIDES.length - 1 : prev - 1))}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 w-2/3 md:hidden"
                  aria-label="Next step"
                  onClick={() => setSlideIndex((prev) => (prev + 1) % STORY_SLIDES.length)}
                />
              </div>
            </div>

            <div className="md:col-span-6 space-y-3 sm:space-y-4 text-left pb-2">
              <h4
                className={`font-black text-slate-900 tracking-tight leading-tight ${
                  isLarge ? 'text-xl sm:text-3xl' : 'text-lg sm:text-2xl'
                }`}
              >
                {currentSlide.title}
              </h4>
              <p className="text-blue-700 font-bold text-sm sm:text-base">{currentSlide.tagline}</p>
              <p className={`text-slate-600 leading-relaxed ${isLarge ? 'text-base sm:text-lg' : 'text-sm sm:text-base'}`}>
                {currentSlide.explanation}
              </p>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-950 text-sm font-semibold">
                {currentSlide.simpleTip}
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => setSlideIndex((prev) => (prev === 0 ? STORY_SLIDES.length - 1 : prev - 1))}
            className="px-4 py-3 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 font-bold text-sm sm:text-base flex items-center gap-1"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Prev</span>
          </button>
          {isLast ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAuth('signup');
              }}
              className="px-4 sm:px-7 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm sm:text-base flex items-center gap-2"
            >
              <span>{languageMode === 'en' ? 'Start Free Trial' : 'Subukan Libre'}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setSlideIndex((prev) => prev + 1)}
              className="px-4 sm:px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm sm:text-base flex items-center gap-2"
            >
              <span>Next</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
