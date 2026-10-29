// Bounded, idempotent processing for agent pending-listing imports.
// One CSV import = one AgentListingImport + N AgentListingImportRow records.
// Rows are processed in small batches so a partial run never loses completed work
// and the same call can safely be repeated.

import {
  normalizeAddress,
  formatAddress,
  normalizeZip,
  normalizeState,
  normText,
} from './listingAddress.ts';
import { loadConfig, audit } from './listingAccess.ts';
import { applyMatch, mapListingStatus } from './listingMatch.ts';

export const FIELD_LABELS = {
  street: 'Street address',
  unit: 'Unit',
  city: 'City',
  state: 'State',
  zip: 'ZIP',
  listing_id: 'Listing ID',
  listing_source: 'Listing source',
  listing_status: 'Listing status',
  pending_date: 'Pending date',
  expected_closing_date: 'Expected closing date',
  county: 'County',
  parcel_id: 'Parcel / APN',
  listing_agent_name: 'Listing agent name',
  listing_agent_email: 'Listing agent email',
  listing_agent_phone: 'Listing agent phone',
  brokerage: 'Brokerage',
  seller_name_provided: 'Seller name (provided by agent)',
  seller_contact_provided: 'Seller contact (provided by agent)',
  list_price: 'List price',
  source_date: 'Source export date',
};

