// Owner + property enrichment for the Agent Pending Listings workflow.
//
// DOCTRINE
//   • Enrichment reads ONLY the stored PropStream reference record that the
//     deterministic match already resolved (verified) or that an admin confirmed.
//     No external lookup is invented, and no contact is attached to an ambiguous,
//     unit-conflicting or candidate-only association.
//   • An explicit allowlist decides what may be copied. Demographic, health,
//     financial and provider-only helper columns are never copied.
//   • Enrichment NEVER rewrites ownership evidence or an admin confirmation. A
//     disagreement with the stored evidence becomes a review flag.
//   • Repeated enrichment is idempotent: contacts are keyed by kind + normalized
//     value, and an agent's own mark always survives a refresh.

import {
  contactSourceFields,
  propertyFactFields,
} from './listingAccess.ts';
import { ownerNameFromRecord } from './listingAddress.ts';

const MAX_CONTACTS = 12;

export function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

// Digits only, keeping/adding the US country code Meta requires for matching.
export function normalizePhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) return `1${digits}`;
  return digits;
}

export function displayPhone(value) {
  const digits = normalizePhone(value);
  if (digits.length === 11 && digits.startsWith('1')) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return String(value || '').trim();
}

function coOwnerNameFromRecord(record) {
  const first = String(record?.owner_2_first_name || '').trim();
  const last = String(record?.owner_2_last_name || '').trim();
  const joined = `${first} ${last}`.trim();
  return joined;
}

// Contact values actually present on the matched record, restricted to the
// configured allowlist of real reference columns.
export function extractContacts(record, config, ownership) {
  const fields = contactSourceFields(config);
  const source = record?.source || 'PropStream';
  const sourceDate = record?.list_date || record?.last_sale_date || '';
  const ownerName = ownerNameFromRecord(record) || ownership?.owner_of_record || '';
  const out = [];
  const seen = new Set();
  const push = (entry) => {
    const key = `${entry.kind}:${entry.value}`;
    if (!entry.value || seen.has(key) || out.length >= MAX_CONTACTS) return;
    seen.add(key);
    out.push(entry);
  };

  for (let i = 1; i <= 5; i += 1) {
    const column = `phone_${i}`;
    if (!fields.includes(column)) continue;
    const raw = record?.[column];
    const value = normalizePhone(raw);
    if (!value) continue;
    const restrictions = [];
    if (record?.[`${column}_dnc`] === true) restrictions.push('dnc_listed');
    push({
      kind: 'phone',
      value,
      value_display: displayPhone(raw),
      owner_name: ownerName,
      phone_type: String(record?.[`${column}_type`] || ''),
      source,
      source_record_id: record?.id || '',
      source_date: sourceDate || '',
      verification: 'unverified',
      restrictions,
    });
  }

  for (let i = 1; i <= 4; i += 1) {
    const column = `email_${i}`;
    if (!fields.includes(column)) continue;
    const value = normalizeEmail(record?.[column]);
    if (!value) continue;
    const restrictions = [];
    if (record?.do_not_mail === true) restrictions.push('do_not_mail');
    push({
      kind: 'email',
      value,
      value_display: String(record[column]).trim(),
      owner_name: ownerName,
      phone_type: '',
      source,
      source_record_id: record?.id || '',
      source_date: sourceDate || '',
      verification: 'unverified',
      restrictions,
    });
  }

  return out;
}

// Subject-property facts from the allowlist. The owner's mailing address is NOT a
// property fact and is never copied here.
export function extractPropertyFacts(record, config) {
  const fields = propertyFactFields(config);
  const map = {
    county: record?.county,
    parcel_id: record?.apn,
    property_type: record?.property_type,
    beds: record?.beds,
    baths: record?.baths,
    building_sqft: record?.square_feet,
    lot_size: record?.lot_size,
    year_built: record?.year_built,
    listing_status: record?.listing_status || record?.property_status,
    list_date: record?.list_date,
    days_on_market: record?.days_on_market,
    last_sale_date: record?.last_sale_date,
  };
  const facts = {};
  for (const key of fields) {
    const value = map[key];
    if (value === undefined || value === null || value === '') continue;
    facts[key] = value;
  }
  return facts;
}

// Merge freshly extracted contacts into the stored ones. Agent marks are preserved
// verbatim; a value the agent rejected is never restored as usable.
export function mergeContacts(existing, incoming, meta) {
  const previous = Array.isArray(existing) ? existing : [];
  const byKey = new Map();
  for (const contact of previous) {
    byKey.set(`${contact.kind}:${contact.value}`, { ...contact });
  }
  let added = 0;
  let unchanged = 0;
  const now = meta.at;

  for (const fresh of incoming) {
    const key = `${fresh.kind}:${fresh.value}`;
    const current = byKey.get(key);
    if (!current) {
      byKey.set(key, {
        ...fresh,
        contact_id: `${fresh.kind}-${fresh.value}`.replace(/[^a-z0-9@._+-]/g, '').slice(0, 90),
        agent_status: 'none',
        agent_status_by_name: '',
        agent_status_at: '',
        first_seen_at: now,
        last_seen_at: now,
      });
      added += 1;
      continue;
    }
    unchanged += 1;
    byKey.set(key, {
      ...current,
      owner_name: fresh.owner_name || current.owner_name || '',
      phone_type: fresh.phone_type || current.phone_type || '',
      source: fresh.source || current.source || '',
      source_record_id: fresh.source_record_id || current.source_record_id || '',
      source_date: fresh.source_date || current.source_date || '',
      restrictions: fresh.restrictions || current.restrictions || [],
      value_display: fresh.value_display || current.value_display || '',
      last_seen_at: now,
    });
  }

  return { contacts: [...byKey.values()], added, unchanged };
}

