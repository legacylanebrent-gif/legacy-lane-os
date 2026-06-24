import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Self-driving, time-budgeted rebuild of the MasterOperatorDirectory.
//
// Because a full in-memory rebuild of all source records times out, this
// function processes source records in batches and upserts into
// MasterOperatorDirectory incrementally. Dedup is "eventually consistent"
// across batches:
//   - Primary key: normalized phone (phone_normalized). Each batch queries
//     existing master records matching the batch's phones and merges into them.
//   - Secondary key (phoneless records): normalized company name + state.
//     Each batch queries existing master records matching the batch's company
//     names and merges those sharing the same state.
//
// State is carried via the payload cursor so the caller (frontend button or
// scheduled automation) can drive it to completion with repeated calls until
// `done === true`.
//
// Cursor shape: { phase, sourceIndex, skip, clearSkip, stats }
//   phase: 'clear' | 'merge' | 'done'
//
// Admin-only when triggered manually; also callable by scheduled automation.

const SOURCE_ENTITIES = ['FutureEstateOperator', 'EstatesalesOrgOperator', 'FutureOperatorLead'];
const BATCH_SIZE = 150;
const CLEAR_BATCH = 50;
const DELETE_CONCURRENCY = 8;
const DELETE_DELAY_MS = 120;
const TIME_BUDGET_MS = 8000; // stay safely under the platform per-call limit

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

