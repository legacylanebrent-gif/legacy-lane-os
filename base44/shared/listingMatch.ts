// Staged address matching against the stored PropStream reference database.
// Deterministic rules decide matches; AI is never used here to invent anything.

import {
  normalizeAddress,
  addressSimilarity,
  normalizeParcel,
  normalizeState,
  normalizeZip,
  normText,
  ownerNameFromRecord,
  ownerMailingAddressFromRecord,
  ownershipTypeFromRecord,
} from './listingAddress.ts';
import { audit } from './listingAccess.ts';

export const MATCHING_VERSION = 'v1';

const POOL_LIMIT = 400;

function refAddress(record) {
  return {
    street: record.property_address || '',
    unit: record.unit_number || '',
    city: record.city || '',
    state: record.state || '',
    zip: record.zip || '',
  };
}

function redactedCandidate(record, subject, config) {
  const sim = addressSimilarity(subject, refAddress(record));
  const characteristics = {};
  if (record.beds) characteristics.beds = record.beds;
  if (record.baths) characteristics.baths = record.baths;
  if (record.square_feet) characteristics.square_feet = record.square_feet;
  if (record.year_built) characteristics.year_built = record.year_built;
  if (record.property_type) characteristics.property_type = record.property_type;
  return {
    id: record.id,
    property_address: record.property_address || '',
    unit_number: record.unit_number || '',
    city: record.city || '',
    state: record.state || '',
    zip: record.zip || '',
    apn: record.apn || '',
    owner_of_record: ownerNameFromRecord(record),
    ownership_type: ownershipTypeFromRecord(record),
    owner_mailing_address: ownerMailingAddressFromRecord(record),
    characteristics,
    source: record.source || 'PropStream',
    source_date: record.list_date || record.last_sale_date || '',
    score: sim.score,
    reasons: sim.reasons,
    blocked: sim.blocked || null,
    max_candidates: config?.max_candidates || 5,
  };
}

async function collectPool(base44, addr, parcel) {
  const pool = new Map();
  const queries = [];
  if (addr.state && addr.zip) {
    queries.push({ state: addr.state, zip: normalizeZip(addr.zip) });
  }
  if (addr.state && addr.city) {
    queries.push({ state: addr.state, city: addr.city });
  }
  for (const query of queries) {
    try {
      const rows = await base44.asServiceRole.entities.PropstreamREListing.filter(query, '-created_date', POOL_LIMIT, 0);
      for (const row of rows || []) pool.set(row.id, row);
    } catch (error) {
      console.error('[listingMatch] reference query failed', JSON.stringify(query), error?.message);
    }
  }
  if (parcel) {
    try {
      const rows = await base44.asServiceRole.entities.PropstreamREListing.filter({ apn: parcel }, '-created_date', 50, 0);
      for (const row of rows || []) pool.set(row.id, row);
    } catch (error) {
      console.error('[listingMatch] apn query failed', error?.message);
    }
  }
  return [...pool.values()];
}

async function referenceCountForState(base44, state) {
  try {
    return await base44.asServiceRole.entities.PropstreamREListing.count({ state });
  } catch (error) {
    console.error('[listingMatch] reference count failed:', error?.message);
    return -1;
  }
}

function buildOwnership(patch) {
  const now = new Date().toISOString();
  return {
    match_status: patch.match_status,
    review_status: patch.review_status || 'none',
    owner_of_record: patch.owner_of_record || '',
    ownership_type: patch.ownership_type || 'unknown',
    owner_mailing_address: patch.owner_mailing_address || '',
    parcel_id: patch.parcel_id || '',
    characteristics: patch.characteristics || {},
    source: patch.source || '',
    source_record_id: patch.source_record_id || '',
    source_date: patch.source_date || '',
    matched_at: now,
    matching_version: MATCHING_VERSION,
    rule_used: patch.rule_used || '',
    confidence_basis: patch.confidence_basis || '',
    explanation: patch.explanation || '',
    candidate_ids: patch.candidate_ids || [],
    candidates: patch.candidates || [],
  };
}

