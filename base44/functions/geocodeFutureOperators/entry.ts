import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import OpenAI from 'npm:openai';

const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });

// Use OpenAI to geocode a city/state/zip into lat, lng, city, county
async function geocodeWithOpenAI(company_name, city, state, zip) {
  const prompt = `You are a geocoding assistant. Given the following estate sale company location, return accurate geographic data.

Company: ${company_name}
City label: ${city}
State: ${state}
ZIP: ${zip || 'unknown'}

Return a JSON object with these exact fields:
- lat: latitude (number)
- lng: longitude (number)  
- geocoded_city: the actual city name (string)
- geocoded_county: the full county name including "County" (e.g. "Orange County") (string)
- geocoded_zip: the ZIP code (string, use provided one if available)
- geocoded_address: a formatted address string like "City, ST ZIP"

Use your knowledge of US geography. If the city label is a region like "Los Angeles Orange County", determine the most likely actual city based on the ZIP code if provided, or use the most central city in that region. Always return valid JSON only, no explanation.`;

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

    // Fetch a page of operators
    const page = await base44.asServiceRole.entities.FutureEstateOperator.list(
      'created_date',
      batchSize,
      offset
    );

    // Filter to only those needing geocoding (include 'failed' for retry)
    const batch = page.filter(op =>
      !op.geocode_status || op.geocode_status === 'not_geocoded' || op.geocode_status === 'failed'
    );
    const hasMore = page.length === batchSize;

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