import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { MapPoint } from '../../lib/placeMap';

const TILE = 256;

export type RouteMark = MapPoint & {
  id: string;
  label: string;
  detail: string;
  stamped: boolean;
};

function project(lat: number, lng: number, zoom: number) {
  const scale = 2 ** zoom * TILE;
  const x = ((lng + 180) / 360) * scale;
  const rad = (lat * Math.PI) / 180;
  const y = (1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2 * scale;
  return { x, y };
}

function chooseView(points: MapPoint[], width: number, height: number) {
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

export const MarkedRouteMap: React.FC<{ marks: RouteMark[]; path?: MapPoint[] }> = ({ marks, path = [] }) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(360);
  const height = 208;

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const apply = () => setWidth(Math.max(280, Math.round(el.clientWidth)));
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const view = useMemo(
    () => chooseView(path.length > 1 ? [...marks, ...path] : marks, width, height),
    [marks, path, width]
  );
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
  const tiles: { x: number; y: number }[] = [];
  for (let x = x0; x <= x1; x += 1) {
    for (let y = y0; y <= y1; y += 1) tiles.push({ x, y });
  }

  return (
    <div ref={boxRef} className="relative h-52 w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
      <div className="absolute top-0 left-0" style={{ width, height }}>
        {tiles.map((tile) => (
          <img
            key={`${tile.x}-${tile.y}`}
            alt=""
            className="absolute"
            style={{ left: tile.x * TILE - view.originX, top: tile.y * TILE - view.originY, width: TILE, height: TILE }}
            src={`https://tile.openstreetmap.org/${view.zoom}/${tile.x}/${tile.y}.png`}
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
        {placed.map((mark) => (
          <div
            key={mark.id}
            className="absolute -translate-x-1/2 -translate-y-full"
            style={{ left: mark.left, top: mark.top }}
          >
            <div
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold text-white shadow ${
                mark.id === 'pickup' ? 'bg-emerald-600' : 'bg-blue-600'
              }`}
            >
              {mark.label}
            </div>
            <div
              className={`mx-auto mt-0.5 h-3 w-3 rounded-full border-2 border-white shadow ${
                mark.id === 'pickup' ? 'bg-emerald-600' : 'bg-blue-600'
              }`}
            />
          </div>
        ))}
      </div>
      <div className="absolute bottom-1 right-1 rounded bg-white/90 px-1.5 py-0.5 text-[9px] text-slate-500">
        © OpenStreetMap
      </div>
    </div>
  );
};
