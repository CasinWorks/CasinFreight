import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { findVisibleElement, placeTooltip, toRect, type Rect } from './placement';
import type { TutorialStep } from './tutorialSteps';

interface TutorialOverlayProps {
  isActive: boolean;
  step: TutorialStep | null;
  stepIndex: number;
  stepCount: number;
  datasetEmpty: boolean;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  hideBack?: boolean;
  nextLabel?: string;
}

const TOOLTIP_WIDTH = 320;

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  isActive,
  step,
  stepIndex,
  stepCount,
  datasetEmpty,
  onNext,
  onBack,
  onSkip,
  hideBack = false,
  nextLabel,
}) => {
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [hole, setHole] = useState<Rect | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 80, left: 24, placement: step?.placement ?? 'bottom' });
  const [copy, setCopy] = useState({ title: '', body: '' });

  const measure = React.useCallback(() => {
    if (!isActive || !step) {
      setHole(null);
      return;
    }

    const useEmpty = datasetEmpty && step.emptyFallback;
    const selector = useEmpty ? step.emptyFallback?.target || step.target : step.target;
    const el = findVisibleElement(selector) || findVisibleElement(step.target) || findVisibleElement('[data-tutorial="main-workspace"]');

    setCopy({
      title: useEmpty && step.emptyFallback ? step.emptyFallback.title : step.title,
      body: useEmpty && step.emptyFallback ? step.emptyFallback.body : step.body,
    });

    if (!el) {
      setHole({
        top: window.innerHeight / 2 - 40,
        left: window.innerWidth / 2 - 80,
        width: 160,
        height: 80,
        bottom: window.innerHeight / 2 + 40,
        right: window.innerWidth / 2 + 80,
      });
      return;
    }

    el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    setHole(toRect(el, 8));
  }, [datasetEmpty, isActive, step]);

  useLayoutEffect(() => {
    const timer = window.setTimeout(measure, 60);
    return () => window.clearTimeout(timer);
  }, [measure, stepIndex]);

  useEffect(() => {
    if (!isActive) return;
    const onResize = () => measure();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    const interval = window.setInterval(measure, 400);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
      window.clearInterval(interval);
    };
  }, [isActive, measure]);

  useLayoutEffect(() => {
    if (!hole || !tooltipRef.current) return;
    const size = {
      width: tooltipRef.current.offsetWidth || TOOLTIP_WIDTH,
      height: tooltipRef.current.offsetHeight || 160,
    };
    setTooltipPos(placeTooltip(hole, size, step?.placement ?? 'bottom'));
  }, [hole, step, copy.title, copy.body]);

  useEffect(() => {
    if (!isActive || !step) return;

    const selector = datasetEmpty && step.emptyFallback?.target ? step.emptyFallback.target : step.target;
    const el = findVisibleElement(selector) || findVisibleElement(step.target);
    if (!el) return;

    const onTargetClick = (event: Event) => {
      if (!step.finishOnClick) {
        event.stopPropagation();
        event.preventDefault();
      }
      onNext();
    };

    el.addEventListener('click', onTargetClick, true);
    return () => el.removeEventListener('click', onTargetClick, true);
  }, [datasetEmpty, isActive, onNext, step, stepIndex]);

  useEffect(() => {
    if (!isActive) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onSkip();
      } else if (event.key === 'ArrowRight' || event.key === 'Enter') {
        event.preventDefault();
        onNext();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        onBack();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isActive, onBack, onNext, onSkip]);

  const isLast = stepIndex >= stepCount - 1;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;

  return (
    <AnimatePresence>
      {isActive && step && hole && (
        <motion.div
          className="fixed inset-0 z-[90]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          <motion.div
            className="absolute bg-slate-950/70"
            animate={{ top: 0, left: 0, width: vw, height: Math.max(0, hole.top) }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          />
          <motion.div
            className="absolute bg-slate-950/70"
            animate={{ top: hole.top + hole.height, left: 0, width: vw, height: Math.max(0, vh - hole.top - hole.height) }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          />
          <motion.div
            className="absolute bg-slate-950/70"
            animate={{ top: hole.top, left: 0, width: Math.max(0, hole.left), height: hole.height }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          />
          <motion.div
            className="absolute bg-slate-950/70"
            animate={{ top: hole.top, left: hole.left + hole.width, width: Math.max(0, vw - hole.left - hole.width), height: hole.height }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          />

          <motion.div
            className="absolute rounded-xl pointer-events-none ring-2 ring-blue-400 shadow-[0_0_0_6px_rgba(59,130,246,0.25)]"
            animate={{
              top: hole.top,
              left: hole.left,
              width: hole.width,
              height: hole.height,
            }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <span className="absolute inset-0 rounded-xl ring-2 ring-blue-300/80 animate-pulse" />
          </motion.div>

          <button
            type="button"
            onClick={onSkip}
            className="absolute top-3 right-3 z-[92] text-[11px] font-medium text-white/55 hover:text-white/90 px-2 py-1 rounded-md"
          >
            Skip tutorial
          </button>

          <AnimatePresence mode="wait">
            <motion.div
              key={step.id + copy.title}
              ref={tooltipRef}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="absolute z-[92] w-[min(320px,calc(100vw-24px))] bg-white rounded-2xl border border-slate-200 shadow-2xl p-4"
              style={{ top: tooltipPos.top, left: tooltipPos.left }}
              role="dialog"
              aria-labelledby="tutorial-title"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                    Step {stepIndex + 1} of {stepCount}
                  </p>
                  <h3 id="tutorial-title" className="text-sm font-bold text-slate-900 mt-1">
                    {copy.title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={onSkip}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                  aria-label="Skip tutorial"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">{copy.body}</p>

              <div className="flex items-center gap-1 mt-3">
                {Array.from({ length: stepCount }).map((_, index) => (
                  <span
                    key={index}
                    className={`h-1.5 rounded-full ${index === stepIndex ? 'w-4 bg-blue-600' : 'w-1.5 bg-slate-200'}`}
                  />
                ))}
              </div>

              <div className="flex items-center justify-between gap-2 mt-4">
                {hideBack ? (
                  <span />
                ) : (
                  <button
                    type="button"
                    onClick={onBack}
                    disabled={stepIndex === 0}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-500 disabled:opacity-30"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back
                  </button>
                )}
                <button
                  type="button"
                  onClick={onNext}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm"
                >
                  <span>{nextLabel || (isLast ? 'Finish' : 'Next')}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
