import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const GOOGLE_MAPS_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');
const OPENAI_KEY = Deno.env.get('OPENAI_API_KEY');

// Normalize a phone number to digits only
function normalizePhone(phone) {
  return (phone || '').replace(/\D/g, '');
}

// Build a dedup key: prefer normalized phone, fallback to company+state lowercase
function dedupKey(record, stateField = 'state') {
  const phone = normalizePhone(record.phone);
  if (phone && phone.length >= 7) return `phone:${phone}`;
  const name = (record.company_name || '').toLowerCase().trim().replace(/\s+/g, ' ');
  const state = (record[stateField] || '').toUpperCase();
  return `name:${name}|${state}`;
}

// Check if a record is already "complete" (has email + geocode)
function isComplete(r) {
  return !!(r.email && r.geocode_status === 'geocoded' && r.lat && r.lng);
}

async function geocodeRecord(record) {
  const query = [record.city || record.geocoded_city, record.state, record.zip_code || record.geocoded_zip].filter(Boolean).join(', ');
  if (!query || !GOOGLE_MAPS_KEY) return null;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status !== 'OK' || !data.results?.[0]) return null;
  const result = data.results[0];
  const components = result.address_components || [];
  const get = (type) => components.find(c => c.types.includes(type))?.long_name || '';
  const getShort = (type) => components.find(c => c.types.includes(type))?.short_name || '';
  return {
    lat: result.geometry.location.lat,
    lng: result.geometry.location.lng,
    geocoded_city: get('locality') || get('sublocality') || get('neighborhood'),
    geocoded_county: get('administrative_area_level_2'),
    geocoded_zip: getShort('postal_code'),
    geocode_status: 'geocoded',
  };
}

