import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { secrets } from 'base44:runtime';

const DEFAULT_RADIUS_MILES = 25;
const MAX_SCAN = 400;
const MAX_RETURN = 40;

const zipCache = new Map();

function milesBetween(a, b) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(3958.8 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)) * 10) / 10;
}

async function geocodeZip(zip) {
  const key = String(zip || '').slice(0, 5);
  if (!/^\d{5}$/.test(key)) return null;
  if (zipCache.has(key)) return zipCache.get(key);
  const apiKey = secrets.get('GOOGLE_MAPS_API_KEY');
  let coords = null;
  if (apiKey) {
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(key)}&components=country:US&key=${apiKey}`,
        { signal: AbortSignal.timeout(10000) }
      );
      const data = await res.json();
      const loc = data?.results?.[0]?.geometry?.location;
      if (data?.status === 'OK' && loc) coords = { lat: loc.lat, lng: loc.lng };
    } catch (error) {
      console.error('operatorMlsListings geocodeZip failed:', key, error.message);
    }
  }
  zipCache.set(key, coords);
  return coords;
}

// Operator-facing MLS listings: only what falls inside the operator's own
// service area (radius around their business ZIP). The base and radius are
// always derived from the signed-in user, never from the request.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth
      .me()
      .catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const radiusInput = Number(user.service_radius_miles);
    const radiusMiles = radiusInput > 0 ? radiusInput : DEFAULT_RADIUS_MILES;

    const isAdmin = user.role === 'admin';

    const scan = await base44.asServiceRole.entities.PropstreamREListing.list(
      '-created_date',
      MAX_SCAN
    );
    const listings = Array.isArray(scan) ? scan : scan?.items || [];

    const shape = (row, miles) => ({
      id: row.id,
      property_address: row.property_address || '',
      city: row.city || '',
      state: row.state || '',
      zip: row.zip || '',
      list_price: row.list_price ?? null,
      listing_status: row.listing_status || '',
      list_date: row.list_date || '',
      miles,
    });

    if (isAdmin) {
      return Response.json({
        needs_base: false,
        scope: 'all',
        radius_miles: radiusMiles,
        base_zip: '',
        items: listings.slice(0, MAX_RETURN).map((row) => shape(row, null)),
        total_in_area: listings.length,
      });
    }

    const userZip =
      user.business_address_zip || user.zip_code || user.operating_base?.geocoded_zip || '';
    let base = null;
    if (user.operating_base?.lat != null && user.operating_base?.lng != null) {
      base = { lat: user.operating_base.lat, lng: user.operating_base.lng };
    } else if (userZip) {
      base = await geocodeZip(userZip);
    }

    if (!base) {
      return Response.json({
        needs_base: true,
        scope: 'area',
        radius_miles: radiusMiles,
        base_zip: String(userZip || '').slice(0, 5),
        items: [],
        total_in_area: 0,
      });
    }

    const inArea = [];
    for (const row of listings) {
      if (row.latitude == null || row.longitude == null) continue;
      const miles = milesBetween(base, { lat: row.latitude, lng: row.longitude });
      if (miles <= radiusMiles) inArea.push({ row, miles });
    }
    inArea.sort((a, b) => a.miles - b.miles);

    return Response.json({
      needs_base: false,
      scope: 'area',
      radius_miles: radiusMiles,
      base_zip: String(userZip || '').slice(0, 5),
      items: inArea.slice(0, MAX_RETURN).map(({ row, miles }) => shape(row, miles)),
      total_in_area: inArea.length,
    });
  } catch (error) {
    console.error('operatorMlsListings failed:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}