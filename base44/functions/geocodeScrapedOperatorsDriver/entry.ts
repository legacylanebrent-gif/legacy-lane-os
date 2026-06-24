import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Self-driving backfill: finds un-geocoded scraped operators across all three
// entities and geocodes them by city+state using Google Maps, one state at a
// time, conservative batches. Runs until a time budget (~85s) is hit, then
// returns so a scheduled automation can re-invoke it. Idempotent — always
// queries for records missing lat/lng, so it's safe to run repeatedly.

const ENTITIES = ['FutureEstateOperator', 'EstatesalesOrgOperator', 'FutureOperatorLead'];
const TIME_BUDGET_MS = 85000;
const BATCH_SIZE = 10;
const DELAY_MS = 500;

async function geocodeCityState(city, state, apiKey) {
  const address = `${city}, ${state}`;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&components=country:US|administrative_area:${state}&key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status !== 'OK' || !data.results?.[0]) return null;
  const result = data.results[0];
  const { lat, lng } = result.geometry.location;
  let county = null;
  for (const comp of result.address_components) {
    if (comp.types.includes('administrative_area_level_2')) { county = comp.long_name; break; }
  }
  let canonicalCity = null;
  for (const comp of result.address_components) {
    if (comp.types.includes('locality') || comp.types.includes('postal_town') || comp.types.includes('administrative_area_level_3')) {
      canonicalCity = comp.long_name; break;
    }
  }
  return {
    lat, lng,
    geocoded_city: canonicalCity || city,
    geocoded_county: county,
    geocoded_address: result.formatted_address,
    geocode_status: 'geocoded',
    geocode_last_run: new Date().toISOString(),
  };
}

function getCityState(record, entityName) {
  if (entityName === 'EstatesalesOrgOperator') return { city: record.base_city, state: record.base_state };
  return { city: record.city, state: record.state };
}

Deno.serve(async (req) => {
  const started = Date.now();
  try {
    const base44 = createClientFromRequest(req);
    // Scheduled automations run without a user context — allow them to proceed.
    // For manual/HTTP invocations, require admin.
    const user = await base44.auth.me().catch(() => null);
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }
    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!apiKey) return Response.json({ error: 'GOOGLE_MAPS_API_KEY not set' }, { status: 500 });

    const body = await req.json().catch(() => ({}));
    const forceState = body.state || null;

    const totals = { geocoded: 0, failed: 0, skipped: 0, batches: 0 };
    const progress = [];
    let timeUp = false;

    outer:
    for (const entityName of ENTITIES) {
      const entity = base44.asServiceRole.entities[entityName];
      const filterField = entityName === 'EstatesalesOrgOperator' ? 'base_state' : 'state';

      // Determine which states have records for this entity
      let statesToProcess;
      if (forceState) {
        statesToProcess = [forceState];
      } else {
        // Pull a large sample to find states with un-geocoded records
        const sample = await entity.list('-created_date', 500, 0).catch(() => []);
        const stateSet = new Set();
        for (const r of sample) {
          if (!r.lat || !r.lng) {
            const s = entityName === 'EstatesalesOrgOperator' ? r.base_state : r.state;
            if (s && s.length === 2) stateSet.add(s);
          }
        }
        statesToProcess = [...stateSet].sort();
        // If this sample page is fully geocoded, we may still have un-geocoded
        // records deeper — but we'll catch them on later runs. Move on.
      }

      for (const state of statesToProcess) {
        if (Date.now() - started > TIME_BUDGET_MS) { timeUp = true; break outer; }

        let offset = 0;
        let stateGeocoded = 0;
        let stateFailed = 0;
        let consecutiveEmpty = 0;

        while (Date.now() - started < TIME_BUDGET_MS) {
          const page = await entity.filter({ [filterField]: state }, 'created_date', BATCH_SIZE + 5, offset).catch(() => []);
          if (!page || page.length === 0) break;
          const batch = page.filter((r) => !r.lat || !r.lng).slice(0, BATCH_SIZE);

          if (batch.length === 0) {
            consecutiveEmpty++;
            offset += BATCH_SIZE;
            // If we've seen several empty pages in a row, this state is done
            if (consecutiveEmpty > 3 || page.length < BATCH_SIZE) break;
            continue;
          }
          consecutiveEmpty = 0;

          for (const record of batch) {
            if (Date.now() - started > TIME_BUDGET_MS) { timeUp = true; break; }
            const { city, state: recState } = getCityState(record, entityName);
            const effectiveState = recState || state;
            if (!city && !effectiveState) {
              await entity.update(record.id, { geocode_status: 'skipped', geocode_last_run: new Date().toISOString() }).catch(() => {});
              totals.skipped++;
              continue;
            }
            try {
              const geo = await geocodeCityState(city, effectiveState, apiKey);
              if (geo) {
                await entity.update(record.id, geo);
                totals.geocoded++;
                stateGeocoded++;
              } else {
                await entity.update(record.id, { geocode_status: 'failed', geocode_last_run: new Date().toISOString() }).catch(() => {});
                totals.failed++;
                stateFailed++;
              }
            } catch (e) {
              await entity.update(record.id, { geocode_status: 'failed', geocode_last_run: new Date().toISOString() }).catch(() => {});
              totals.failed++;
              stateFailed++;
            }
            await new Promise((r) => setTimeout(r, DELAY_MS));
          }

          totals.batches++;
          offset += BATCH_SIZE;
          if (page.length < BATCH_SIZE) break;
        }

        progress.push({ entity: entityName, state, geocoded: stateGeocoded, failed: stateFailed });
        if (timeUp) break outer;
      }
      if (timeUp) break;
    }

    return Response.json({
      done: !timeUp,
      elapsedMs: Date.now() - started,
      ...totals,
      progress,
      message: timeUp
        ? `Time budget reached. Geocoded ${totals.geocoded}, failed ${totals.failed}, skipped ${totals.skipped} across ${totals.batches} batches. Re-invoke to continue.`
        : `Backfill pass complete. Geocoded ${totals.geocoded}, failed ${totals.failed}, skipped ${totals.skipped}.`,
    });
  } catch (error) {
    console.error('[geocodeScrapedOperatorsDriver] error:', error);
    return Response.json({ error: error.message, elapsedMs: Date.now() - started }, { status: 500 });
  }
});