export type MapPoint = { lat: number; lng: number };

const cache = new Map<string, Promise<MapPoint | null>>();
let queue: Promise<unknown> = Promise.resolve();

function paced<T>(work: () => Promise<T>): Promise<T> {
  const run = queue.then(work, work);
  queue = run.then(
    () => new Promise((resolve) => setTimeout(resolve, 1100)),
    () => new Promise((resolve) => setTimeout(resolve, 1100))
  );
  return run;
}

function geocodeQuery(query: string): Promise<MapPoint | null> {
  const key = query.trim().toLowerCase();
  if (key.length < 3) return Promise.resolve(null);
  const cached = cache.get(key);
  if (cached) return cached;
  const pending = paced(async () => {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ph&q=${encodeURIComponent(query.trim())}`;
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) return null;
    const rows = (await response.json()) as { lat?: string; lon?: string }[];
    const hit = rows[0];
    if (!hit?.lat || !hit.lon) return null;
    const lat = Number(hit.lat);
    const lng = Number(hit.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  }).catch(() => null);
  cache.set(key, pending);
  return pending;
}

function queriesFor(label: string): string[] {
  const cleaned = label.replace(/\//g, ',').replace(/\s+/g, ' ').trim();
  const parts = cleaned.split(',').map((part) => part.trim()).filter((part) => part.length > 3);
  const blob = cleaned.toLowerCase();
  const aliases: string[] = [];
  if (blob.includes('mict')) aliases.push('Manila International Container Terminal', 'MICT Manila');
  if (blob.includes('north harbor') || blob.includes('north harbour')) aliases.push('Manila North Harbor');
  if (blob.includes('technopark')) aliases.push('Laguna Technopark Binan');
  return [...new Set([...aliases, ...parts, cleaned])];
}

/** Tries known yard names, then each part of the address, until a Philippine place matches. */
export async function geocodeLabel(label: string): Promise<MapPoint | null> {
  for (const query of queriesFor(label)) {
    const hit = await geocodeQuery(query);
    if (hit) return hit;
  }
  return null;
}

export function googleMapsDirectionsUrl(destination: string) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving`;
}

export function googleMapsRouteUrl(origin: MapPoint, destination: MapPoint) {
  return `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&travelmode=driving`;
}

export function wazeNavigateUrl(destination: string) {
  return `https://waze.com/ul?q=${encodeURIComponent(destination)}&navigate=yes`;
}

export function wazePointUrl(point: MapPoint) {
  return `https://waze.com/ul?ll=${point.lat},${point.lng}&navigate=yes`;
}

const routeCache = new Map<string, Promise<MapPoint[] | null>>();

/** Driving path along roads from the first point to the last. */
export function drivingRoute(points: MapPoint[]): Promise<MapPoint[] | null> {
  if (points.length < 2) return Promise.resolve(null);
  const key = points.map((point) => `${point.lat.toFixed(5)},${point.lng.toFixed(5)}`).join(';');
  const cached = routeCache.get(key);
  if (cached) return cached;
  const pending = fetch(
    `https://router.project-osrm.org/route/v1/driving/${points.map((point) => `${point.lng},${point.lat}`).join(';')}?overview=full&geometries=geojson`
  )
    .then(async (response) => {
      if (!response.ok) return null;
      const body = (await response.json()) as { routes?: { geometry?: { coordinates?: [number, number][] } }[] };
      const coords = body.routes?.[0]?.geometry?.coordinates;
      if (!coords?.length) return null;
      return coords.map(([lng, lat]) => ({ lat, lng }));
    })
    .catch(() => null);
  routeCache.set(key, pending);
  return pending;
}

export function osmEmbedSrc(points: MapPoint[], markerLat: number, markerLng: number) {
  const lats = points.map((point) => point.lat);
  const lngs = points.map((point) => point.lng);
  const latPad = Math.max(0.02, (Math.max(...lats) - Math.min(...lats)) * 0.25);
  const lngPad = Math.max(0.02, (Math.max(...lngs) - Math.min(...lngs)) * 0.25);
  const minLat = Math.min(...lats) - latPad;
  const maxLat = Math.max(...lats) + latPad;
  const minLng = Math.min(...lngs) - lngPad;
  const maxLng = Math.max(...lngs) + lngPad;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${minLng}%2C${minLat}%2C${maxLng}%2C${maxLat}&layer=mapnik&marker=${markerLat}%2C${markerLng}`;
}
