import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { secrets } from 'base44:runtime';

const DEFAULT_RADIUS_MILES = 25;
const MAX_SCAN = 400;
const MAX_RETURN = 60;
const SORTS = ['newest', 'oldest', 'price_desc', 'price_asc', 'distance'];

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

function positiveNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Newest first is the product default. list_date arrives as MM/DD/YYYY.
function listedAt(row) {
  const raw = String(row.list_date || '');
  const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return Date.UTC(Number(m[3]), Number(m[1]) - 1, Number(m[2]));
  const parsed = Date.parse(raw);
  if (Number.isFinite(parsed)) return parsed;
  const created = Date.parse(String(row.created_date || ''));
  return Number.isFinite(created) ? created : 0;
}

function shape(row, miles) {
  return {
    id: row.id,
    property_address: row.property_address || '',
    unit_number: row.unit_number || '',
    city: row.city || '',
    state: row.state || '',
    zip: row.zip || '',
    county: row.county || '',
    list_price: row.list_price ?? null,
    estimated_value: row.estimated_value ?? null,
    listing_status: row.listing_status || '',
    property_status: row.property_status || '',
    list_date: row.list_date || '',
    days_on_market: row.days_on_market ?? null,
    mls_number: row.mls_number || '',
    beds: row.beds ?? null,
    baths: row.baths ?? null,
    square_feet: row.square_feet ?? null,
    lot_size: row.lot_size ?? null,
    year_built: row.year_built ?? null,
    property_type: row.property_type || '',
    listing_remarks: row.listing_remarks || '',
    last_sale_date: row.last_sale_date || '',
    last_sale_amount: row.last_sale_amount ?? null,
    listing_agent_name: row.listing_agent_name || '',
    listing_brokerage: row.listing_brokerage || '',
    listing_agent_phone: row.listing_agent_phone || '',
    listing_agent_email: row.listing_agent_email || '',
    listing_url: row.listing_url || '',
    estate_sale_score: row.estate_sale_score ?? null,
    estate_sale_score_label: row.estate_sale_score_label || '',
    source: row.source || '',
    miles,
    listed_at: listedAt(row),
  };
}

// Operator-facing MLS listings: only what falls inside the operator's own
// service area (radius around their business ZIP), then the operator's own
// distance / city / price filters, sorted newest-first by default.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth
      .me()
      .catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const input = body?.filters || {};
    const sort = SORTS.includes(input.sort) ? input.sort : 'newest';
    const cityFilter = Array.isArray(input.cities)
      ? input.cities.map((c) => String(c).trim().toLowerCase()).filter(Boolean)
      : [];
    const priceMin = positiveNumber(input.price_min);
    const priceMax = positiveNumber(input.price_max);

    const radiusInput = Number(user.service_radius_miles);
    const radiusMiles = radiusInput > 0 ? radiusInput : DEFAULT_RADIUS_MILES;
    const isAdmin = user.role === 'admin';

    const scan = await base44.asServiceRole.entities.PropstreamREListing.list(
      '-created_date',
      MAX_SCAN
    );
    const listings = Array.isArray(scan) ? scan : scan?.items || [];

    let base = null;
    if (isAdmin) {
      base = null;
    } else if (user.operating_base?.lat != null && user.operating_base?.lng != null) {
      base = { lat: user.operating_base.lat, lng: user.operating_base.lng };
    } else {
      const userZip =
        user.business_address_zip || user.zip_code || user.operating_base?.geocoded_zip || '';
      base = userZip ? await geocodeZip(userZip) : null;
      if (!base) {
        return Response.json({
          needs_base: true,
          scope: 'area',
          radius_miles: radiusMiles,
          base_zip: String(userZip || '').slice(0, 5),
          items: [],
          matched_count: 0,
          total_in_area: 0,
          cities: [],
        });
      }
    }

    const area = [];
    for (const row of listings) {
      if (base) {
        if (row.latitude == null || row.longitude == null) continue;
        const miles = milesBetween(base, { lat: row.latitude, lng: row.longitude });
        if (miles > radiusMiles) continue;
        area.push(shape(row, miles));
      } else {
        area.push(shape(row, null));
      }
    }

    const requestedMiles = positiveNumber(input.max_miles);
    const maxMiles = requestedMiles && base ? Math.min(requestedMiles, radiusMiles) : null;

    const cityCounts = new Map();
    for (const row of area) {
      if (maxMiles != null && row.miles != null && row.miles > maxMiles) continue;
      if (!row.city) continue;
      cityCounts.set(row.city, (cityCounts.get(row.city) || 0) + 1);
    }
    const cities = [...cityCounts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    const matched = area.filter((row) => {
      if (maxMiles != null && row.miles != null && row.miles > maxMiles) return false;
      if (cityFilter.length && !cityFilter.includes(String(row.city).toLowerCase())) return false;
      const price = Number(row.list_price);
      if (priceMin != null || priceMax != null) {
        if (!Number.isFinite(price) || price <= 0) return false;
        if (priceMin != null && price < priceMin) return false;
        if (priceMax != null && price > priceMax) return false;
      }
      return true;
    });

    const priceOf = (row) => (Number(row.list_price) > 0 ? Number(row.list_price) : null);
    matched.sort((a, b) => {
      if (sort === 'oldest') return a.listed_at - b.listed_at;
      if (sort === 'price_desc') return (priceOf(b) || 0) - (priceOf(a) || 0);
      if (sort === 'price_asc') {
        if (priceOf(a) == null && priceOf(b) == null) return b.listed_at - a.listed_at;
        if (priceOf(a) == null) return 1;
        if (priceOf(b) == null) return -1;
        return priceOf(a) - priceOf(b);
      }
      if (sort === 'distance' && base) {
        return (a.miles ?? Number.POSITIVE_INFINITY) - (b.miles ?? Number.POSITIVE_INFINITY);
      }
      return b.listed_at - a.listed_at;
    });

    return Response.json({
      needs_base: false,
      scope: base ? 'area' : 'all',
      radius_miles: radiusMiles,
      base_zip: String(
        user.business_address_zip || user.zip_code || user.operating_base?.geocoded_zip || ''
      ).slice(0, 5),
      items: matched.slice(0, MAX_RETURN),
      matched_count: matched.length,
      total_in_area: area.length,
      cities,
    });
  } catch (error) {
    console.error('operatorMlsListings failed:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}