/**
 * Run the staged match for one opportunity. Returns the ownership block to store
 * plus the audit event type. Never mutates records itself.
 */
export async function runMatch(base44, opportunity, config) {
  const subject = {
    street: opportunity?.address?.street || '',
    unit: opportunity?.address?.unit || '',
    city: opportunity?.address?.city || '',
    state: opportunity?.address?.state || '',
    zip: opportunity?.address?.zip || '',
  };
  const normalized = normalizeAddress(subject);
  if (!normalized.street || !normalized.state) {
    return {
      ownership: { ...(opportunity?.ownership || {}), match_status: 'failed', explanation: 'Address is incomplete, so it cannot be matched yet.', matched_at: new Date().toISOString(), matching_version: MATCHING_VERSION },
      event: 'row_failed',
    };
  }

  const parcel = normalizeParcel(opportunity?.listing?.parcel_id || '');
  let pool = [];
  try {
    pool = await collectPool(base44, normalized, opportunity?.listing?.parcel_id || '');
  } catch (error) {
    console.error('[listingMatch] pool build failed:', error?.message);
    return {
      ownership: {
        ...(opportunity?.ownership || {}),
        match_status: 'failed',
        explanation: 'The reference lookup could not be completed. Nothing was matched or invented.',
        matched_at: new Date().toISOString(),
        matching_version: MATCHING_VERSION,
      },
      event: 'row_failed',
    };
  }

  if (pool.length === 0) {
    const stateCount = await referenceCountForState(base44, normalized.state);
    if (stateCount === 0) {
      const ownership = buildOwnership({
        match_status: 'reference_unavailable',
        rule_used: 'no_reference_for_state',
        explanation: `The stored PropStream reference database has no records for ${normalized.state} yet, so no ownership match is possible. The property stays in your CRM and can be rechecked later.`,
      });
      return { ownership, event: 'match_reference_unavailable' };
    }
    const ownership = buildOwnership({
      match_status: 'no_match',
      rule_used: 'no_candidates',
      explanation: 'No stored reference record matched this address in the same state and ZIP/city. Nothing was assumed about ownership.',
    });
    return { ownership, event: 'match_unmatched' };
  }

  const exactKey = normalized.match_key;
  const scored = [];
  let exactHit = null;
  let parcelHit = null;
  let parcelConflict = false;

  for (const record of pool) {
    if (normalizeState(record.state) && normalizeState(record.state) !== normalized.state) continue;
    const recordAddr = normalizeAddress(refAddress(record));
    const recordParcel = normalizeParcel(record.apn);
    const candidate = redactedCandidate(record, subject, config);
    scored.push(candidate);

    const streetEqual = recordAddr.street === normalized.street;
    const cityEqual = recordAddr.city && normalized.city ? recordAddr.city === normalized.city : true;
    const zipEqual = recordAddr.zip && normalized.zip ? recordAddr.zip === normalized.zip : false;
    if (streetEqual && cityEqual && (zipEqual || !normalized.zip || !recordAddr.zip)) {
      exactHit = record;
    }

    if (parcel && recordParcel) {
      if (recordParcel === parcel) {
        parcelHit = record;
      } else {
        const unitConflict = candidate.blocked === 'different_unit';
        if (streetEqual && !unitConflict) parcelConflict = true;
      }
    }
  }

  if (exactHit) {
    const ownership = buildOwnership({
      match_status: 'verified',
      owner_of_record: ownerNameFromRecord(exactHit),
      ownership_type: ownershipTypeFromRecord(exactHit),
      owner_mailing_address: ownerMailingAddressFromRecord(exactHit),
      parcel_id: exactHit.apn || '',
      characteristics: redactedCandidate(exactHit, subject, config).characteristics,
      source: exactHit.source || 'PropStream',
      source_record_id: exactHit.id,
      source_date: exactHit.list_date || exactHit.last_sale_date || '',
      rule_used: 'exact_normalized_address',
      confidence_basis: 'Street, unit handling, city and state all agree after normalization.',
      explanation: 'The normalized property address and unit exactly match one stored reference record in the same jurisdiction. This is the owner of record as of the source date, not necessarily the seller.',
      candidate_ids: [exactHit.id],
      candidates: [redactedCandidate(exactHit, subject, config)],
    });
    return { ownership, event: 'match_verified' };
  }

  scored.sort((a, b) => b.score - a.score);
  const viable = scored.filter((c) => !c.blocked && c.score > 0);
  const top = viable[0] || null;
  const second = viable[1] || null;
  const maxCandidates = config?.max_candidates || 5;
  const candidates = viable.slice(0, maxCandidates).map((c) => ({ ...c, max_candidates: undefined }));

  if (parcelHit && !parcelConflict) {
    const ownership = buildOwnership({
      match_status: 'verified',
      owner_of_record: ownerNameFromRecord(parcelHit),
      ownership_type: ownershipTypeFromRecord(parcelHit),
      owner_mailing_address: ownerMailingAddressFromRecord(parcelHit),
      parcel_id: parcelHit.apn || '',
      characteristics: redactedCandidate(parcelHit, subject, config).characteristics,
      source: parcelHit.source || 'PropStream',
      source_record_id: parcelHit.id,
      source_date: parcelHit.list_date || parcelHit.last_sale_date || '',
      rule_used: 'parcel_match',
      confidence_basis: 'The parcel identifier matches the reference record within the same state.',
      explanation: 'Parcel identifiers agree with one stored reference record. Owner details are the owner of record as of the source date.',
      candidate_ids: [parcelHit.id],
      candidates: [redactedCandidate(parcelHit, subject, config)],
    });
    return { ownership, event: 'match_verified' };
  }

  if (parcelConflict) {
    const ownership = buildOwnership({
      match_status: 'possible',
      review_status: 'pending',
      rule_used: 'parcel_conflict',
      explanation: 'The submitted parcel identifier conflicts with the stored reference records for this address, so no automatic match was made. Review the candidates before relying on ownership.',
      candidate_ids: candidates.map((c) => c.id),
      candidates,
    });
    return { ownership, event: 'match_possible' };
  }

  const gap = top && second ? top.score - second.score : 100;
  const autoVerify = config?.auto_verify_min_score ?? 92;
  const possibleMin = config?.possible_min_score ?? 70;
  const ambiguityGap = config?.ambiguity_gap ?? 8;

  if (top && top.score >= autoVerify && gap >= ambiguityGap) {
    const record = pool.find((r) => r.id === top.id);
    const ownership = buildOwnership({
      match_status: 'verified',
      owner_of_record: ownerNameFromRecord(record),
      ownership_type: ownershipTypeFromRecord(record),
      owner_mailing_address: ownerMailingAddressFromRecord(record),
      parcel_id: record?.apn || '',
      characteristics: top.characteristics,
      source: record?.source || 'PropStream',
      source_record_id: top.id,
      source_date: record?.list_date || record?.last_sale_date || '',
      rule_used: 'single_high_similarity_candidate',
      confidence_basis: `Only one candidate scored ${top.score}/100 and it is ${gap} points clear of the next.`,
      explanation: `One reference record is an unambiguous match after normalization (${top.reasons.join('; ')}). Owner details are the owner of record as of the source date.`,
      candidate_ids: [top.id],
      candidates: [top],
    });
    return { ownership, event: 'match_verified' };
  }

  if (top && top.score >= possibleMin) {
    const ownership = buildOwnership({
      match_status: 'possible',
      review_status: 'pending',
      rule_used: gap < ambiguityGap ? 'ambiguous_candidates' : 'similar_address_candidate',
      confidence_basis: top
        ? `Best candidate scored ${top.score}/100; next best ${second ? second.score : 'none'}.`
        : '',
      explanation: gap < ambiguityGap
        ? 'More than one reference record is equally plausible for this address, so no automatic match was made. Review the candidates before relying on ownership.'
        : 'One reference record resembles this address but not closely enough to be verified automatically. Review the candidate before relying on ownership.',
      candidate_ids: candidates.map((c) => c.id),
      candidates,
    });
    return { ownership, event: 'match_possible' };
  }

  const ownership = buildOwnership({
    match_status: 'no_match',
    rule_used: 'no_similar_candidate',
    explanation: 'Reference records exist for this state but none resembles this address closely enough. Nothing was assumed about ownership.',
    candidate_ids: candidates.map((c) => c.id),
    candidates,
  });
  return { ownership, event: 'match_unmatched' };
}

