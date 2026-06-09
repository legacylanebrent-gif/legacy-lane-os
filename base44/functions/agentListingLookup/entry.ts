import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Simple in-memory rate limiting
const requestLog = new Map();
function isRateLimited(ip) {
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  const maxReqs = 30;
  const reqs = (requestLog.get(ip) || []).filter(t => now - t < windowMs);
  reqs.push(now);
  requestLog.set(ip, reqs);
  return reqs.length > maxReqs;
}

const SAFE_FIELDS = [
  'id', 'property_address', 'city', 'state', 'zip', 'county',
  'list_price', 'listing_status', 'listing_agent_name', 'listing_brokerage',
  'beds', 'baths', 'square_feet', 'year_built', 'territory_id',
  'territory_name', 'matched_operator_ids', 'estate_sale_score',
  'estate_sale_score_label', 'agent_submitted_to_pool'
];

const filterSafe = (l) => {
  const safe = {};
  SAFE_FIELDS.forEach(f => { if (l[f] !== undefined) safe[f] = l[f]; });
  return safe;
};

Deno.serve(async (req) => {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown';
    if (isRateLimited(ip)) {
      return Response.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { action, state, city, query } = body;

    if (action === 'get_states') {
      const listings = await base44.asServiceRole.entities.PropstreamREListing.list('-created_date', 5000);
      const active = listings.filter(l => !l.listing_status || l.listing_status.toLowerCase().includes('active'));
      const states = [...new Set(active.map(l => l.state).filter(Boolean))].sort();
      return Response.json({ states });
    }

    if (action === 'get_cities' && state) {
      const listings = await base44.asServiceRole.entities.PropstreamREListing.filter({ state }, '-created_date', 2000);
      const active = listings.filter(l => !l.listing_status || l.listing_status.toLowerCase().includes('active'));
      const cities = [...new Set(active.map(l => l.city).filter(Boolean))].sort();
      return Response.json({ cities });
    }

    if (action === 'search' && state && query && query.length >= 3) {
      const listings = await base44.asServiceRole.entities.PropstreamREListing.filter({ state }, '-created_date', 2000);
      const q = query.toLowerCase();
      const results = listings.filter(l =>
        (!l.listing_status || l.listing_status.toLowerCase().includes('active')) &&
        (!city || l.city?.toLowerCase() === city.toLowerCase()) &&
        (l.property_address?.toLowerCase().includes(q) ||
         l.zip?.includes(q) ||
         l.city?.toLowerCase().includes(q))
      ).slice(0, 15);
      return Response.json({ listings: results.map(filterSafe) });
    }

    return Response.json({ states: [], cities: [], listings: [] });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});