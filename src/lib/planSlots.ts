/** Firestore-enforced IDs. Rules only allow these namespaces, so a client cannot mint unbounded docs. */
export const TRUCK_SLOT_PREFIX = 'slot-truck-';
export const TRIP_SLOT_PREFIX = 'slot-trip-';

export function nextSlotId(prefix: string, usedIds: Iterable<string>, cap: number): string | null {
  const used = new Set(usedIds);
  const max = Math.max(0, Math.floor(Number(cap) || 0));
  for (let i = 0; i < max; i += 1) {
    const id = `${prefix}${i}`;
    if (!used.has(id)) return id;
  }
  return null;
}