Deno.serve(async (req) => {
  const startedAt = Date.now();
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

    let body = {};
    try { body = await req.json(); } catch (e) { body = {}; }
    const cursor = body.cursor || { phase: 'clear', sourceIndex: 0, skip: 0, clearSkip: 0, stats: freshStats() };

    const master = base44.asServiceRole.entities.MasterOperatorDirectory;

    // ── Phase: clear existing master records (batched, resumable) ──
    // NOTE: deleteMany is unavailable in this runtime, so we delete records
    // individually in parallel chunks.
    if (cursor.phase === 'clear') {
      let clearedThisCall = 0;
      while (Date.now() - startedAt < TIME_BUDGET_MS) {
        const existing = await master.list('-created_date', CLEAR_BATCH, 0);
        if (existing.length === 0) {
          cursor.phase = 'merge';
          cursor.sourceIndex = 0;
          cursor.skip = 0;
          break;
        }
        const ids = existing.map(r => r.id);
        let successCount = 0;
        let rateLimited = false;
        for (let i = 0; i < ids.length; i += DELETE_CONCURRENCY) {
          if (Date.now() - startedAt >= TIME_BUDGET_MS) break;
          const chunk = ids.slice(i, i + DELETE_CONCURRENCY);
          const results = await Promise.all(chunk.map(id => master.delete(id).then(() => true).catch(() => false)));
          const ok = results.filter(Boolean).length;
          successCount += ok;
          if (ok === 0) { rateLimited = true; break; }
          await sleep(DELETE_DELAY_MS);
        }
        cursor.stats.cleared += successCount;
        clearedThisCall += successCount;
        if (rateLimited) break;
        if (existing.length < CLEAR_BATCH) {
          cursor.phase = 'merge';
          cursor.sourceIndex = 0;
          cursor.skip = 0;
          break;
        }
      }
      return Response.json({ done: false, cursor, clearedThisCall });
    }

    // ── Phase: incremental upsert merge ──
    if (cursor.phase === 'merge') {
      while (Date.now() - startedAt < TIME_BUDGET_MS) {
        if (cursor.sourceIndex >= SOURCE_ENTITIES.length) {
          cursor.phase = 'sync_subscribers';
          break;
        }
        const sourceName = SOURCE_ENTITIES[cursor.sourceIndex];
        const entity = base44.asServiceRole.entities[sourceName];
        const batch = await entity.list('-created_date', BATCH_SIZE, cursor.skip);
        cursor.stats.totalSourceRecords += batch.length;

        if (batch.length === 0) {
          // Move to next source entity
          cursor.sourceIndex += 1;
          cursor.skip = 0;
          continue;
        }

        await processBatch(master, batch, sourceName, cursor.stats);
        cursor.skip += batch.length;

        if (batch.length < BATCH_SIZE) {
          cursor.sourceIndex += 1;
          cursor.skip = 0;
        }
      }
    }

    // ── Phase: sync subscriber status from registered operator Users ──
    // Real EstateSalen subscribers (Users with primary_account_type
    // 'estate_sale_operator') are not in the scraped sources, so we cross-
    // reference them against the master directory by normalized phone and
    // stamp subscription_status='active' + claimed_by_user_id on matches.
    if (cursor.phase === 'sync_subscribers') {
      try {
        const users = await base44.asServiceRole.entities.User.list('-created_date', 500, 0);
        const operators = users.filter(u => u.primary_account_type === 'estate_sale_operator' && u.phone);
        const phoneToUser = {};
        for (const u of operators) {
          const p = normalizePhone(u.phone);
          if (p) phoneToUser[p] = u;
        }
        const phones = Object.keys(phoneToUser);
        let synced = 0;
        if (phones.length > 0) {
          // Match by phone_normalized first (populated on freshly-built records).
          const byNorm = await master.filter({ phone_normalized: { $in: phones } }, '-created_date', 500, 0);
          // Fallback: older records may lack phone_normalized, so also query by
          // common raw phone formats derived from the digits.
          const rawVariants = [];
          for (const digits of phones) {
            if (digits.length === 10) {
              rawVariants.push(digits, `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`, `${digits.slice(0,3)}-${digits.slice(3,6)}-${digits.slice(6)}`, `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6)}`);
            }
          }
          const byRaw = rawVariants.length > 0
            ? await master.filter({ phone: { $in: rawVariants } }, '-created_date', 500, 0)
            : [];
          // Merge, dedup by id, resolve the matching user.
          const seen = new Set();
          const toUpdate = [];
          for (const m of [...byNorm, ...byRaw]) {
            if (seen.has(m.id)) continue;
            seen.add(m.id);
            const norm = m.phone_normalized || normalizePhone(m.phone);
            const u = phoneToUser[norm];
            if (u) {
              toUpdate.push({ id: m.id, subscription_status: 'active', claimed_by_user_id: u.id, phone_normalized: norm });
            }
          }
          for (let i = 0; i < toUpdate.length; i += 500) {
            await master.bulkUpdate(toUpdate.slice(i, i + 500));
          }
          synced = toUpdate.length;
        }
        cursor.stats.subscribersSynced = synced;
      } catch (e) {
        console.error('subscriber sync error:', e.message);
        cursor.stats.subscriberSyncError = e.message;
      }
      cursor.phase = 'done';
    }

    const done = cursor.phase === 'done';
    return Response.json({
      done,
      cursor,
      isManual,
      stats: cursor.stats
    });
  } catch (error) {
    console.error('buildMasterOperatorDirectory error:', error);
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});

function freshStats() {
  return {
    cleared: 0,
    totalSourceRecords: 0,
    batchesProcessed: 0,
    phoneMatches: 0,
    nameStateMatches: 0,
    created: 0,
    updated: 0,
    subscribersSynced: 0
  };
}

function normalizePhone(p) {
  if (!p) return null;
  const digits = String(p).replace(/[^0-9]/g, '');
  return digits.length >= 7 ? digits : null;
}

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

function firstNonEmpty(...vals) {
  for (const v of vals) {
    if (v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0)) return v;
  }
  return null;
}

