// Facebook customer-list (manual CSV upload) export evaluation.
//
// DOCTRINE
//   • VISIBILITY IS NOT PERMISSION. An agent seeing owner contact details in their
//     own CRM never makes that person advertising-eligible.
//   • Eligibility needs, separately: documented permission for customer-list
//     advertising, a source-use policy that permits the export, no suppression, a
//     corroborated identity and at least one supported identifier.
//   • The file is a Meta customer-list CSV for MANUAL upload in Ads Manager. Nothing
//     is uploaded, no audience is created and no money is spent.
//   • Location columns come from the OWNER MAILING address the reference record
//     supplies — never from the subject property, which is not the person's address.
//   • Raw identifiers are never written to logs or audit records.

import { contactAssociationQualifies } from './listingAccess.ts';
import { normalizeEmail, normalizePhone } from './listingEnrichment.ts';

export const ELIGIBILITY = {
  eligible: 'Eligible',
  permission_missing: 'Permission evidence missing',
  source_restricted: 'Source use restricted',
  suppressed: 'Suppressed',
  identity_review: 'Identity review required',
  insufficient_identifiers: 'Insufficient supported identifiers',
};

export const SUPPRESSED_STATUSES = ['unsubscribed_all', 'complained', 'suppressed', 'bounced'];
export const UNUSABLE_MARKS = ['incorrect', 'disconnected', 'not_owner'];

// Documented Meta manual-upload columns. Email and phone accept up to three
// separate columns each, one value per cell.
export const EXPORT_HEADERS = ['email', 'email2', 'email3', 'phone', 'phone2', 'phone3', 'fn', 'ln', 'ct', 'st', 'zip', 'country'];

const US_STATES = new Set(['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY']);

function splitName(fullName) {
  const parts = String(fullName || '').trim().replace(/\s+/g, ' ').split(' ').filter(Boolean);
  if (parts.length === 0) return { first: '', last: '' };
  if (parts.length === 1) return { first: parts[0], last: '' };
  return { first: parts[0], last: parts.slice(1).join(' ') };
}

// One provisional person per (record, owner name). Owner name comes from the
// verified ownership evidence or the value carried on the contact itself.
function peopleFromOpportunity(opp) {
  if (!contactAssociationQualifies(opp)) return [];
  const ownership = opp.ownership || {};
  const primaryOwner = String(ownership.owner_of_record || '').trim();
  const usable = (Array.isArray(opp.contacts) ? opp.contacts : []).filter(
    (c) => c && c.value && !UNUSABLE_MARKS.includes(c.agent_status || 'none'),
  );
  if (usable.length === 0) {
    return [{ ownerName: primaryOwner, emails: [], phones: [], city: ownership.owner_mailing_city || '', state: ownership.owner_mailing_state || '', zip: ownership.owner_mailing_zip || '', identityConfirmed: false, permission: opp.advertising_permission || {}, opportunityIds: [opp.id] }];
  }

  const byOwner = new Map();
  for (const contact of usable) {
    const ownerName = String(contact.owner_name || primaryOwner || '').trim();
    const key = ownerName.toLowerCase() || '__unassigned__';
    if (!byOwner.has(key)) {
      byOwner.set(key, {
        ownerName,
        emails: [],
        phones: [],
        city: ownership.owner_mailing_city || '',
        state: ownership.owner_mailing_state || '',
        zip: ownership.owner_mailing_zip || '',
        identityConfirmed: false,
        permission: opp.advertising_permission || {},
        opportunityIds: [opp.id],
      });
    }
    const person = byOwner.get(key);
    if (contact.kind === 'email') person.emails.push(normalizeEmail(contact.value));
    else person.phones.push(normalizePhone(contact.value));
    if (contact.agent_status === 'confirmed') person.identityConfirmed = true;
  }
  return [...byOwner.values()];
}

// Merge people that share an identifier — the same human across several imported
// properties becomes ONE row, while two different owners with the same name and
// different contact details stay separate.
function mergePeople(people) {
  const parent = people.map((_, i) => i);
  const find = (i) => {
    let root = i;
    while (parent[root] !== root) root = parent[root];
    return root;
  };
  const union = (a, b) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[rb] = ra;
  };
  const owner = new Map();
  people.forEach((person, index) => {
    for (const identifier of [...person.emails, ...person.phones]) {
      if (owner.has(identifier)) union(owner.get(identifier), index);
      else owner.set(identifier, index);
    }
  });

  const groups = new Map();
  people.forEach((person, index) => {
    const root = find(index);
    if (!groups.has(root)) {
      groups.set(root, {
        ownerName: person.ownerName,
        emails: new Set(),
        phones: new Set(),
        city: person.city,
        state: person.state,
        zip: person.zip,
        identityConfirmed: false,
        permissionGranted: false,
        opportunityIds: new Set(),
      });
    }
    const group = groups.get(root);
    if (!group.ownerName && person.ownerName) group.ownerName = person.ownerName;
    if (!group.city && person.city) group.city = person.city;
    if (!group.state && person.state) group.state = person.state;
    if (!group.zip && person.zip) group.zip = person.zip;
    person.emails.forEach((e) => group.emails.add(e));
    person.phones.forEach((p) => group.phones.add(p));
    if (person.identityConfirmed) group.identityConfirmed = true;
    const permission = person.permission || {};
    if (permission.granted === true && !permission.revoked_at && String(permission.reference || '').trim()) {
      group.permissionGranted = true;
    }
    person.opportunityIds.forEach((id) => group.opportunityIds.add(id));
  });

  return [...groups.values()].map((g) => ({
    ownerName: g.ownerName,
    emails: [...g.emails],
    phones: [...g.phones],
    city: g.city,
    state: g.state,
    zip: g.zip,
    identityConfirmed: g.identityConfirmed,
    permissionGranted: g.permissionGranted,
    opportunityIds: [...g.opportunityIds],
  }));
}

