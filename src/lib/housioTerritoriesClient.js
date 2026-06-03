import { base44 } from '@/api/base44Client';

async function call(payload) {
  const res = await base44.functions.invoke('fetchHousioTerritories', payload);
  return res.data;
}

export const housioTerritories = {
  // ── TERRITORIES ──────────────────────────────────────────────
  list: (filters = {}) => call({ action: 'list', ...filters }),
  get: (id) => call({ action: 'get', id }),
  lookup: ({ state, county, city }) => call({ action: 'lookup', state, county, city }),

  // ── MICRO TERRITORIES ────────────────────────────────────────
  microList: (filters = {}) => call({ action: 'micro_list', ...filters }),
  microGet: (id) => call({ action: 'micro_get', id }),
  microLookup: ({ state, county, city }) => call({ action: 'micro_lookup', state, county, city }),
  microCreate: (data) => call({ action: 'micro_create', ...data }),
  microUpdate: (id, updates) => call({ action: 'micro_update', id, ...updates }),
};