// Pick the most "active" subscription status across merged source records.
const SUBSCRIPTION_RANK = {
  active: 5,
  free_trial: 4,
  free_lead_access: 3,
  expired: 2,
  cancelled: 1,
  none: 0
};
function bestSubscriptionStatus(records) {
  let best = 'none';
  let bestRank = -1;
  for (const r of records) {
    const status = r.subscription_status || 'none';
    const rank = SUBSCRIPTION_RANK[status] ?? 0;
    if (rank > bestRank) { best = status; bestRank = rank; }
  }
  return best;
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

// Build the field set for a master record from a list of source records,
// merging the richest values. `existing` is the current master record (if any).
function buildFields(records, existing) {
  const allRecs = existing ? [existing, ...records] : records;
  // Sort by richness (most fields first) for primary selection
  const sorted = [...allRecs].sort((a, b) => {
    const score = (r) => Object.values(r).filter(v => v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0)).length;
    return score(b) - score(a);
  });
  const primary = sorted[0];

  const phoneNorm = firstNonEmpty(...allRecs.map(r => r.phone_normalized)) || normalizePhone(firstNonEmpty(...allRecs.map(r => r.phone)));
  const companyName = firstNonEmpty(primary.company_name, ...allRecs.map(r => r.company_name));

  return {
    company_name: (companyName && typeof companyName === 'string') ? companyName : 'Unknown Company',
    phone: firstNonEmpty(...allRecs.map(r => r.phone)),
    phone_normalized: phoneNorm,
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
    subscription_status: bestSubscriptionStatus(allRecs),
    claimed_by_user_id: firstNonEmpty(...allRecs.map(r => r.claimed_by_user_id)),
    enrichment_status: firstNonEmpty(...allRecs.map(r => r.enrichment_status)) || 'not_started',
    lead_stage: firstNonEmpty(...allRecs.map(r => r.lead_stage)) || 'future_operator',
    audience_sync_status: firstNonEmpty(...allRecs.map(r => r.audience_sync_status)) || 'not_synced',
    meta_custom_audience_id: firstNonEmpty(...allRecs.map(r => r.meta_custom_audience_id)),
    last_synced_at: firstNonEmpty(...allRecs.map(r => r.last_synced_at)),
    tags: firstNonEmpty(...allRecs.map(r => r.tags)) || {},
    notes: firstNonEmpty(...allRecs.map(r => r.notes))
  };
}

function mergeSourceMeta(records, existing) {
  const sources = [];
  const sourceRecordIds = {};
  const collect = (rec, src) => {
    if (!src) return;
    if (!sources.includes(src)) sources.push(src);
    if (rec && rec.id) sourceRecordIds[src] = rec.id;
  };
  if (existing) {
    for (const s of (existing.sources || [])) if (!sources.includes(s)) sources.push(s);
    Object.assign(sourceRecordIds, existing.source_record_ids || {});
  }
  // records: [{ record, source }]
  for (const item of records) collect(item.record, item.source);
  return { sources, sourceRecordIds, merge_status: sources.length > 1 ? 'merged' : 'single_source' };
}

