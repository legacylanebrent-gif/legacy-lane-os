import { base44 } from '@/api/base44Client';
import { rows } from './saleDayMetrics';

export const LOCAL_ISO_RADIUS_MILES = 20;

const ZIP_CACHE_KEY = 'iso_zip_coords_v1';
const MAX_ZIP_LOOKUPS = 12;

const readCache = () => {
  try {
    return JSON.parse(localStorage.getItem(ZIP_CACHE_KEY) || '{}');
  } catch {
    return {};
  }
};

const writeCache = (cache) => {
  try {
    localStorage.setItem(ZIP_CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* storage unavailable — coordinates just get looked up again next time */
  }
};

export function milesBetween(a, b) {
  if (!a || !b || a.lat == null || b.lat == null) return null;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(3958.8 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)) * 10) / 10;
}

async function zipCoords(zip, cache, budget) {
  const key = String(zip || '').slice(0, 5);
  if (!/^\d{5}$/.test(key)) return null;
  if (key in cache) return cache[key];
  if (budget.remaining <= 0) return null;
  budget.remaining -= 1;
  try {
    const res = await base44.functions.invoke('geocodeZip', { zip: key });
    const data = res?.data || res;
    if (data?.lat != null && data?.lng != null) {
      cache[key] = { lat: data.lat, lng: data.lng };
      return cache[key];
    }
  } catch (e) {
    console.error('ISO zip lookup failed:', key, e);
  }
  cache[key] = null;
  return null;
}

// Active buyer ISO posts within LOCAL_ISO_RADIUS_MILES of the operator's home base.
// Distance comes from the ISO's ZIP; a ZIP we cannot locate is reported, never guessed.
export async function loadLocalIsos(user) {
  const userZip =
    user?.operating_base?.geocoded_zip ||
    user?.business_address_zip ||
    user?.zip_code ||
    '';
  const cache = readCache();
  const budget = { remaining: MAX_ZIP_LOOKUPS };

  let base = null;
  if (user?.operating_base?.lat != null) {
    base = { lat: user.operating_base.lat, lng: user.operating_base.lng, zip: userZip };
  } else if (/^\d{5}$/.test(String(userZip).slice(0, 5))) {
    const coords = await zipCoords(userZip, cache, budget);
    if (coords) base = { ...coords, zip: String(userZip).slice(0, 5) };
  }
  writeCache(cache);

  if (!base) return { needsBase: true, items: [], totalActive: 0 };

  const res = await base44.entities.WantedItem.filter(
    { status: 'active' },
    { sort: '-created_date', limit: 100 }
  );
  const active = rows(res).filter(
    (w) => w.public_visibility !== false && w.buyer_id !== user?.id
  );

  const located = [];
  let unlocated = 0;
  for (const item of active) {
    const zip = String(item.zip_code || '').slice(0, 5);
    let coords = null;
    if (zip && base.zip && zip === base.zip) coords = { lat: base.lat, lng: base.lng };
    else coords = await zipCoords(zip, cache, budget);
    if (!coords) {
      unlocated += 1;
      continue;
    }
    const miles = milesBetween(base, coords);
    if (miles != null && miles <= LOCAL_ISO_RADIUS_MILES) located.push({ ...item, miles });
  }
  writeCache(cache);

  located.sort((a, b) => a.miles - b.miles || String(b.created_date).localeCompare(String(a.created_date)));

  return {
    needsBase: false,
    base,
    items: located,
    totalActive: active.length,
    unlocated,
  };
}