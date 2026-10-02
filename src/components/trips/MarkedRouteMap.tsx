import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import type { MapPoint } from '../../lib/placeMap';

const TILE = 256;

export type RouteMark = MapPoint & {
  id: string;
  label: string;
  detail: string;
  place?: string;
  accuracyM?: number;
  stamped: boolean;
};

function project(lat: number, lng: number, zoom: number) {
  const scale = 2 ** zoom * TILE;
  const x = ((lng + 180) / 360) * scale;
  const rad = (lat * Math.PI) / 180;
  const y = (1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2 * scale;
  return { x, y };
}

type MapView = { zoom: number; originX: number; originY: number };

function unproject(x: number, y: number, zoom: number) {
  const scale = 2 ** zoom * TILE;
  const lng = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const lat = (180 / Math.PI) * Math.atan(Math.sinh(n));
  return { lat, lng };
}

function chooseView(points: MapPoint[], width: number, height: number): MapView {
  let zoom = 8;
  for (let z = 14; z >= 8; z -= 1) {
    const placed = points.map((point) => project(point.lat, point.lng, z));
    const spanX = Math.max(...placed.map((point) => point.x)) - Math.min(...placed.map((point) => point.x));
    const spanY = Math.max(...placed.map((point) => point.y)) - Math.min(...placed.map((point) => point.y));
    zoom = z;
    if (spanX < width - 72 && spanY < height - 72) break;
  }
  const placed = points.map((point) => project(point.lat, point.lng, zoom));
  const centerX = (Math.min(...placed.map((point) => point.x)) + Math.max(...placed.map((point) => point.x))) / 2;
  const centerY = (Math.min(...placed.map((point) => point.y)) + Math.max(...placed.map((point) => point.y))) / 2;
  return { zoom, originX: centerX - width / 2, originY: centerY - height / 2 };
}

function zoomAround(view: MapView, nextZoom: number, anchorX: number, anchorY: number): MapView {
  const zoom = Math.min(18, Math.max(8, nextZoom));
  const worldX = view.originX + anchorX;
  const worldY = view.originY + anchorY;
  const { lat, lng } = unproject(worldX, worldY, view.zoom);
  const next = project(lat, lng, zoom);
  return { zoom, originX: next.x - anchorX, originY: next.y - anchorY };
}

export const MarkedRouteMap: React.FC<{ marks: RouteMark[]; path?: MapPoint[] }> = ({ marks, path = [] }) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(360);
  const height = 208;
  const [userView, setUserView] = useState<MapView | null>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number; originX: number; originY: number } | null>(null);
  const pinchRef = useRef<{ distance: number; view: MapView } | null>(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const apply = () => setWidth(Math.max(280, Math.round(el.clientWidth)));
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const markKey = marks.map((mark) => `${mark.id}:${mark.lat.toFixed(4)},${mark.lng.toFixed(4)}`).join('|');
  useEffect(() => {
    setUserView(null);
  }, [markKey]);

  const fit = useMemo(
    () => chooseView(path.length > 1 ? [...marks, ...path] : marks, width, height),
    [marks, path, width]
  );
  const view = userView ?? fit;

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = el.getBoundingClientRect();
      const anchorX = event.clientX - rect.left;
      const anchorY = event.clientY - rect.top;
      setUserView((current) => zoomAround(current ?? fit, (current ?? fit).zoom + (event.deltaY < 0 ? 1 : -1), anchorX, anchorY));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [fit]);

  const placed = marks.map((mark) => {
    const point = project(mark.lat, mark.lng, view.zoom);
    return {
      ...mark,
      left: point.x - view.originX,
      top: point.y - view.originY,
    };
  });

  const x0 = Math.floor(view.originX / TILE);
  const y0 = Math.floor(view.originY / TILE);
  const x1 = Math.floor((view.originX + width) / TILE);
  const y1 = Math.floor((view.originY + height) / TILE);
  const tileCount = 2 ** view.zoom;
  const tiles: { x: number; y: number; srcX: number }[] = [];
  for (let x = x0; x <= x1; x += 1) {
    for (let y = y0; y <= y1; y += 1) {
      if (y < 0 || y >= tileCount) continue;
      const srcX = ((x % tileCount) + tileCount) % tileCount;
      tiles.push({ x, y, srcX });
    }
  }

  const localPoint = (event: React.PointerEvent) => {
    const rect = boxRef.current?.getBoundingClientRect();
    return {
      x: rect ? event.clientX - rect.left : event.clientX,
      y: rect ? event.clientY - rect.top : event.clientY,
    };
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button')) return;
    const point = localPoint(event);
    pointersRef.current.set(event.pointerId, point);
    event.currentTarget.setPointerCapture(event.pointerId);
    if (pointersRef.current.size === 1) {
      dragRef.current = { pointerId: event.pointerId, x: point.x, y: point.y, originX: view.originX, originY: view.originY };
    }
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(event.pointerId)) return;
    const point = localPoint(event);
    pointersRef.current.set(event.pointerId, point);
    const fingers = [...pointersRef.current.values()];
    if (fingers.length >= 2) {
      const distance = Math.hypot(fingers[0].x - fingers[1].x, fingers[0].y - fingers[1].y);
      const midX = (fingers[0].x + fingers[1].x) / 2;
      const midY = (fingers[0].y + fingers[1].y) / 2;
      if (!pinchRef.current) pinchRef.current = { distance, view };
      const steps = Math.round(Math.log2(distance / pinchRef.current.distance));
      if (steps !== 0) {
        setUserView(zoomAround(pinchRef.current.view, pinchRef.current.view.zoom + steps, midX, midY));
      }
      return;
    }
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setUserView({
      zoom: view.zoom,
      originX: drag.originX - (point.x - drag.x),
      originY: drag.originY - (point.y - drag.y),
    });
  };

  const endPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId);
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
    if (pointersRef.current.size < 2) pinchRef.current = null;
  };

  return (
    <div
      ref={boxRef}
      className="relative h-52 w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100 touch-none cursor-grab active:cursor-grabbing select-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
    >
      <div className="absolute top-1 left-1 z-10 flex flex-col gap-1">
        <button
          type="button"
          aria-label="Zoom in"
          className="h-7 w-7 rounded-md border border-slate-200 bg-white text-slate-800 shadow-sm flex items-center justify-center"
          onClick={() => setUserView((current) => zoomAround(current ?? fit, (current ?? fit).zoom + 1, width / 2, height / 2))}
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          aria-label="Zoom out"
          className="h-7 w-7 rounded-md border border-slate-200 bg-white text-slate-800 shadow-sm flex items-center justify-center"
          onClick={() => setUserView((current) => zoomAround(current ?? fit, (current ?? fit).zoom - 1, width / 2, height / 2))}
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          className="h-7 rounded-md border border-slate-200 bg-white px-1.5 text-[10px] font-bold text-slate-700 shadow-sm"
          onClick={() => setUserView(null)}
        >
          Fit
        </button>
      </div>
      <div className="absolute top-0 left-0" style={{ width, height }}>
        {tiles.map((tile) => (
          <img
            key={`${tile.x}-${tile.y}`}
            alt=""
            draggable={false}
            className="absolute pointer-events-none"
            style={{ left: tile.x * TILE - view.originX, top: tile.y * TILE - view.originY, width: TILE, height: TILE }}
            src={`https://tile.openstreetmap.org/${view.zoom}/${tile.srcX}/${tile.y}.png`}
          />
        ))}
        <svg className="absolute inset-0 h-full w-full" width={width} height={height}>
          {path.length > 1 ? (
            <polyline
              fill="none"
              stroke="#2563eb"
              strokeWidth="4"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={path
                .map((point) => {
                  const placedPoint = project(point.lat, point.lng, view.zoom);
                  return `${placedPoint.x - view.originX},${placedPoint.y - view.originY}`;
                })
                .join(' ')}
            />
          ) : placed.length === 2 ? (
            <line
              x1={placed[0].left}
              y1={placed[0].top}
              x2={placed[1].left}
              y2={placed[1].top}
              stroke="#2563eb"
              strokeWidth="3"
            />
          ) : null}
        </svg>
        {placed.map((mark, index) => {
          const crowded = placed.slice(0, index).some(
            (other) => Math.hypot(other.left - mark.left, other.top - mark.top) < 28
          );
          return (
          <div
            key={mark.id}
            className="absolute -translate-x-1/2 -translate-y-full pointer-events-none"
            style={{ left: mark.left, top: mark.top }}
          >
            <div
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold text-white shadow ${
                mark.id === 'pickup' ? 'bg-emerald-600' : 'bg-blue-600'
              }`}
              style={crowded ? { transform: 'translateX(52px)' } : undefined}
            >
              {mark.label}
            </div>
            <div
              className={`mx-auto mt-0.5 h-3 w-3 rounded-full border-2 border-white shadow ${
                mark.id === 'pickup' ? 'bg-emerald-600' : 'bg-blue-600'
              }`}
            />
          </div>
          );
        })}
      </div>
      <div className="absolute bottom-1 right-1 rounded bg-white/90 px-1.5 py-0.5 text-[9px] text-slate-500">
        © OpenStreetMap
      </div>
    </div>
  );
};
