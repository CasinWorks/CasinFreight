/** Built-in corridor names. A shipper can keep extra zones on their own record. */
export const PRESET_ROUTE_ZONES = [
  'North Harbor / MICT Manila',
  'South Harbor Gate 3 Manila',
  'Caloocan / Valenzuela Industrial',
  'Pasig / Taguig Food Terminal',
  'Muntinlupa / Sucat Warehouse Hub',
  'Laguna Technopark (Biñan/Sta. Rosa)',
  'Cavite Export Zone (CEPZ Rosario)',
  'Batangas Port Container Terminal',
  'Clark Freeport Zone, Pampanga',
  'Subic Bay Freeport Zone',
  'San Fernando, Pampanga',
  'Lipa City / Batangas Light Park',
  'Cabuyao Light Industry & Science Park',
];

export function normalizeZone(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function sameZone(a: string, b: string): boolean {
  return normalizeZone(a).toLowerCase() === normalizeZone(b).toLowerCase();
}

export function isPresetZone(value: string): boolean {
  const zone = normalizeZone(value);
  return Boolean(zone) && PRESET_ROUTE_ZONES.some((preset) => sameZone(preset, zone));
}

/** Returns the next saved list, or null when the name is blank, already standard, or already saved. */
export function rememberZone(saved: string[] | undefined, name: string): string[] | null {
  const zone = normalizeZone(name);
  if (!zone || isPresetZone(zone)) return null;
  if ((saved || []).some((item) => sameZone(item, zone))) return null;
  return [...(saved || []), zone];
}

export function zonesForShipper(args: {
  savedZones?: string[];
  usedZones?: string[];
}): { standard: string[]; shipper: string[] } {
  const shipper: string[] = [];
  const add = (value?: string) => {
    const zone = value ? normalizeZone(value) : '';
    if (!zone || isPresetZone(zone)) return;
    if (shipper.some((item) => sameZone(item, zone))) return;
    shipper.push(zone);
  };
  for (const zone of args.savedZones || []) add(zone);
  for (const zone of args.usedZones || []) add(zone);
  return { standard: [...PRESET_ROUTE_ZONES], shipper };
}