// Process one batch of source records: group, query existing matches, upsert.
async function processBatch(master, batch, sourceName, stats) {
  stats.batchesProcessed += 1;

  // Group this batch's records by normalized phone, then by name+state for phoneless.
  const phoneGroups = {};      // normalizedPhone -> [{ record, source }]
  const nameStateGroups = {};  // "name|state" -> [{ record, source }]
  const noNameItems = [];      // phoneless + no usable name

  for (const record of batch) {
    const item = { record, source: sourceName };
    const phone = normalizePhone(record.phone);
    if (phone) {
      if (!phoneGroups[phone]) phoneGroups[phone] = [];
      phoneGroups[phone].push(item);
    } else {
      const name = normalizeName(record.company_name);
      const state = normalizeState(record.state || record.base_state || record.source_state);
      if (name) {
        const key = `${name}|${state}`;
        if (!nameStateGroups[key]) nameStateGroups[key] = [];
        nameStateGroups[key].push(item);
      } else {
        noNameItems.push(item);
      }
    }
  }

  // ── Phone groups: query existing master records by phone_normalized ──
  const phoneKeys = Object.keys(phoneGroups);
  const phoneExistingMap = {}; // normalizedPhone -> master record
  if (phoneKeys.length > 0) {
    try {
      const existing = await master.filter({ phone_normalized: { $in: phoneKeys } }, '-created_date', 500, 0);
      for (const e of existing) {
        const pk = e.phone_normalized || normalizePhone(e.phone);
        if (pk) phoneExistingMap[pk] = e;
      }
    } catch (e) {
      console.error('phone filter error:', e.message);
    }
  }

  const toCreate = [];
  const toUpdate = [];

  for (const [pk, items] of Object.entries(phoneGroups)) {
    const existing = phoneExistingMap[pk];
    const fields = buildFields(items.map(i => i.record), existing);
    const meta = mergeSourceMeta(items, existing);
    if (existing) {
      stats.phoneMatches += 1;
      stats.updated += 1;
      toUpdate.push({ id: existing.id, ...fields, sources: meta.sources, source_record_ids: meta.source_record_ids, merge_status: meta.merge_status });
    } else {
      stats.created += 1;
      toCreate.push({ ...fields, sources: meta.sources, source_record_ids: meta.source_record_ids, merge_status: meta.merge_status });
    }
  }

  // ── Name+state groups (phoneless): query existing by company_name, match state ──
  const nameStateKeys = Object.keys(nameStateGroups);
  // Collect distinct raw company names to query
  const distinctNames = [];
  const seenNames = new Set();
  for (const key of nameStateKeys) {
    for (const item of nameStateGroups[key]) {
      const raw = item.record.company_name;
      if (raw && !seenNames.has(raw)) { seenNames.add(raw); distinctNames.push(raw); }
    }
  }
  const nameExistingMap = {}; // raw company_name -> [master records]
  if (distinctNames.length > 0) {
    try {
      const existing = await master.filter({ company_name: { $in: distinctNames } }, '-created_date', 500, 0);
      for (const e of existing) {
        const raw = e.company_name;
        if (!nameExistingMap[raw]) nameExistingMap[raw] = [];
        nameExistingMap[raw].push(e);
      }
    } catch (e) {
      console.error('name filter error:', e.message);
    }
  }

  for (const [key, items] of Object.entries(nameStateGroups)) {
    const state = normalizeState(items[0].record.state || items[0].record.base_state || items[0].record.source_state);
    // Find an existing master record with the same raw name AND same state
    let existing = null;
    for (const item of items) {
      const candidates = nameExistingMap[item.record.company_name] || [];
      const match = candidates.find(c => normalizeState(c.state) === state);
      if (match) { existing = match; break; }
    }
    const fields = buildFields(items.map(i => i.record), existing);
    const meta = mergeSourceMeta(items, existing);
    if (existing) {
      stats.nameStateMatches += 1;
      stats.updated += 1;
      toUpdate.push({ id: existing.id, ...fields, sources: meta.sources, source_record_ids: meta.source_record_ids, merge_status: meta.merge_status });
    } else {
      stats.created += 1;
      toCreate.push({ ...fields, sources: meta.sources, source_record_ids: meta.source_record_ids, merge_status: meta.merge_status });
    }
  }

  // ── No-name, no-phone records: create as-is ──
  for (const item of noNameItems) {
    const fields = buildFields([item.record], null);
    const meta = mergeSourceMeta([item], null);
    stats.created += 1;
    toCreate.push({ ...fields, sources: meta.sources, source_record_ids: meta.source_record_ids, merge_status: meta.merge_status });
  }

  // ── Persist ──
  if (toCreate.length > 0) {
    for (let i = 0; i < toCreate.length; i += 500) {
      await master.bulkCreate(toCreate.slice(i, i + 500));
    }
  }
  if (toUpdate.length > 0) {
    for (let i = 0; i < toUpdate.length; i += 500) {
      await master.bulkUpdate(toUpdate.slice(i, i + 500));
    }
  }
}