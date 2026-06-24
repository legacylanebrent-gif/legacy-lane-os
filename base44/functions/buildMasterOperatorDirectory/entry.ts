import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Builds the MasterOperatorDirectory by merging all unique records from
// FutureEstateOperator, EstatesalesOrgOperator, and FutureOperatorLead.
// Deduplicates by phone number (primary key). When the same phone appears in
// multiple source entities, merges the richest field from each source and
// tracks all contributing sources.
//
// Idempotent: clears the MasterOperatorDirectory before rebuilding.
// Admin-only when triggered manually; also callable by scheduled automation.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Auth: allow admin manual trigger OR background automation (no user context)
    let isManual = false;
    try {
      const user = await base44.auth.me();
      if (user) {
        if (user.role !== 'admin') {
          return Response.json({ error: 'Admin only' }, { status: 403 });
        }
        isManual = true;
      }
    } catch (e) {
      // No user context — background automation, allow
    }

    const SOURCE_ENTITIES = ['FutureEstateOperator', 'EstatesalesOrgOperator', 'FutureOperatorLead'];
    const master = base44.asServiceRole.entities.MasterOperatorDirectory;

    // Step 1: Clear existing master records
    let cleared = 0;
    while (true) {
      const existing = await master.list('-created_date', 500, 0);
      if (existing.length === 0) break;
      await master.deleteMany({ id: { $in: existing.map(r => r.id) } });
      cleared += existing.length;
      if (existing.length < 500) break;
    }

    // Step 2: Load all records from each source entity
    const allRecords = []; // { record, source }
    for (const sourceName of SOURCE_ENTITIES) {
      const entity = base44.asServiceRole.entities[sourceName];
      let skip = 0;
      let batch;
      do {
        batch = await entity.list('-created_date', 500, skip);
        for (const r of batch) {
          allRecords.push({ record: r, source: sourceName });
        }
        skip += 500;
      } while (batch.length === 500 && skip < 50000);
    }

    // Step 3: Group by normalized phone
    function normalizePhone(p) {
      if (!p) return null;
      const digits = p.replace(/[^0-9]/g, '');
      return digits.length >= 7 ? digits : null;
    }

    const phoneGroups = {}; // phone -> [{ record, source }]
    const noPhoneRecords = []; // records without a usable phone

    for (const item of allRecords) {
      const phone = normalizePhone(item.record.phone);
      if (phone) {
        if (!phoneGroups[phone]) phoneGroups[phone] = [];
        phoneGroups[phone].push(item);
      } else {
        noPhoneRecords.push(item);
      }
    }

    // Step 4: Merge each phone group into a single master record
    function firstNonEmpty(...vals) {
      for (const v of vals) {
        if (v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0)) return v;
      }
      return null;
    }

    function mergeArrays(...arrs) {
      const result = [];
      const seen = new Set();
      for (const arr of arrs) {
        if (Array.isArray(arr)) {
          for (const item of arr) {
            const key = String(item).toLowerCase();
            if (!seen.has(key)) {
              seen.add(key);
              result.push(item);
            }
          }
        }
      }
      return result;
    }

    const masterRecords = [];

    for (const [phone, items] of Object.entries(phoneGroups)) {
      const merged = buildMergedRecord(phone, items);
      masterRecords.push(merged);
    }

    // For records without phone, dedup by normalized company name + state.
    // It's rare for two distinct businesses to share a name in the same state.
    function normalizeName(n) {
      if (!n || typeof n !== 'string') return null;
      const cleaned = n.toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\b(estate sale[s]?|estates sale[s]?|llc|inc|co|company|the)\b/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      return cleaned.length >= 3 ? cleaned : null;
    }

    function normalizeState(s) {
      if (!s || typeof s !== 'string') return '';
      return s.trim().toLowerCase();
    }

    const nameStateGroups = {}; // "name|state" -> [{ record, source }]
    const noNameRecords = []; // can't dedup without a name

    for (const item of noPhoneRecords) {
      const name = normalizeName(item.record.company_name);
      const state = normalizeState(item.record.state || item.record.base_state || item.record.source_state);
      if (name) {
        const key = `${name}|${state}`;
        if (!nameStateGroups[key]) nameStateGroups[key] = [];
        nameStateGroups[key].push(item);
      } else {
        noNameRecords.push(item);
      }
    }

    let nameStateMerged = 0;
    for (const [key, items] of Object.entries(nameStateGroups)) {
      masterRecords.push(buildMergedRecord(null, items));
      if (items.length > 1) nameStateMerged++;
    }
    // Records with neither phone nor a usable name — keep as-is
    for (const item of noNameRecords) {
      masterRecords.push(buildMergedRecord(null, [item]));
    }

    function buildMergedRecord(phone, items) {
      const sources = [];
      const sourceRecordIds = {};
      for (const item of items) {
        if (!sources.includes(item.source)) sources.push(item.source);
        sourceRecordIds[item.source] = item.record.id;
      }

      // Sort items by richness (most fields first) for primary field selection
      const sorted = [...items].sort((a, b) => {
        const scoreA = Object.values(a.record).filter(v => v !== null && v !== undefined && v !== '').length;
        const scoreB = Object.values(b.record).filter(v => v !== null && v !== undefined && v !== '').length;
        return scoreB - scoreA;
      });

      const primary = sorted[0].record;
      const allRecs = items.map(i => i.record);

      const companyName = firstNonEmpty(primary.company_name, ...allRecs.map(r => r.company_name));
      return {
        company_name: (companyName && typeof companyName === 'string') ? companyName : 'Unknown Company',
        phone: phone ? items[0].record.phone : null,
        email: firstNonEmpty(...allRecs.map(r => r.email)),
        website: firstNonEmpty(...allRecs.map(r => r.website_url || r.website)),
        owner_name: firstNonEmpty(...allRecs.map(r => r.owner_name)),
        city: firstNonEmpty(...allRecs.map(r => r.city || r.base_city || r.scraped_city)),
        state: firstNonEmpty(...allRecs.map(r => r.state || r.base_state || r.source_state)),
        zip_code: firstNonEmpty(...allRecs.map(r => r.zip_code)),
        county: firstNonEmpty(...allRecs.map(r => r.county)),
        lat: firstNonEmpty(...allRecs.map(r => r.lat)),
        lng: firstNonEmpty(...allRecs.map(r => r.lng)),
        geocoded_address: firstNonEmpty(...allRecs.map(r => r.geocoded_address)),
        geocoded_city: firstNonEmpty(...allRecs.map(r => r.geocoded_city)),
        geocoded_county: firstNonEmpty(...allRecs.map(r => r.geocoded_county)),
        geocoded_zip: firstNonEmpty(...allRecs.map(r => r.geocoded_zip)),
        geocode_status: firstNonEmpty(...allRecs.map(r => r.geocode_status)) || 'not_geocoded',
        geocode_last_run: firstNonEmpty(...allRecs.map(r => r.geocode_last_run)),
        facebook: firstNonEmpty(...allRecs.map(r => r.facebook)),
        instagram: firstNonEmpty(...allRecs.map(r => r.instagram)),
        about_text: firstNonEmpty(...allRecs.map(r => r.about_text)),
        services_offered: mergeArrays(...allRecs.map(r => r.services_offered)),
        memberships: mergeArrays(...allRecs.map(r => r.memberships)),
        credentials: mergeArrays(...allRecs.map(r => r.credentials)),
        service_area_cities: mergeArrays(...allRecs.map(r => r.service_area_cities)),
        membership_tier: firstNonEmpty(...allRecs.map(r => r.membership_tier)) || 'unknown',
        member_since: firstNonEmpty(...allRecs.map(r => r.member_since)),
        years_in_business: firstNonEmpty(...allRecs.map(r => r.years_in_business)),
        sales_posted: firstNonEmpty(...allRecs.map(r => r.sales_posted)),
        active_sales_count: firstNonEmpty(...allRecs.map(r => r.active_sales_count)),
        bonded_insured: allRecs.some(r => r.bonded_insured === true),
        award_winner: allRecs.some(r => r.award_winner === true),
        logo_image_url: firstNonEmpty(...allRecs.map(r => r.logo_image_url)),
        profile_url: firstNonEmpty(...allRecs.map(r => r.profile_url)),
        company_id: firstNonEmpty(...allRecs.map(r => r.company_id)),
        enrichment_status: firstNonEmpty(...allRecs.map(r => r.enrichment_status)) || 'not_started',
        lead_stage: firstNonEmpty(...allRecs.map(r => r.lead_stage)) || 'future_operator',
        audience_sync_status: firstNonEmpty(...allRecs.map(r => r.audience_sync_status)) || 'not_synced',
        meta_custom_audience_id: firstNonEmpty(...allRecs.map(r => r.meta_custom_audience_id)),
        last_synced_at: firstNonEmpty(...allRecs.map(r => r.last_synced_at)),
        tags: firstNonEmpty(...allRecs.map(r => r.tags)) || {},
        notes: firstNonEmpty(...allRecs.map(r => r.notes)),
        sources: sources,
        source_record_ids: sourceRecordIds,
        merge_status: sources.length > 1 ? 'merged' : 'single_source'
      };
    }

    // Filter out records with no valid company_name string
    const validRecords = masterRecords.filter(r => r.company_name && typeof r.company_name === 'string' && r.company_name.trim().length > 0);

    // Step 5: Bulk create in batches of 500
    let created = 0;
    for (let i = 0; i < validRecords.length; i += 500) {
      const batch = validRecords.slice(i, i + 500);
      await master.bulkCreate(batch);
      created += batch.length;
    }

    return Response.json({
      success: true,
      cleared: cleared,
      totalSourceRecords: allRecords.length,
      uniquePhoneGroups: Object.keys(phoneGroups).length,
      recordsWithoutPhone: noPhoneRecords.length,
      nameStateGroups: Object.keys(nameStateGroups).length,
      nameStateMerged: nameStateMerged,
      masterRecordsCreated: created,
      mergedFromMultipleSources: masterRecords.filter(r => r.merge_status === 'merged').length
    });
  } catch (error) {
    console.error('buildMasterOperatorDirectory error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});