function toIsoDate(value) {
  if (!value) return '';
  const s = String(value).trim();
  if (!s) return '';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(String(value).replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

export function extractRow(raw, mapping) {
  const get = (field) => {
    const col = mapping?.[field];
    if (!col) return '';
    const value = raw?.[col];
    return value === null || value === undefined ? '' : String(value).trim();
  };
  return {
    street: get('street'),
    unit: get('unit'),
    city: get('city'),
    state: normalizeState(get('state')),
    zip: normalizeZip(get('zip')),
    listing_id: get('listing_id'),
    listing_source: get('listing_source'),
    listing_status: get('listing_status'),
    pending_date: toIsoDate(get('pending_date')),
    expected_closing_date: toIsoDate(get('expected_closing_date')),
    county: get('county'),
    parcel_id: get('parcel_id'),
    listing_agent_name: get('listing_agent_name'),
    listing_agent_email: get('listing_agent_email'),
    listing_agent_phone: get('listing_agent_phone'),
    brokerage: get('brokerage'),
    seller_name_provided: get('seller_name_provided'),
    seller_contact_provided: get('seller_contact_provided'),
    list_price: toNumber(get('list_price')),
    source_date: toIsoDate(get('source_date')),
  };
}

export function validateRow(fields) {
  const missing = [];
  if (!fields.street) missing.push('street address');
  if (!fields.city) missing.push('city');
  if (!fields.state) missing.push('state');
  if (missing.length) {
    return { ok: false, code: 'missing_required', message: `Missing ${missing.join(', ')}.` };
  }
  if (!/^[A-Z]{2}$/.test(fields.state)) {
    return { ok: false, code: 'invalid_state', message: `"${fields.state}" is not a two-letter state code.` };
  }
  if (!/\d/.test(fields.street)) {
    return { ok: false, code: 'invalid_street', message: 'The street address has no street number, so it cannot be matched.' };
  }
  return { ok: true };
}

async function findCanonicalProperty(base44, matchKey) {
  if (!matchKey) return null;
  try {
    const rows = await base44.asServiceRole.entities.AgentListingOpportunity.filter({ match_key: matchKey }, '-created_date', 5, 0);
    const withProperty = (rows || []).find((r) => r.property_id);
    if (withProperty) return withProperty.property_id;
  } catch (error) {
    console.error('[listingImport] canonical lookup failed:', error?.message);
  }
  return null;
}

async function createProperty(base44, normalized, fields, agent) {
  const formatted = formatAddress({
    street: fields.street,
    unit: fields.unit,
    city: fields.city,
    state: fields.state,
    zip: fields.zip,
  });
  const property = await base44.asServiceRole.entities.Property.create({
    address: {
      street: fields.street,
      unit: fields.unit || '',
      city: fields.city,
      state: fields.state,
      zip: fields.zip || '',
      formatted_address: formatted,
    },
    status: fields.listing_status ? 'active_listing' : 'lead',
    list_price: fields.list_price ?? undefined,
    agent_id: agent.id,
    notes: `Created from ${agent.full_name || agent.email} pending-listing import.`,
  });
  return property.id;
}

function pickNewerListing(existing, incoming) {
  const existingDate = existing?.source_date || '';
  const incomingDate = incoming?.source_date || '';
  const incomingIsNewer = !existingDate || (incomingDate && incomingDate >= existingDate);
  if (!incomingIsNewer) return existing || {};
  // Keep previously known values when the newer source leaves a field blank.
  const merged = { ...(existing || {}) };
  for (const [key, value] of Object.entries(incoming)) {
    if (value !== '' && value !== null && value !== undefined) merged[key] = value;
  }
  return merged;
}

async function ensureCrmOpportunity(base44, agent, opportunity, propertyId) {
  if (opportunity?.crm_opportunity_id) return opportunity.crm_opportunity_id;
  try {
    const existing = await base44.asServiceRole.entities.Opportunity.filter(
      { source_record_id: propertyId, assigned_owner: agent.id },
      '-created_date',
      1,
      0,
    );
    if (existing && existing.length) return existing[0].id;
    const created = await base44.asServiceRole.entities.Opportunity.create({
      source_record_id: propertyId,
      app_name: 'EstateSalen',
      object_type: 'property',
      status: 'open',
      opportunity_name: `${formatAddress(opportunity.address)} — property service opportunity`,
      opportunity_type: 'estate_sale_service',
      pipeline_stage: 'new',
      assigned_owner: agent.id,
      next_step: 'Review ownership match and confirm the service need',
    });
    return created.id;
  } catch (error) {
    console.error('[listingImport] CRM opportunity link failed:', error?.message);
    return '';
  }
}

async function processRow(base44, importRec, row, config, agent) {
  const fields = extractRow(row.raw || {}, importRec.column_mapping || {});
  const validation = validateRow(fields);
  const now = new Date().toISOString();

  if (!validation.ok) {
    await base44.asServiceRole.entities.AgentListingImportRow.update(row.id, {
      status: 'failed',
      error_code: validation.code,
      error_message: validation.message,
      processed_at: now,
    });
    await audit(base44, {
      agent_user_id: importRec.agent_user_id,
      actor_user_id: importRec.agent_user_id,
      actor_name: importRec.agent_name,
      actor_role: 'system',
      event_type: 'row_failed',
      import_id: importRec.id,
      details: { row_index: row.row_index, code: validation.code, message: validation.message },
    });
    return { status: 'failed', match_status: null };
  }

  const normalized = normalizeAddress({
    street: fields.street,
    unit: fields.unit,
    city: fields.city,
    state: fields.state,
    zip: fields.zip,
  });

  // 1. Canonical property (reused across agents; never a second property database).
  let propertyId = await findCanonicalProperty(base44, normalized.match_key);
  let propertyCreated = false;
  if (!propertyId) {
    propertyId = await createProperty(base44, normalized, fields, agent);
    propertyCreated = true;
  }

  // 2. This agent's private relationship + opportunity.
  let opportunity = null;
  const existingByProperty = await base44.asServiceRole.entities.AgentListingOpportunity.filter(
    { agent_user_id: agent.id, property_id: propertyId },
    '-created_date',
    1,
    0,
  );
  opportunity = existingByProperty?.[0] || null;

  const statusMap = mapListingStatus(fields.listing_status);
  const incomingListing = {
    listing_id: fields.listing_id,
    listing_source: fields.listing_source || importRec.source_label || 'CSV import',
    listing_status_raw: fields.listing_status,
    listing_status_mapped: statusMap.mapped,
    status_review_required: statusMap.review_required,
    pending_date: fields.pending_date,
    expected_closing_date: fields.expected_closing_date,
    county: fields.county,
    parcel_id: fields.parcel_id,
    listing_agent_name: fields.listing_agent_name,
    listing_agent_email: fields.listing_agent_email,
    listing_agent_phone: fields.listing_agent_phone,
    brokerage: fields.brokerage,
    seller_name_provided: fields.seller_name_provided,
    seller_contact_provided: fields.seller_contact_provided,
    list_price: fields.list_price,
    source_date: fields.source_date || importRec.source_date || '',
    imported_at: now,
  };

  const baseAddress = {
    street: fields.street,
    unit: fields.unit,
    city: fields.city,
    state: fields.state,
    zip: fields.zip,
    formatted_address: formatAddress({ street: fields.street, unit: fields.unit, city: fields.city, state: fields.state, zip: fields.zip }),
  };

  let rowStatus = 'imported';

  if (opportunity) {
    rowStatus = 'updated';
    const mergedListing = pickNewerListing(opportunity.listing, incomingListing);
    const crmId = await ensureCrmOpportunity(base44, agent, opportunity, propertyId);
    await base44.asServiceRole.entities.AgentListingOpportunity.update(opportunity.id, {
      last_import_id: importRec.id,
      listing: mergedListing,
      address: baseAddress,
      crm_opportunity_id: crmId || opportunity.crm_opportunity_id || '',
      last_activity_at: now,
    });
    opportunity = { ...opportunity, listing: mergedListing, address: baseAddress };
  } else {
    const created = await base44.asServiceRole.entities.AgentListingOpportunity.create({
      agent_user_id: agent.id,
      agent_name: agent.full_name || agent.email || '',
      property_id: propertyId,
      match_key: normalized.match_key,
      import_id: importRec.id,
      last_import_id: importRec.id,
      address: baseAddress,
      listing: incomingListing,
      ownership: { match_status: 'unmatched', review_status: 'none' },
      service_need: 'unknown',
      last_activity_at: now,
    });
    opportunity = created;
    const crmId = await ensureCrmOpportunity(base44, agent, opportunity, propertyId);
    if (crmId) {
      await base44.asServiceRole.entities.AgentListingOpportunity.update(created.id, { crm_opportunity_id: crmId });
      opportunity = { ...opportunity, crm_opportunity_id: crmId };
    }
  }

  // 3. Ownership match against the stored reference database. applyMatch preserves
  // agent/admin-confirmed ownership and flags newer conflicting evidence instead of
  // silently replacing it when the same listing is imported again.
  let matchStatus = null;
  try {
    const ownership = await applyMatch(base44, opportunity, config, {
      actor: {
        actor_user_id: importRec.agent_user_id,
        actor_name: importRec.agent_name,
        actor_role: 'system',
      },
    });
    matchStatus = ownership.match_status;
  } catch (error) {
    console.error('[listingImport] match failed for row', row.row_index, error?.message);
    matchStatus = 'failed';
    await base44.asServiceRole.entities.AgentListingOpportunity.update(opportunity.id, {
      ownership: {
        match_status: 'failed',
        explanation: 'The ownership lookup could not be completed. Nothing was assumed or invented; retry the match later.',
        matched_at: new Date().toISOString(),
      },
    });
  }

  await base44.asServiceRole.entities.AgentListingImportRow.update(row.id, {
    status: rowStatus,
    property_id: propertyId,
    opportunity_id: opportunity.id,
    normalized: { ...normalized, property_created: propertyCreated },
    processed_at: new Date().toISOString(),
  });

  return { status: rowStatus, match_status: matchStatus, opportunity_id: opportunity.id, property_created: propertyCreated };
}

// Reconciliation counts derived from the persisted row statuses (one bounded read).
async function recount(base44, importId) {
  const rows = await base44.asServiceRole.entities.AgentListingImportRow.filter(
    { import_id: importId },
    'row_index',
    1000,
    0,
  );
  const counts = { imported: 0, updated: 0, failed: 0, skipped: 0, pending: 0 };
  for (const row of rows || []) {
    if (counts[row.status] !== undefined) counts[row.status] += 1;
  }
  return counts;
}

async function matchCounts(base44, importId) {
  const opportunities = await base44.asServiceRole.entities.AgentListingOpportunity.filter(
    { last_import_id: importId },
    '-created_date',
    500,
    0,
  );
  let verified = 0;
  let possible = 0;
  let unmatched = 0;
  for (const opp of opportunities || []) {
    const status = opp?.ownership?.match_status;
    if (status === 'verified') verified += 1;
    else if (status === 'possible') possible += 1;
    else unmatched += 1;
  }
  return { verified, possible, unmatched, total: (opportunities || []).length };
}

/**
 * Process pending rows for one import. Bounded by row count and wall clock so the
 * function always returns; callers repeat until has_more is false.
 */
export async function processImport(base44, importId, options = {}) {
  const agentScopedUserId = options.agentUserId || null;
  const batches = await base44.asServiceRole.entities.AgentListingImport.filter({ id: importId });
  const importRec = batches?.[0];
  if (!importRec) return { error: 'Import not found', not_found: true };
  if (agentScopedUserId && importRec.agent_user_id !== agentScopedUserId) {
    return { error: 'Import not found', not_found: true };
  }
  if (importRec.status === 'completed') {
    const counts = await recount(base44, importId);
    const matches = await matchCounts(base44, importId);
    return { import_id: importId, status: 'completed', has_more: false, counts, matches, total_rows: importRec.total_rows };
  }

  const config = await loadConfig(base44);
  const agent = options.agent || {
    id: importRec.agent_user_id,
    full_name: importRec.agent_name,
    email: importRec.agent_email,
  };

  await base44.asServiceRole.entities.AgentListingImport.update(importRec.id, {
    status: 'processing',
    started_at: importRec.started_at || new Date().toISOString(),
  });

  const maxRows = Math.min(options.maxRows || 25, 60);
  const timeBudget = options.timeBudgetMs || 75000;
  const startedAt = Date.now();
  let processed = 0;
  let failure = '';

  while (processed < maxRows && Date.now() - startedAt < timeBudget) {
    const pendingRows = await base44.asServiceRole.entities.AgentListingImportRow.filter(
      { import_id: importId, status: 'pending' },
      'row_index',
      5,
      0,
    );
    if (!pendingRows || pendingRows.length === 0) break;
    for (const row of pendingRows) {
      if (processed >= maxRows || Date.now() - startedAt > timeBudget) break;
      try {
        await processRow(base44, importRec, row, config, agent);
      } catch (error) {
        failure = error?.message || 'Row processing failed';
        console.error('[listingImport] row failed', row.row_index, failure);
        await base44.asServiceRole.entities.AgentListingImportRow.update(row.id, {
          status: 'failed',
          error_code: 'processing_failed',
          error_message: `Processing failed: ${failure}. This row can be retried safely.`,
          processed_at: new Date().toISOString(),
        });
      }
      processed += 1;
    }
  }

  const counts = await recount(base44, importId);
  const matches = await matchCounts(base44, importId);
  const done = counts.pending === 0;
  const failedTotal = counts.failed;
  const succeeded = counts.imported + counts.updated;
  let status = 'processing';
  if (done) {
    if (succeeded === 0 && failedTotal > 0) status = 'failed';
    else if (failedTotal > 0) status = 'partial';
    else status = 'completed';
  }

  const patch = {
    status,
    processed_count: counts.imported + counts.updated + counts.failed + counts.skipped,
    imported_count: counts.imported,
    updated_count: counts.updated,
    failed_count: counts.failed,
    skipped_count: counts.skipped,
    matched_verified_count: matches.verified,
    matched_possible_count: matches.possible,
    unmatched_count: matches.unmatched,
    error_summary: failedTotal > 0 ? `${failedTotal} row(s) need attention. See row details for the reason.` : '',
    last_error: failure,
    completed_at: done ? new Date().toISOString() : importRec.completed_at || null,
  };
  await base44.asServiceRole.entities.AgentListingImport.update(importId, patch);

  if (done) {
    await audit(base44, {
      agent_user_id: importRec.agent_user_id,
      actor_user_id: options.actor?.actor_user_id || importRec.agent_user_id,
      actor_name: options.actor?.actor_name || importRec.agent_name,
      actor_role: options.actor?.actor_role || 'system',
      event_type: status === 'failed' ? 'import_failed' : 'import_completed',
      import_id: importId,
      details: { ...counts, ...matches, status },
    });
  }

  return {
    import_id: importId,
    status,
    has_more: !done,
    total_rows: importRec.total_rows,
    counts,
    matches,
  };
}