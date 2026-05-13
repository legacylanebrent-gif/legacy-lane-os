import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import OpenAI from 'npm:openai';

const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });

// Use OpenAI to geocode a city/state/zip into lat, lng, city, county
async function geocodeWithOpenAI(company_name, city, state, zip) {
  const prompt = `You are a US geocoding assistant. Given a ZIP code, return the precise city, county, and coordinates for that ZIP code.

Company: ${company_name}
ZIP: ${zip || 'unknown'}
State: ${state}
Region hint (may be inaccurate): ${city}

Rules:
- The ZIP code is the most accurate piece of data — base geocoded_city and coordinates on the ZIP, not the region hint.
- geocoded_city must be the actual USPS city name for that specific ZIP code.
- geocoded_county must be the county that ZIP code falls in, with "County" suffix (e.g. "Orange County").
- lat/lng must be the coordinates for the center of that ZIP code.
- If no ZIP is provided, use the state and region hint as best guess.

Return a JSON object with exactly these fields (no extras):
- lat: number
- lng: number
- geocoded_city: string
- geocoded_county: string
- geocoded_zip: string
- geocoded_address: string (format: "City, ST ZIP")

Return valid JSON only, no explanation.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) return null;

  const data = JSON.parse(content);
  return {
    lat: data.lat || null,
    lng: data.lng || null,
    geocoded_city: data.geocoded_city || null,
    geocoded_county: data.geocoded_county || null,
    geocoded_zip: data.geocoded_zip || zip || null,
    geocoded_address: data.geocoded_address || null,
    geocode_status: 'geocoded',
    geocode_last_run: new Date().toISOString(),
  };
}

function extractZipFromUrl(url) {
  if (!url) return null;
  const match = url.match(/\/(\d{5})\//);
  return match ? match[1] : null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const batchSize = 20;
    const offset = body.offset || 0;
    const stateFilter = body.state || null;

    // Fetch all operators for this state (or all), then filter client-side
    // because some records have no geocode_status field at all (missing vs 'not_geocoded')
    const filterQuery = stateFilter ? { state: stateFilter } : {};

    const page = await base44.asServiceRole.entities.FutureEstateOperator.filter(
      filterQuery,
      'created_date',
      batchSize + 1,
      offset
    );

    // Include records with no geocode_status OR explicitly 'not_geocoded' OR 'failed'
    const needsGeocoding = (op) =>
      !op.geocode_status || op.geocode_status === 'not_geocoded' || op.geocode_status === 'failed';

    const batch = page.filter(needsGeocoding).slice(0, batchSize);
    const hasMore = page.length > batchSize;

    if (batch.length === 0 && !hasMore) {
      return Response.json({ done: true, processed: 0, message: 'All operators already geocoded.' });
    }
    if (batch.length === 0 && hasMore) {
      return Response.json({
        done: false, offset, nextOffset: offset + batchSize,
        processed: 0, hasMore, geocoded: 0, failed: 0, skipped: 0,
        message: `Offset ${offset}: all already geocoded, skipping to next batch.`
      });
    }

    const results = { geocoded: 0, failed: 0, skipped: 0 };

    for (const op of batch) {
      const zip = op.zip_code || op.geocoded_zip || extractZipFromUrl(op.source_url);

      if (!op.city && !op.state && !zip) {
        await base44.asServiceRole.entities.FutureEstateOperator.update(op.id, {
          geocode_status: 'skipped',
          geocode_last_run: new Date().toISOString(),
        });
        results.skipped++;
        continue;
      }

      try {
        const geo = await geocodeWithOpenAI(op.company_name, op.city, op.state, zip);
        if (geo) {
          await base44.asServiceRole.entities.FutureEstateOperator.update(op.id, geo);
          results.geocoded++;
        } else {
          await base44.asServiceRole.entities.FutureEstateOperator.update(op.id, {
            geocode_status: 'failed',
            geocode_last_run: new Date().toISOString(),
          });
          results.failed++;
        }
      } catch (e) {
        console.log(`[geocode] OpenAI error for ${op.company_name}: ${e.message}`);
        await base44.asServiceRole.entities.FutureEstateOperator.update(op.id, {
          geocode_status: 'failed',
          geocode_last_run: new Date().toISOString(),
        });
        results.failed++;
      }

      // Small delay to avoid rate limits
      await new Promise(r => setTimeout(r, 200));
    }

    return Response.json({
      done: !hasMore,
      offset,
      nextOffset: offset + batchSize,
      processed: batch.length,
      hasMore,
      ...results,
      message: hasMore
        ? `Batch at offset ${offset} complete. ${results.geocoded} geocoded, ${results.failed} failed, ${results.skipped} skipped.`
        : `All done! ${results.geocoded} geocoded, ${results.failed} failed, ${results.skipped} skipped.`,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});