import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// This function discovers all unique city/county/state combos from EstateSale records
// and triggers hub generation for each. Designed to run daily.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Load all sales with address data (paginate in batches of 200)
    let allSales = [];
    let skip = 0;
    const batchSize = 200;
    while (true) {
      const batch = await base44.asServiceRole.entities.EstateSale.list('-created_date', batchSize, skip);
      if (!batch || batch.length === 0) break;
      allSales = allSales.concat(batch);
      if (batch.length < batchSize) break;
      skip += batchSize;
    }

    // Filter only sales with valid addresses
    const salesWithAddress = allSales.filter(s =>
      s.property_address?.city && s.property_address?.state
    );

    // Deduplicate cities
    const citySet = new Map();
    salesWithAddress.forEach(s => {
      const city = s.property_address.city.trim();
      const state = s.property_address.state.trim().toUpperCase();
      citySet.set(`${city}||${state}`, { city, state });
    });

    // Deduplicate counties (using region field)
    const countySet = new Map();
    salesWithAddress.forEach(s => {
      const county = (s.property_address.region || '').trim();
      const state = s.property_address.state.trim().toUpperCase();
      if (county) countySet.set(`${county}||${state}`, { county, state });
    });

    // Deduplicate states
    const stateSet = new Set(salesWithAddress.map(s => s.property_address.state.trim().toUpperCase()));

    const results = { cities: 0, counties: 0, states: 0, errors: [] };

    // Process cities — invoke generateCityHubPage for each
    for (const { city, state } of citySet.values()) {
      try {
        await base44.asServiceRole.functions.invoke('generateCityHubPage', { city, state });
        results.cities++;
      } catch (e) {
        results.errors.push(`city:${city},${state}: ${e.message}`);
      }
    }

    // Process counties
    for (const { county, state } of countySet.values()) {
      try {
        await base44.asServiceRole.functions.invoke('generateCountyHubPage', { county, state });
        results.counties++;
      } catch (e) {
        results.errors.push(`county:${county},${state}: ${e.message}`);
      }
    }

    // Process states
    for (const state of stateSet) {
      try {
        await base44.asServiceRole.functions.invoke('generateStateHubPage', { state });
        results.states++;
      } catch (e) {
        results.errors.push(`state:${state}: ${e.message}`);
      }
    }

    return Response.json({
      message: 'Local SEO hub refresh complete',
      cities_processed: results.cities,
      counties_processed: results.counties,
      states_processed: results.states,
      errors: results.errors.slice(0, 20),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});