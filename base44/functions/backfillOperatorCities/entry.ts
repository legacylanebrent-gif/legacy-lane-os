import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import OpenAI from 'npm:openai';

const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });

// Extract city slug and zip from EstateSales.net URL
// e.g. https://www.estatesales.net/companies/NJ/Pompton-Plains/07444/23261
// → { citySlug: "Pompton Plains", zip: "07444" }
function extractFromUrl(url) {
  if (!url) return { citySlug: null, zip: null };
  const match = url.match(/\/companies\/[A-Z]{2}\/([^/]+)\/(\d{5})\//);
  if (!match) return { citySlug: null, zip: null };
  const citySlug = match[1].replace(/-/g, ' ');
  const zip = match[2];
  return { citySlug, zip };
}

// Use OpenAI to get county + coords for a known city/zip/state
async function resolveWithOpenAI(citySlug, zip, state) {
  const prompt = `You are a US geocoding assistant.

City: ${citySlug}
ZIP: ${zip || 'unknown'}
State: ${state}

Return a JSON object with exactly these fields:
- lat: number (center of this city/zip)
- lng: number (center of this city/zip)
- geocoded_city: string (official USPS city name for this ZIP, e.g. "Pompton Plains")
- geocoded_county: string (county with "County" suffix, e.g. "Morris County")
- geocoded_zip: string (the ZIP code)
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
    geocoded_city: data.geocoded_city || citySlug || null,
    geocoded_county: data.geocoded_county || null,
    geocoded_zip: data.geocoded_zip || zip || null,
    geocoded_address: data.geocoded_address || null,
    geocode_status: 'geocoded',
    geocode_last_run: new Date().toISOString(),
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const batchSize = 25;
    const offset = body.offset || 0;
    const stateFilter = body.state || null;

    const filterQuery = stateFilter ? { state: stateFilter } : {};

    const page = await base44.asServiceRole.entities.FutureEstateOperator.filter(
      filterQuery,
      'created_date',
      batchSize + 1,
      offset
    );

    // Process all records — skip only those already successfully geocoded
    const batch = page
      .filter(op => op.geocode_status !== 'geocoded')
      .slice(0, batchSize);

    const hasMore = page.length > batchSize;

    if (batch.length === 0 && !hasMore) {
      return Response.json({ done: true, processed: 0, message: 'All operators already resolved.' });
    }
    if (batch.length === 0 && hasMore) {
      return Response.json({ done: false, offset, nextOffset: offset + batchSize, processed: 0, hasMore, geocoded: 0, failed: 0, skipped: 0 });
    }

    const results = { geocoded: 0, failed: 0, skipped: 0 };

    for (const op of batch) {
      const { citySlug, zip } = extractFromUrl(op.source_url);

      // If we can't extract anything useful, skip
      if (!citySlug && !zip && !op.state) {
        await base44.asServiceRole.entities.FutureEstateOperator.update(op.id, {
          geocode_status: 'skipped',
          geocode_last_run: new Date().toISOString(),
        });
        results.skipped++;
        continue;
      }

      try {
        const geo = await resolveWithOpenAI(citySlug, zip, op.state);
        if (geo) {
          // Also backfill zip_code field if it was empty
          const updateData = { ...geo };
          if (!op.zip_code && zip) updateData.zip_code = zip;
          await base44.asServiceRole.entities.FutureEstateOperator.update(op.id, updateData);
          results.geocoded++;
        } else {
          await base44.asServiceRole.entities.FutureEstateOperator.update(op.id, {
            geocode_status: 'failed',
            geocode_last_run: new Date().toISOString(),
          });
          results.failed++;
        }
      } catch (e) {
        console.log(`[backfill] Error for ${op.company_name}: ${e.message}`);
        await base44.asServiceRole.entities.FutureEstateOperator.update(op.id, {
          geocode_status: 'failed',
          geocode_last_run: new Date().toISOString(),
        });
        results.failed++;
      }

      await new Promise(r => setTimeout(r, 150));
    }

    return Response.json({
      done: !hasMore,
      offset,
      nextOffset: offset + batchSize,
      processed: batch.length,
      hasMore,
      ...results,
      message: hasMore
        ? `Batch at offset ${offset} complete. ${results.geocoded} resolved, ${results.failed} failed, ${results.skipped} skipped.`
        : `All done! ${results.geocoded} resolved, ${results.failed} failed, ${results.skipped} skipped.`,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});