function ownershipDisagreement(record, ownership) {
  const referenceOwner = ownerNameFromRecord(record);
  const storedOwner = String(ownership?.owner_of_record || '').trim();
  if (!referenceOwner || !storedOwner) return '';
  if (referenceOwner.toLowerCase() === storedOwner.toLowerCase()) return '';
  return `The reference record now lists "${referenceOwner}" while this record holds "${storedOwner}". The stored evidence was kept and flagged for review.`;
}

/**
 * Enrich ONE opportunity. Returns the patch to store plus a completion category.
 * Categories: enriched | current | partial | review_required | no_reference | failed
 */
export async function enrichOpportunity(base44, opportunity, config, jobId) {
  const ownership = opportunity?.ownership || {};
  const at = new Date().toISOString();

  const notEnrichable = (status, message) => ({
    patch: {
      enrichment: {
        ...(opportunity.enrichment || {}),
        status,
        last_enriched_at: at,
        message,
        job_id: jobId || '',
      },
    },
    category: status === 'no_reference' ? 'no_reference' : 'review_required',
    added: 0,
    unchanged: 0,
    unavailable: 0,
    message,
  });

  if (ownership.match_status === 'possible' || ownership.review_status === 'pending') {
    return notEnrichable(
      'review_required',
      'Ownership is still under review, so no owner contact information was attached. Confirm the correct reference record first.',
    );
  }
  if (ownership.match_status !== 'verified' && ownership.review_status !== 'confirmed') {
    const message = ownership.match_status === 'reference_unavailable'
      ? 'The stored reference database has no records for this state yet, so nothing could be enriched.'
      : 'No verified or confirmed ownership association exists yet, so nothing was enriched.';
    return notEnrichable(ownership.match_status === 'reference_unavailable' ? 'no_reference' : 'review_required', message);
  }
  if (!ownership.source_record_id) {
    return notEnrichable('review_required', 'The verified association has no stored reference record id, so it cannot be enriched. Recheck the match first.');
  }

  let record = null;
  try {
    const rows = await base44.asServiceRole.entities.PropstreamRElisting.filter({ id: ownership.source_record_id });
    record = (rows || [])[0] || null;
  } catch (error) {
    console.error('[listingEnrichment] reference read failed:', error?.message);
    return {
      patch: {
        enrichment: {
          ...(opportunity.enrichment || {}),
          status: 'failed',
          last_enriched_at: at,
          message: 'The stored reference record could not be read. Nothing was changed; try again.',
          job_id: jobId || '',
        },
      },
      category: 'failed',
      added: 0,
      unchanged: 0,
      unavailable: 0,
      message: 'Reference record read failed.',
    };
  }

  if (!record) {
    return notEnrichable('no_reference', 'The matched reference record is no longer in the stored database. Recheck the match to re-resolve it.');
  }

  const extracted = extractContacts(record, config, ownership);
  const merged = mergeContacts(opportunity.contacts, extracted, { at });
  const facts = extractPropertyFacts(record, config);
  const conflict = ownershipDisagreement(record, ownership);
  const coOwner = coOwnerNameFromRecord(record);
  const sourceDate = record.list_date || record.last_sale_date || '';

  // Fill EMPTY ownership sub-fields only. Never overwrite stored or confirmed evidence.
  const ownershipPatch = {};
  if (!ownership.co_owner_of_record && coOwner) ownershipPatch.co_owner_of_record = coOwner;
  if (!ownership.owner_mailing_city && record.owner_mailing_city) ownershipPatch.owner_mailing_city = record.owner_mailing_city;
  if (!ownership.owner_mailing_state && record.owner_mailing_state) ownershipPatch.owner_mailing_state = record.owner_mailing_state;
  if (!ownership.owner_mailing_zip && record.owner_mailing_zip) ownershipPatch.owner_mailing_zip = record.owner_mailing_zip;
  if (!ownership.source_date && sourceDate) ownershipPatch.source_date = sourceDate;
  if (!ownership.parcel_id && record.apn) ownershipPatch.parcel_id = record.apn;

  const storedCount = Array.isArray(opportunity.contacts) ? opportunity.contacts.length : 0;
  const hasContacts = merged.contacts.length > 0;
  let status = 'enriched';
  let message = `${merged.added} contact value(s) added.`;
  let category = 'enriched';

  if (!hasContacts) {
    status = 'partial';
    category = 'partial';
    message = 'Ownership and property facts were refreshed, but the reference record holds no owner phone numbers or emails.';
  } else if (merged.added === 0) {
    status = 'current';
    category = 'current';
    message = 'Already current — the stored contact values match the reference record.';
  }
  if (conflict) {
    status = 'review_required';
    category = 'review_required';
    message = `${message} ${conflict}`;
  }

  const patch = {
    contacts: merged.contacts,
    property_facts: { ...(opportunity.property_facts || {}), ...facts },
    enrichment: {
      status,
      last_enriched_at: at,
      source: record.source || 'PropStream',
      source_date: sourceDate,
      reference_record_id: record.id,
      added_count: merged.added,
      unchanged_count: merged.unchanged,
      unavailable_count: extracted.length === 0 ? 1 : 0,
      message,
      conflict_note: conflict,
      job_id: jobId || '',
    },
    last_activity_at: at,
  };
  if (Object.keys(ownershipPatch).length > 0) {
    patch.ownership = { ...ownership, ...ownershipPatch };
  }

  return {
    patch,
    category,
    added: merged.added,
    unchanged: merged.unchanged,
    unavailable: storedCount === 0 && !hasContacts ? 1 : 0,
    message,
    conflict,
  };
}