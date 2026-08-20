import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { PenTool } from 'lucide-react';
import { canvasPointFromEvent, readSignatureDataUrl } from '../../lib/podSignoff';

export type SignaturePadHandle = {
  read: (fallback?: string) => string | undefined;
  clear: () => void;
};

export const SignaturePad = forwardRef<SignaturePadHandle, {
  label: string;
  hint?: string;
  existingUrl?: string;
}>(function SignaturePad({ label, hint, existingUrl }, ref) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasInk, setHasInk] = useState(Boolean(existingUrl));

  useImperativeHandle(ref, () => ({
    read: (fallback) => readSignatureDataUrl(canvasRef.current, fallback || existingUrl),
    clear: () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasInk(false);
    },
  }));

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    e.preventDefault();
    setIsDrawing(true);
    const { x, y } = canvasPointFromEvent(canvas, e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    e.preventDefault();
    const { x, y } = canvasPointFromEvent(canvas, e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasInk(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
          <PenTool className="w-3 h-3 text-blue-600" />
          <span>{label}</span>
        </label>
        <button
          type="button"
          onClick={() => {
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (!canvas || !ctx) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            setHasInk(false);
          }}
          className="text-[10px] font-semibold text-slate-500 hover:text-red-600"
        >
          Clear signature
        </button>
      </div>
      {hint && <p className="text-[11px] text-slate-500 mb-1.5">{hint}</p>}
      <div className="border border-slate-300 rounded-lg bg-white overflow-hidden shadow-inner relative">
        {existingUrl && !hasInk && (
          <img src={existingUrl} alt="" className="absolute inset-0 w-full h-full object-contain pointer-events-none opacity-40" />
        )}
        <canvas
          ref={canvasRef}
          width={560}
          height={100}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={() => setIsDrawing(false)}
          onMouseLeave={() => setIsDrawing(false)}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={() => setIsDrawing(false)}
          className="w-full h-24 cursor-crosshair bg-transparent touch-none relative z-10"
        />
        {!hasInk && !existingUrl && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-xs">
            Sign on this pad
          </div>
        )}
      </div>
    </div>
  );
});
