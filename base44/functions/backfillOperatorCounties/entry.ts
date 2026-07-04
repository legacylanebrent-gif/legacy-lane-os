import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

async function resolveCounty(base44, op) {
  const city = op.geocoded_city || op.city || '';
  const state = op.state || '';
  const zip = op.geocoded_zip || op.zip_code || '';

  const prompt = `You are a US geocoding assistant. Given a city, state, and ZIP code, return the county name.

City: ${city}
State: ${state}
ZIP: ${zip || 'unknown'}

Return a JSON object with exactly this field:
- geocoded_county: string (county name with "County" suffix, e.g. "Orange County")

Return valid JSON only, no explanation.`;

  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: 'object',
      properties: {
        geocoded_county: { type: 'string' },
      },
    },
  });

  return result?.geocoded_county || null;
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
    const batchSize = 25;
    const stateFilter = body.state || null;

    const filterQuery = stateFilter ? { state: stateFilter } : {};

    const needsCounty = (op) => !op.geocoded_county && !op.county;

    // Auto-advance: scan forward in chunks of 100 until we find operators needing county
    let scanOffset = 0;
    let batch = [];
    let hasMore = false;
    let skippedOffsets = 0;

    while (batch.length === 0 && scanOffset < 5000) {
      const page = await base44.asServiceRole.entities.FutureEstateOperator.filter(
        filterQuery,
        'created_date',
        101,
        scanOffset
      );

      const candidates = page.filter(needsCounty);
      batch = candidates.slice(0, batchSize);
      hasMore = page.length > 100;

      if (batch.length === 0) {
        skippedOffsets++;
        scanOffset += 100;
        if (!hasMore) break;
      }
    }

    if (batch.length === 0 && !hasMore) {
      return Response.json({ done: true, processed: 0, skippedOffsets, message: 'All operators already have county data.' });
    }
    if (batch.length === 0 && hasMore) {
      return Response.json({
        done: false, offset: scanOffset, skippedOffsets,
        processed: 0, hasMore, resolved: 0, failed: 0, skipped: 0,
        message: `Scanned ${skippedOffsets} chunks, all already have county. More records exist.`
      });
    }

    const results = { resolved: 0, failed: 0, skipped: 0 };

    for (const op of batch) {
      // Need some data to work with
      const hasData = op.city || op.state || op.geocoded_zip || op.zip_code || extractZipFromUrl(op.source_url);
      if (!hasData) {
        results.skipped++;
        continue;
      }

      try {
        const county = await resolveCounty(base44, op);
        if (county) {
          await base44.asServiceRole.entities.FutureEstateOperator.update(op.id, {
            geocoded_county: county,
          });
          results.resolved++;
        } else {
          results.failed++;
        }
      } catch (e) {
        console.log(`[backfillCounty] Error for ${op.company_name}: ${e.message}`);
        results.failed++;
      }

      await new Promise(r => setTimeout(r, 200));
    }

    return Response.json({
      done: !hasMore,
      offset: scanOffset,
      processed: batch.length,
      hasMore,
      skippedOffsets,
      ...results,
      message: hasMore
        ? `Batch at offset ${scanOffset} complete. ${results.resolved} counties resolved, ${results.failed} failed, ${results.skipped} skipped. ${skippedOffsets} chunks skipped.`
        : `All done! ${results.resolved} counties resolved, ${results.failed} failed, ${results.skipped} skipped. ${skippedOffsets} chunks skipped.`,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});