async function enrichEmail(base44ServiceRole, leadId, record) {
  // Try to find email by calling the existing enrichCompanyEmail logic inline
  // We look for email in website or use a simple search pattern
  if (!record.website && !record.company_name) return null;

  // Use OpenAI to guess/search for email
  if (!OPENAI_KEY) return null;
  const prompt = `Find the contact email address for this estate sale company:
Company: ${record.company_name}
City: ${record.city || record.geocoded_city}, ${record.state}
Website: ${record.website || 'unknown'}
Phone: ${record.phone || 'unknown'}

Return ONLY a valid email address string, or the word "none" if you cannot find one. No explanation.`;

  const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 50,
      temperature: 0,
    }),
  });
  const aiData = await aiRes.json();
  const raw = (aiData.choices?.[0]?.message?.content || '').trim().toLowerCase();
  if (raw && raw !== 'none' && raw.includes('@') && raw.includes('.')) {
    return raw;
  }
  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { action, offset = 0, batch_size = 50, state } = body;

    // ── ACTION: dedup ──
    // Reads records from both source tables (optionally filtered by state),
    // identifies unique ones by dedup key, and upserts them into FutureOperatorLead.
    if (action === 'dedup') {
      const pageSize = 1000;
      const seenKeys = new Set();
      const toUpsert = [];

      // Load existing dedup keys from FutureOperatorLead so we don't re-insert
      const existingLeads = [];
      let skip = 0;
      const existingFilter = state ? { state } : {};
      while (true) {
        const batch = state
          ? await base44.asServiceRole.entities.FutureOperatorLead.filter(existingFilter, '-created_date', pageSize, skip)
          : await base44.asServiceRole.entities.FutureOperatorLead.list('-created_date', pageSize, skip);
        existingLeads.push(...batch);
        if (batch.length < pageSize) break;
        skip += pageSize;
      }
      const existingKeys = new Set(existingLeads.map(l => l.dedup_key).filter(Boolean));

      // Load FutureEstateOperator (filtered by state if provided)
      skip = 0;
      while (true) {
        const batch = state
          ? await base44.asServiceRole.entities.FutureEstateOperator.filter({ state }, '-created_date', pageSize, skip)
          : await base44.asServiceRole.entities.FutureEstateOperator.list('-created_date', pageSize, skip);
        for (const rec of batch) {
          const key = dedupKey(rec, 'state');
          if (seenKeys.has(key)) continue;
          seenKeys.add(key);
          if (existingKeys.has(key)) continue;
          toUpsert.push({
            company_name: rec.company_name,
            email: rec.email || '',
            phone: rec.phone || '',
            website: rec.website_url || rec.website || '',
            city: rec.geocoded_city || rec.city || '',
            state: rec.state || '',
            zip_code: rec.geocoded_zip || rec.zip_code || '',
            county: rec.geocoded_county || rec.county || '',
            facebook: rec.facebook || '',
            instagram: rec.instagram || '',
            lat: rec.lat || null,
            lng: rec.lng || null,
            geocode_status: rec.geocode_status === 'geocoded' ? 'geocoded' : 'not_geocoded',
            enrichment_status: rec.enrichment_status || 'not_started',
            process_status: isComplete(rec) ? 'complete' : 'pending',
            source: 'estatesales_net',
            source_id: rec.id,
            dedup_key: key,
          });
        }
        if (batch.length < pageSize) break;
        skip += pageSize;
      }

      // Load EstatesalesOrgOperator (filtered by base_state if state provided)
      skip = 0;
      while (true) {
        const batch = state
          ? await base44.asServiceRole.entities.EstatesalesOrgOperator.filter({ base_state: state }, '-created_date', pageSize, skip)
          : await base44.asServiceRole.entities.EstatesalesOrgOperator.list('-created_date', pageSize, skip);
        for (const rec of batch) {
          const key = dedupKey(rec, 'base_state');
          if (seenKeys.has(key)) continue;
          seenKeys.add(key);
          if (existingKeys.has(key)) continue;
          toUpsert.push({
            company_name: rec.company_name,
            email: rec.email || '',
            phone: rec.phone || '',
            website: rec.website_url || '',
            city: rec.base_city || '',
            state: rec.base_state || '',
            zip_code: '',
            county: '',
            facebook: rec.has_facebook ? '' : '',
            instagram: '',
            lat: null,
            lng: null,
            geocode_status: 'not_geocoded',
            enrichment_status: rec.enrichment_status || 'not_started',
            process_status: 'pending',
            source: 'estatesales_org',
            source_id: rec.id,
            dedup_key: key,
          });
        }
        if (batch.length < pageSize) break;
        skip += pageSize;
      }

      // Bulk insert in chunks of 100
      let inserted = 0;
      for (let i = 0; i < toUpsert.length; i += 100) {
        const chunk = toUpsert.slice(i, i + 100);
        await base44.asServiceRole.entities.FutureOperatorLead.bulkCreate(chunk);
        inserted += chunk.length;
      }

      // Count total in table now
      let totalLeads = 0;
      skip = 0;
      while (true) {
        const batch = await base44.asServiceRole.entities.FutureOperatorLead.list('-created_date', 1000, skip);
        totalLeads += batch.length;
        if (batch.length < 1000) break;
        skip += 1000;
      }

      return Response.json({
        success: true,
        new_inserted: inserted,
        skipped_existing: existingKeys.size,
        total_unique_seen: seenKeys.size,
        total_in_table: totalLeads,
      });
    }

    // ── ACTION: process_batch ──
    // Fetches the next `batch_size` pending records from FutureOperatorLead,
    // enriches email (if missing) and geocodes (if not geocoded), marks complete.
    if (action === 'process_batch') {
      // Get pending records paginated by offset (optionally filtered by state)
      let allPending = [];
      let skip = 0;
      const pageSize = 1000;
      const pendingFilter = state ? { process_status: 'pending', state } : { process_status: 'pending' };
      while (true) {
        const batch = await base44.asServiceRole.entities.FutureOperatorLead.filter(
          pendingFilter, '-created_date', pageSize, skip
        );
        allPending.push(...batch);
        if (batch.length < pageSize) break;
        skip += pageSize;
      }

      const totalPending = allPending.length;
      const batch = allPending.slice(offset, offset + batch_size);
      const results = { enriched: 0, geocoded: 0, skipped: 0, failed: 0, errors: [] };

      for (const lead of batch) {
        if (isComplete(lead)) {
          await base44.asServiceRole.entities.FutureOperatorLead.update(lead.id, { process_status: 'complete' });
          results.skipped++;
          continue;
        }

        const updates = {};

        // Enrich email if missing
        if (!lead.email) {
          try {
            const email = await enrichEmail(base44.asServiceRole, lead.id, lead);
            if (email) {
              updates.email = email;
              updates.enrichment_status = 'found';
              results.enriched++;
            } else {
              updates.enrichment_status = 'failed';
            }
          } catch (e) {
            updates.enrichment_status = 'failed';
            results.errors.push(`${lead.company_name}: email - ${e.message}`);
          }
        }

        // Geocode if missing
        if (lead.geocode_status !== 'geocoded' || !lead.lat) {
          try {
            const geo = await geocodeRecord(lead);
            if (geo) {
              Object.assign(updates, geo);
              results.geocoded++;
            } else {
              updates.geocode_status = 'failed';
            }
          } catch (e) {
            updates.geocode_status = 'failed';
            results.errors.push(`${lead.company_name}: geo - ${e.message}`);
          }
        }

        // Mark complete if now has both email and geocode
        const nowEmail = updates.email || lead.email;
        const nowGeo = updates.geocode_status === 'geocoded' || (lead.geocode_status === 'geocoded' && lead.lat);
        updates.process_status = (nowEmail && nowGeo) ? 'complete' : 'pending';

        if (Object.keys(updates).length > 0) {
          await base44.asServiceRole.entities.FutureOperatorLead.update(lead.id, updates);
        }
      }

      const nextOffset = offset + batch_size;
      const hasMore = nextOffset < totalPending;

      return Response.json({
        success: true,
        batch_size: batch.length,
        next_offset: nextOffset,
        total_pending: totalPending,
        has_more: hasMore,
        ...results,
      });
    }

    // ── ACTION: count ──
    if (action === 'count') {
      let total = 0, pending = 0, complete = 0;
      let skip = 0;
      const pageSize = 1000;
      while (true) {
        const batch = state
          ? await base44.asServiceRole.entities.FutureOperatorLead.filter({ state }, '-created_date', pageSize, skip)
          : await base44.asServiceRole.entities.FutureOperatorLead.list('-created_date', pageSize, skip);
        total += batch.length;
        pending += batch.filter(r => r.process_status === 'pending').length;
        complete += batch.filter(r => r.process_status === 'complete').length;
        if (batch.length < pageSize) break;
        skip += pageSize;
      }
      return Response.json({ total, pending, complete });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});