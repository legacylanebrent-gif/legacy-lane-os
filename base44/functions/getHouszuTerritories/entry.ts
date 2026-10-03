import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Houszu OS — public territoriesApi (partner credential, read-only)
const HOUSZU_BASE_URL = 'https://houszuos.base44.app/functions/territoriesApi';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { action = 'list', state, state_dump_state, territory_id, id, city, county, status } = body;

    const HOUSZU_KEY = Deno.env.get('HOUSZU_TERRITORIES_API_KEY');
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': HOUSZU_KEY,
    };

    const callApi = async (payload) => {
      const res = await fetch(HOUSZU_BASE_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...payload }),
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { data = { raw: text }; }
      return { status: res.status, data: data?.data || data };
    };

    // Handle specific actions
    if (action === 'state_dump') {
      const targetState = state_dump_state || state;
      if (!targetState) return Response.json({ error: 'state is required for state_dump' }, { status: 400 });
      const result = await callApi({ operation: 'state_dump', state: targetState });
      return Response.json(result.data, { status: result.status });
    }

    if (action === 'list') {
      const payload = { operation: 'list' };
      if (state) payload.state = state;
      if (status) payload.status = status;
      const result = await callApi(payload);
      return Response.json(result.data, { status: result.status });
    }

    if (action === 'get') {
      if (!id && !territory_id) return Response.json({ error: 'id or territory_id required' }, { status: 400 });
      const result = await callApi({ operation: 'get', territory_id: id || territory_id });
      return Response.json(result.data, { status: result.status });
    }

    if (action === 'lookup') {
      if (!state) return Response.json({ error: 'state is required for lookup' }, { status: 400 });
      const payload = { operation: 'lookup', state };
      if (county) payload.county = county;
      if (city) payload.city = city;
      const result = await callApi(payload);
      return Response.json(result.data, { status: result.status });
    }

    if (action === 'micro_list') {
      const payload = { operation: 'micro_list' };
      if (territory_id) payload.territory_id = territory_id;
      if (state) payload.state = state;
      if (county) payload.county = county;
      if (status) payload.status = status;
      const result = await callApi(payload);
      return Response.json(result.data, { status: result.status });
    }

    if (action === 'micro_get') {
      if (!id) return Response.json({ error: 'id required for micro_get' }, { status: 400 });
      const result = await callApi({ operation: 'micro_get', id });
      return Response.json(result.data, { status: result.status });
    }

    if (action === 'micro_lookup') {
      if (!state) return Response.json({ error: 'state is required for micro_lookup' }, { status: 400 });
      const payload = { operation: 'micro_lookup', state };
      if (county) payload.county = county;
      if (city) payload.city = city;
      const result = await callApi(payload);
      return Response.json(result.data, { status: result.status });
    }

    if (action === 'city_coverage') {
      if (!state || !city) return Response.json({ error: 'state and city required for city_coverage' }, { status: 400 });
      const payload = { operation: 'city_coverage', state, city };
      if (county) payload.county = county;
      const result = await callApi(payload);
      return Response.json(result.data, { status: result.status });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});