// Chapter 5 P1 — distance snapshot helpers (shared by all SaleEditor save paths).
// The distance from the operator's INTERNAL operating base is a SNAPSHOT:
// recomputed only when the sale location changed or no snapshot exists yet.
// Changing the operating base later never silently rewrites historical snapshots.
// Returns null when it cannot be calculated — never a fake 0.

export const computeDistanceSnapshot = (loc, base, existingMiles, originalLoc) => {
  if (!loc || loc.lat == null || !base || base.lat == null) return null;
  if (existingMiles != null && originalLoc && loc.lat === originalLoc.lat && loc.lng === originalLoc.lng) return null;
  const toRad = (d) => d * Math.PI / 180;
  const dLat = toRad(loc.lat - base.lat);
  const dLng = toRad(loc.lng - base.lng);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(base.lat)) * Math.cos(toRad(loc.lat)) * Math.sin(dLng / 2) ** 2;
  const miles = Math.round(3958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
  return { distance_miles: miles, distance_calculated_at: new Date().toISOString() };
};

// Mutating convenience: attaches the snapshot to saveData when one is due.
export const applyDistanceSnapshot = (saveData, loc, base, existingMiles, originalLoc) => {
  const snap = computeDistanceSnapshot(loc, base, existingMiles, originalLoc);
  if (snap) Object.assign(saveData, snap);
  return saveData;
};