async function loadSuppressedEmails(base44, emails) {
  const suppressed = new Set();
  const list = emails.filter(Boolean).slice(0, 200);
  if (list.length === 0) return suppressed;
  try {
    const rows = await base44.asServiceRole.entities.ConsumerMarketingProfile.filter({ email: { $in: list } }, '-created_date', 400, 0);
    for (const row of rows || []) {
      if (SUPPRESSED_STATUSES.includes(row.suppression_status)) {
        suppressed.add(normalizeEmail(row.email));
      }
    }
  } catch (error) {
    // Fail CLOSED: if suppression cannot be checked, treat identifiers as suppressed.
    console.error('[facebookAudience] suppression lookup failed:', error?.message);
    list.forEach((e) => suppressed.add(e));
  }
  return suppressed;
}

const REASON_TEXT = {
  suppressed: 'This person has unsubscribed or is suppressed. Opt-outs always win.',
  source_restricted: 'Your platform administrator has not confirmed that the source terms permit customer-list advertising, so no one is exportable yet.',
  insufficient_identifiers: 'No usable email address or phone number remains (rejected or missing values are not exported).',
  permission_missing: 'No documented permission for customer-list advertising is recorded for this person.',
  identity_review: 'None of this person’s contact values has been confirmed by you, so identity is not corroborated.',
};

/**
 * Evaluate distinct people across the given opportunities.
 * Returns { people, summary } where each person carries an eligibility status.
 */
export async function evaluateAudience(base44, opportunities, config) {
  const people = mergePeople((opportunities || []).flatMap(peopleFromOpportunity));
  const allEmails = people.flatMap((p) => p.emails);
  const suppressed = await loadSuppressedEmails(base44, allEmails);
  const sourceEnabled = config?.source_use_policy?.customer_list_export_enabled === true;

  const evaluated = people.map((person) => {
    let status = 'eligible';
    const isSuppressed = person.emails.some((e) => suppressed.has(e));
    if (isSuppressed) status = 'suppressed';
    else if (!sourceEnabled) status = 'source_restricted';
    else if (person.emails.length === 0 && person.phones.length === 0) status = 'insufficient_identifiers';
    else if (!person.permissionGranted) status = 'permission_missing';
    else if (!person.identityConfirmed) status = 'identity_review';

    return {
      ...person,
      status,
      status_label: ELIGIBILITY[status],
      reason: status === 'eligible' ? '' : REASON_TEXT[status] || '',
    };
  });

  const counts = {};
  for (const key of Object.keys(ELIGIBILITY)) counts[key] = 0;
  evaluated.forEach((p) => { counts[p.status] += 1; });

  return {
    people: evaluated,
    summary: {
      people_evaluated: evaluated.length,
      eligible: counts.eligible,
      excluded: evaluated.length - counts.eligible,
      counts,
      source_use_enabled: sourceEnabled,
      policy_version: config?.source_use_policy?.policy_version || 'v1',
    },
  };
}

function csvCell(value, { guardFormula = true } = {}) {
  let text = value === null || value === undefined ? '' : String(value);
  if (guardFormula && /^[=+\-@]/.test(text)) text = `'${text}`;
  if (/[",\r\n]/.test(text) || /^\s|\s$/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

// Meta customer-list CSV for MANUAL upload. Unhashed values: Meta hashes the file
// during upload, so API-hashing rules do not apply here.
export function buildCustomerListCsv(eligiblePeople) {
  const rows = [EXPORT_HEADERS.join(',')];
  for (const person of eligiblePeople) {
    const { first, last } = splitName(person.ownerName);
    const state = String(person.state || '').trim().toUpperCase();
    const isUs = US_STATES.has(state);
    const cells = [
      person.emails[0] || '',
      person.emails[1] || '',
      person.emails[2] || '',
      person.phones[0] || '',
      person.phones[1] || '',
      person.phones[2] || '',
      first,
      last,
      person.city || '',
      state,
      person.zip || '',
      isUs ? 'US' : '',
    ];
    rows.push(cells.map((cell, index) => csvCell(cell, { guardFormula: index >= 2 })).join(','));
  }
  return { csv: rows.join('\r\n'), rowCount: rows.length - 1, fields: EXPORT_HEADERS };
}