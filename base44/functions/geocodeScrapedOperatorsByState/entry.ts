import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// City-level geocoding for scraped estate-sale operators using Google Maps
// Geocoding API (free, keyed via GOOGLE_MAPS_API_KEY). Processes ONE state at
// a time in conservative batches to avoid rate limits. Handles all three
// scraped operator entities: FutureEstateOperator, EstatesalesOrgOperator,
// and FutureOperatorLead.

const ENTITY_HANDLES = {
  FutureEstateOperator: 'FutureEstateOperator',
  EstatesalesOrgOperator: 'EstatesalesOrgOperator',
  FutureOperatorLead: 'FutureOperatorLead',
};

async function geocodeCityState(city, state) {
  const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
  if (!apiKey) throw new Error('GOOGLE_MAPS_API_KEY not set');
  const address = `${city}, ${state}`;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&components=country:US|administrative_area:${state}&key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status !== 'OK' || !data.results?.[0]) {
    return null;
  }
  const result = data.results[0];
  const { lat, lng } = result.geometry.location;
  // Extract county from address components
  let county = null;
  for (const comp of result.address_components) {
    if (comp.types.includes('administrative_area_level_2')) {
      county = comp.long_name;
      break;
    }
  }
  // Extract canonical city (locality or postal_town)
  let canonicalCity = null;
  for (const comp of result.address_components) {
    if (comp.types.includes('locality') || comp.types.includes('postal_town') || comp.types.includes('administrative_area_level_3')) {
      canonicalCity = comp.long_name;
      break;
    }
  }
  return {
    lat,
    lng,
    geocoded_city: canonicalCity || city,
    geocoded_county: county,
    geocoded_address: result.formatted_address,
    geocode_status: 'geocoded',
    geocode_last_run: new Date().toISOString(),
  };
}

function getCityState(record, entityName) {
  if (entityName === 'EstatesalesOrgOperator') {
    return { city: record.base_city, state: record.base_state };
  }
  return { city: record.city, state: record.state };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const state = body.state;
    if (!state || state.length !== 2) {
      return Response.json({ error: 'Valid 2-letter state code required' }, { status: 400 });
    }
    const batchSize = Math.min(body.batchSize || 15, 25);
    const entityName = body.entity || 'FutureEstateOperator';
    const offset = body.offset || 0;

    const entityHandle = ENTITY_HANDLES[entityName];
    if (!entityHandle) {
      return Response.json({ error: `Unknown entity: ${entityName}` }, { status: 400 });
    }
    const entity = base44.asServiceRole.entities[entityHandle];

    // Build a state filter. EstatesalesOrgOperator uses base_state.
    const filterField = entityName === 'EstatesalesOrgOperator' ? 'base_state' : 'state';
    const page = await entity.filter({ [filterField]: state }, 'created_date', batchSize + 5, offset);

    // Only geocode records missing lat/lng
    const needsGeo = (r) => !r.lat || !r.lng;
    const batch = page.filter(needsGeo).slice(0, batchSize);
    const hasMore = page.length > batchSize + 4 || (page.length === batchSize + 5 && batch.length === batchSize);

    if (batch.length === 0) {
      return Response.json({
        done: !hasMore,
        entity: entityName,
        state,
        offset,
        nextOffset: offset + batchSize,
        processed: 0,
        geocoded: 0,
        failed: 0,
        skipped: 0,
        hasMore,
        message: hasMore
          ? `Offset ${offset}: no un-geocoded records in this page, advancing.`
          : `All ${entityName} records for ${state} are geocoded.`,
      });
    }

    const results = { geocoded: 0, failed: 0, skipped: 0 };
    const errors = [];

    for (const record of batch) {
      const { city, state: recState } = getCityState(record, entityName);
      const effectiveState = recState || state;

      if (!city && !effectiveState) {
        await entity.update(record.id, {
          geocode_status: 'skipped',
          geocode_last_run: new Date().toISOString(),
        });
        results.skipped++;
        continue;
      }

      try {
        const geo = await geocodeCityState(city, effectiveState);
        if (geo) {
          await entity.update(record.id, geo);
          results.geocoded++;
        } else {
          await entity.update(record.id, {
            geocode_status: 'failed',
            geocode_last_run: new Date().toISOString(),
          });
          results.failed++;
        }
      } catch (e) {
        console.log(`[geocodeScraped] ${entityName} ${record.company_name}: ${e.message}`);
        errors.push({ id: record.id, name: record.company_name, error: e.message });
        try {
          await entity.update(record.id, {
            geocode_status: 'failed',
            geocode_last_run: new Date().toISOString(),
          });
        } catch (_) {}
        results.failed++;
      }

      // Conservative delay to respect Google Maps rate limits
      await new Promise((r) => setTimeout(r, 250));
    }

    return Response.json({
      done: !hasMore,
      entity: entityName,
      state,
      offset,
      nextOffset: offset + batchSize,
      processed: batch.length,
      hasMore,
      ...results,
      errors: errors.slice(0, 5),
      message: hasMore
        ? `${entityName} ${state} batch @${offset}: ${results.geocoded} geocoded, ${results.failed} failed, ${results.skipped} skipped.`
        : `${entityName} ${state} complete: ${results.geocoded} geocoded, ${results.failed} failed, ${results.skipped} skipped.`,
    });
  } catch (error) {
    console.error('[geocodeScrapedOperatorsByState] error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});