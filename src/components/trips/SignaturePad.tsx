import React, { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, PenTool, X } from 'lucide-react';
import { canvasPointFromEvent, readSignatureDataUrl } from '../../lib/podSignoff';

export type SignaturePadHandle = {
  read: (fallback?: string) => string | undefined;
  clear: () => void;
};

function fitCanvas(canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.round(rect.width * dpr));
  const height = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width === width && canvas.height === height) return dpr;
  const previous = canvas.toDataURL('image/png');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return dpr;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (previous && previous.length > 100) {
    const image = new Image();
    image.onload = () => ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    image.src = previous;
  }
  return dpr;
}

function strokeWidth(canvas: HTMLCanvasElement): number {
  const rect = canvas.getBoundingClientRect();
  const scale = rect.width > 0 ? canvas.width / rect.width : 1;
  return Math.max(3, 3.25 * scale);
}

export const SignaturePad = forwardRef<SignaturePadHandle, {
  label: string;
  hint?: string;
  existingUrl?: string;
}>(function SignaturePad({ label, hint, existingUrl }, ref) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const [expanded, setExpanded] = useState(false);
  const [hasInk, setHasInk] = useState(Boolean(existingUrl));
  const [committedUrl, setCommittedUrl] = useState<string | undefined>(existingUrl);

  useImperativeHandle(ref, () => ({
    read: (fallback) => {
      const overlayInk = readSignatureDataUrl(overlayRef.current);
      if (overlayInk) return overlayInk;
      const inlineInk = readSignatureDataUrl(canvasRef.current);
      if (inlineInk) return inlineInk;
      return committedUrl || fallback || existingUrl;
    },
    clear: () => {
      [canvasRef.current, overlayRef.current].forEach((canvas) => {
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      });
      setHasInk(false);
      setCommittedUrl(undefined);
    },
  }));

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    fitCanvas(canvas);
    const observer = new ResizeObserver(() => fitCanvas(canvas));
    if (wrapRef.current) observer.observe(wrapRef.current);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (!expanded) return;
    const canvas = overlayRef.current;
    if (!canvas) return;
    requestAnimationFrame(() => {
      fitCanvas(canvas);
      const source = committedUrl || existingUrl;
      if (!source) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const image = new Image();
      image.onload = () => ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      image.src = source;
    });
  }, [expanded, committedUrl, existingUrl]);

  useEffect(() => {
    if (!expanded) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [expanded]);

  const startDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    const { x, y } = canvasPointFromEvent(canvas, event);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = strokeWidth(canvas);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const draw = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const canvas = event.currentTarget;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    event.preventDefault();
    const { x, y } = canvasPointFromEvent(canvas, event);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasInk(true);
  };

  const stopDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    drawingRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const clearCanvas = (canvas: HTMLCanvasElement | null) => {
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
    setCommittedUrl(undefined);
  };

  const finishExpanded = () => {
    const ink = readSignatureDataUrl(overlayRef.current, committedUrl || existingUrl);
    if (ink) {
      setCommittedUrl(ink);
      setHasInk(true);
      const inline = canvasRef.current;
      const ctx = inline?.getContext('2d');
      if (inline && ctx) {
        const image = new Image();
        image.onload = () => {
          ctx.clearRect(0, 0, inline.width, inline.height);
          ctx.drawImage(image, 0, 0, inline.width, inline.height);
        };
        image.src = ink;
      }
    }
    setExpanded(false);
  };

  const canvasClass = 'w-full h-full cursor-crosshair bg-transparent touch-none relative z-10';

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1">
        <label className="text-[11px] sm:text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1 min-w-0">
          <PenTool className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span className="truncate">{label}</span>
        </label>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              const ink = readSignatureDataUrl(canvasRef.current) || committedUrl;
              if (ink) setCommittedUrl(ink);
              setExpanded(true);
            }}
            className="inline-flex items-center gap-1.5 min-h-9 px-3 rounded-lg bg-blue-600 text-white text-xs font-bold sm:min-h-0 sm:px-0 sm:bg-transparent sm:text-blue-700 hover:sm:text-blue-900"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            Sign full screen
          </button>
          <button
            type="button"
            onClick={() => {
              clearCanvas(canvasRef.current);
              clearCanvas(overlayRef.current);
            }}
            className="text-[11px] sm:text-[10px] font-semibold text-slate-500 hover:text-red-600"
          >
            Clear
          </button>
        </div>
      </div>
      {hint && <p className="text-xs sm:text-[11px] text-slate-500 mb-1.5">{hint}</p>}
      <div
        ref={wrapRef}
        className="border-2 border-slate-300 rounded-xl bg-white overflow-hidden shadow-inner relative h-44 sm:h-28"
      >
        {committedUrl && !hasInk && (
          <img src={committedUrl} alt="" className="absolute inset-0 w-full h-full object-contain pointer-events-none opacity-40" />
        )}
        <canvas
          ref={canvasRef}
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          onPointerCancel={stopDrawing}
          onPointerLeave={stopDrawing}
          className={canvasClass}
        />
        {!hasInk && !committedUrl && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-slate-400 px-3 text-center">
            <PenTool className="w-6 h-6 mb-1 opacity-60" />
            <span className="text-sm sm:text-xs font-medium">Tap “Sign full screen” or sign here with your finger</span>
          </div>
        )}
      </div>

      {expanded && createPortal(
        <div className="fixed inset-0 z-[120] bg-slate-950 flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="px-4 py-3 flex items-start justify-between gap-3 text-white">
            <div className="min-w-0">
              <div className="text-sm font-bold truncate">{label}</div>
              <p className="text-xs text-slate-300 mt-0.5">
                Hand the phone to the signer. Use a finger, slowly. Turn sideways if you need more room.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="p-3 min-w-11 min-h-11 rounded-xl bg-white/10 text-white shrink-0"
              aria-label="Close signature pad"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 mx-3 mb-3 rounded-2xl bg-white overflow-hidden border-2 border-dashed border-slate-300 relative min-h-0">
            <canvas
              ref={overlayRef}
              onPointerDown={startDrawing}
              onPointerMove={draw}
              onPointerUp={stopDrawing}
              onPointerCancel={stopDrawing}
              className={canvasClass}
            />
            {!hasInk && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-300 text-lg font-medium">
                Sign here
              </div>
            )}
          </div>
          <div className="px-4 pb-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => clearCanvas(overlayRef.current)}
              className="min-h-12 rounded-xl border border-white/20 bg-white/10 text-white font-bold"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={finishExpanded}
              className="min-h-12 rounded-xl bg-emerald-500 text-white font-bold"
            >
              Use this signature
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
});
