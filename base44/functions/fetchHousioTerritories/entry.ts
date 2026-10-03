import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Houszu OS — public territoriesApi (partner credential, read-only)
const TERRITORIES_API_URL = 'https://houszuos.base44.app/functions/territoriesApi';

async function callApi(operation, apiKey, extra = {}) {
  const res = await fetch(TERRITORIES_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify({ operation, ...extra }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`Houszu territoriesApi ${operation} failed: ${res.status} ${json?.error || ''}`);
  }
  return json;
}

// Page through paged operations (max 500/page) until has_more is false
async function fetchAllPages(operation, apiKey, extra = {}) {
  const items = [];
  let offset = 0;
  while (true) {
    const json = await callApi(operation, apiKey, { ...extra, limit: 500, offset });
    const data = json?.data || {};
    const page = operation === 'micro_list' ? (data.micro_territories || []) : (data.territories || []);
    items.push(...page);
    if (!data.has_more || data.next_offset == null || page.length === 0) break;
    offset = data.next_offset;
  }
  return items;
}

// Join micros to territories by county name (micros carry a Mongo parent id that
// is not exposed on county-level territory records)
function enrichListWithCityCounts(territories, micros) {
  const cityCounts = {};
  let totalCities = 0;
  micros.forEach(mt => {
    const countyKey = (mt.county || '').toLowerCase();
    const cityCount = (mt.cities || []).length;
    if (countyKey) {
      cityCounts[countyKey] = (cityCounts[countyKey] || 0) + cityCount;
      totalCities += cityCount;
    }
  });
  const enriched = territories.map(t => {
    const county = Array.isArray(t.county) ? t.county[0] : t.county;
    return { ...t, cities_count: cityCounts[(county || '').toLowerCase()] || 0 };
  });
  return { enriched, totalCities };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = Deno.env.get('HOUSZU_TERRITORIES_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'HOUSZU_TERRITORIES_API_KEY not configured' }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    // Callers may send legacy `action` or `operation` — normalize to `operation`
    const action = body.action || body.operation;

    // Houszu territoriesApi is read-only — legacy write actions are no longer available
    if (action === 'micro_create' || action === 'micro_update') {
      return Response.json({ error: 'Houszu territoriesApi is read-only — micro_create/micro_update are not supported' }, { status: 400 });
    }

    // Paged list operations — fetch all pages, return a stable legacy-compatible shape
    if (action === 'list' || action === 'micro_list') {
      const filters = {};
      if (body.state) filters.state = body.state;
      if (body.county) filters.county = body.county;
      const items = await fetchAllPages(action, apiKey, filters);
      const key = action === 'micro_list' ? 'micro_territories' : 'territories';
      const payload = { ok: true, operation: action, [key]: items, total: items.length };

      if (action === 'list') {
        const micros = await fetchAllPages('micro_list', apiKey, body.state ? { state: body.state } : {});
        const { enriched, totalCities } = enrichListWithCityCounts(items, micros);
        payload.territories = enriched;
        payload.total_cities = totalCities;
        payload.total_active = enriched.filter(t => t.is_active !== false && (t.status || 'ACTIVE') === 'ACTIVE').length;
      }
      console.log('[fetchHousioTerritories]', action, 'returned', items.length, 'records');
      return Response.json(payload);
    }

    // Single-record and lookup operations — proxy directly
    const operationMap = { get: 'get', micro_get: 'micro_get', lookup: 'lookup', micro_lookup: 'micro_lookup' };
    const operation = operationMap[action];
    if (!operation) {
      return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    const payload = {};
    if (body.id) payload.id = body.id;
    if (body.territory_id) payload.territory_id = body.territory_id;
    if (body.name) payload.name = body.name;
    if (body.state) payload.state = body.state;
    if (body.county) payload.county = body.county;
    if (body.city) payload.city = body.city;

    const json = await callApi(operation, apiKey, payload);
    const data = json?.data || {};
    // Unwrap single-record payloads to the top level for caller compatibility
    if (data.territory) return Response.json({ ok: true, ...data.territory });
    if (data.micro_territory) return Response.json({ ok: true, ...data.micro_territory });
    return Response.json({ ok: true, ...data });
  } catch (error) {
    console.error('[fetchHousioTerritories] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});