/**
 * Apply a match result to an opportunity, preserving agent-confirmed and
 * agent-verified information. Newer conflicting evidence is flagged, never
 * silently overwritten.
 */
export async function applyMatch(base44, opportunity, config, options = {}) {
  const { ownership, event } = await runMatch(base44, opportunity, config);
  const existing = opportunity.ownership || {};
  const patch = { ownership: { ...ownership }, last_activity_at: new Date().toISOString() };

  const agentConfirmed = existing.review_status === 'confirmed';
  const agentVerifiedOwner = existing.agent_verified_owner;
  const agentVerifiedAt = existing.agent_verified_at;

  if (agentConfirmed || agentVerifiedOwner) {
    const conflicting = (agentVerifiedOwner && ownership.owner_of_record && agentVerifiedOwner !== ownership.owner_of_record)
      || (existing.source_record_id && ownership.source_record_id && existing.source_record_id !== ownership.source_record_id);
    if (conflicting) {
      patch.ownership = {
        ...ownership,
        review_status: agentConfirmed ? 'confirmed' : existing.review_status || 'none',
        agent_verified_owner: agentVerifiedOwner || '',
        agent_verified_at: agentVerifiedAt || '',
        owner_of_record: agentVerifiedOwner || existing.owner_of_record || ownership.owner_of_record,
        conflict_note: `Newer reference evidence (${ownership.source_date || 'date unknown'}) differs from the agent-verified ownership recorded earlier. Review before relying on either.`,
        resolved_by_name: existing.resolved_by_name || '',
        resolved_at: existing.resolved_at || '',
      };
    } else {
      patch.ownership = {
        ...ownership,
        review_status: agentConfirmed ? 'confirmed' : existing.review_status || 'none',
        agent_verified_owner: agentVerifiedOwner || '',
        agent_verified_at: agentVerifiedAt || '',
        resolved_by_name: existing.resolved_by_name || '',
        resolved_at: existing.resolved_at || '',
      };
    }
  }

  if (options.forceReview) {
    patch.ownership.review_status = 'pending';
  }

  await base44.asServiceRole.entities.AgentListingOpportunity.update(opportunity.id, patch);
  await audit(base44, {
    agent_user_id: opportunity.agent_user_id,
    ...(options.actor || {}),
    event_type: event === 'row_failed' ? 'match_unmatched' : event,
    opportunity_id: opportunity.id,
    property_id: opportunity.property_id,
    details: {
      match_status: patch.ownership.match_status,
      rule_used: patch.ownership.rule_used,
      matching_version: MATCHING_VERSION,
      candidate_ids: patch.ownership.candidate_ids,
      conflict: !!patch.ownership.conflict_note,
      ai_used: false,
    },
  });
  return patch.ownership;
}

export function mapListingStatus(raw) {
  const s = normText(raw);
  if (!s) return { mapped: 'unknown', review_required: true };
  if (/\bpending\b|\bunder contract\b|\bactive under contract\b|\bcontingent\b|\backup\b/.test(s)) {
    return { mapped: 'pending', review_required: false };
  }
  if (/\bunder contract\b|\bcontract\b/.test(s)) return { mapped: 'under_contract', review_required: false };
  if (/\bactive\b|\bnew\b|\bcoming soon\b|\bback on market\b/.test(s)) return { mapped: 'active', review_required: false };
  if (/\bsold\b|\bclosed\b/.test(s)) return { mapped: 'sold', review_required: false };
  if (/\bwithdrawn\b|\bcancel|\bexpired\b|\boff market\b/.test(s)) return { mapped: 'withdrawn', review_required: false };
  return { mapped: 'unknown', review_required: true };
}