import { base44 } from '@/api/base44Client';

// Thin client for the sanctioned Agent Pending Listings functions. Every call is
// scoped server-side to the authenticated user — the browser never sends an agent id.
export async function callFn(name, payload = {}) {
  try {
    const res = await base44.functions.invoke(name, payload);
    return res.data;
  } catch (error) {
    const message = error?.response?.data?.error || error?.message || 'Something went wrong.';
    throw new Error(message);
  }
}

export const listingImport = {
  start: (payload) => callFn('agentListingImport', { action: 'start', ...payload }),
  process: (importId) => callFn('agentListingImport', { action: 'process', import_id: importId, max_rows: 25 }),
  history: () => callFn('agentListingImport', { action: 'list' }),
  detail: (importId) => callFn('agentListingImport', { action: 'detail', import_id: importId }),
  mappingFor: (headerSignature) => callFn('agentListingImport', { action: 'mapping_lookup', header_signature: headerSignature }),
};

export const opportunities = {
  dashboard: (payload = {}) => callFn('agentListingOpportunity', { action: 'dashboard', ...payload }),
  detail: (opportunityId) => callFn('agentListingOpportunity', { action: 'detail', opportunity_id: opportunityId }),
  act: (action, opportunityId, extra = {}) => callFn('agentListingOpportunity', { action, opportunity_id: opportunityId, ...extra }),
};

export const matching = {
  one: (opportunityId) => callFn('agentListingMatch', { action: 'match_one', opportunity_id: opportunityId }),
  aiExplain: (opportunityId) => callFn('agentListingMatch', { action: 'ai_explain', opportunity_id: opportunityId }),
};

export const enrichment = {
  start: (payload) => callFn('agentListingEnrich', { action: 'start', ...payload }),
  process: (jobId, batchSize = 15) => callFn('agentListingEnrich', { action: 'process', job_id: jobId, batch_size: batchSize }),
  status: (jobId) => callFn('agentListingEnrich', { action: 'status', job_id: jobId }),
  retry: (jobId) => callFn('agentListingEnrich', { action: 'retry', job_id: jobId }),
  markContact: (opportunityId, contactId, status, kind) => callFn('agentListingEnrich', {
    action: 'mark_contact',
    opportunity_id: opportunityId,
    contact_id: contactId,
    status,
    kind: kind || '',
  }),
  setPermission: (opportunityId, payload) => callFn('agentListingEnrich', {
    action: 'set_permission',
    opportunity_id: opportunityId,
    ...payload,
  }),
};

export const facebookExport = {
  preview: (payload) => callFn('agentListingExport', { action: 'preview', ...payload }),
  generate: (payload) => callFn('agentListingExport', { action: 'generate', ...payload }),
  history: () => callFn('agentListingExport', { action: 'history' }),
};

export const ENRICHMENT_LABELS = {
  never: 'Not enriched yet',
  enriched: 'Enriched',
  current: 'Already current',
  partial: 'Partially enriched',
  review_required: 'Review required',
  no_reference: 'No reference record',
  failed: 'Enrichment failed',
};

export const ENRICHMENT_STYLES = {
  never: 'bg-slate-100 text-slate-600 border-slate-200',
  enriched: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  current: 'bg-cyan-50 text-cyan-800 border-cyan-200',
  partial: 'bg-amber-50 text-amber-800 border-amber-200',
  review_required: 'bg-amber-50 text-amber-800 border-amber-200',
  no_reference: 'bg-slate-100 text-slate-600 border-slate-200',
  failed: 'bg-rose-50 text-rose-700 border-rose-200',
};

export const CONTACT_MARKS = [
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'incorrect', label: 'Incorrect' },
  { value: 'disconnected', label: 'Disconnected' },
  { value: 'not_owner', label: 'Someone else' },
];

export const CONTACT_MARK_LABELS = {
  none: 'Not marked',
  confirmed: 'You confirmed this',
  incorrect: 'Marked incorrect',
  disconnected: 'Marked disconnected',
  not_owner: 'Belongs to someone else',
};

export const ELIGIBILITY_LABELS = {
  eligible: 'Eligible',
  permission_missing: 'Permission evidence missing',
  source_restricted: 'Source use restricted',
  suppressed: 'Suppressed',
  identity_review: 'Identity review required',
  insufficient_identifiers: 'Insufficient supported identifiers',
};

export const adminApi = {
  overview: (filters = {}) => callFn('agentListingAdmin', { action: 'overview', filters }),
  importDetail: (importId) => callFn('agentListingAdmin', { action: 'import_detail', import_id: importId }),
  resolveMatch: (opportunityId, decision, candidateId, note) => callFn('agentListingAdmin', {
    action: 'resolve_match',
    opportunity_id: opportunityId,
    decision,
    candidate_id: candidateId || '',
    note: note || '',
  }),
  retryImport: (importId) => callFn('agentListingAdmin', { action: 'retry_import', import_id: importId }),
  recheckUnmatched: (state) => callFn('agentListingAdmin', { action: 'recheck_unmatched', state: state || '' }),
  reassign: (opportunityId, email) => callFn('agentListingAdmin', {
    action: 'reassign',
    opportunity_id: opportunityId,
    to_agent_email: email,
  }),
  configGet: () => callFn('agentListingAdmin', { action: 'config_get' }),
  enrichmentOverview: () => callFn('agentListingAdmin', { action: 'enrichment_overview' }),
  configSet: (config) => callFn('agentListingAdmin', { action: 'config_set', config }),
  trends: () => callFn('agentListingAdmin', { action: 'trends' }),
};

export const MATCH_LABELS = {
  verified: 'Ownership verified',
  possible: 'Needs review',
  no_match: 'No match found',
  unmatched: 'Not matched yet',
  reference_unavailable: 'Reference unavailable',
  failed: 'Match failed',
};

export const MATCH_STYLES = {
  verified: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  possible: 'bg-amber-50 text-amber-800 border-amber-200',
  no_match: 'bg-slate-100 text-slate-600 border-slate-200',
  unmatched: 'bg-slate-100 text-slate-600 border-slate-200',
  reference_unavailable: 'bg-slate-100 text-slate-600 border-slate-200',
  failed: 'bg-rose-50 text-rose-700 border-rose-200',
};

export const LISTING_STATUS_LABELS = {
  pending: 'Pending',
  under_contract: 'Under contract',
  active: 'Active',
  sold: 'Sold',
  withdrawn: 'Withdrawn',
  unknown: 'Status unclear',
};

export const SERVICE_NEEDS = [
  { value: 'unknown', label: 'Not established yet' },
  { value: 'full_estate_sale', label: 'Full estate sale' },
  { value: 'furniture_sale', label: 'Furniture or selected-item sale' },
  { value: 'buyout', label: 'Buyout' },
  { value: 'donation', label: 'Donation coordination' },
  { value: 'cleanout', label: 'Cleanout' },
  { value: 'unsure', label: 'Unsure' },
  { value: 'none', label: 'No service needed' },
];

export const IMPORT_FIELDS = [
  { key: 'street', label: 'Street address', required: true, hints: ['address', 'street', 'situs', 'property'] },
  { key: 'unit', label: 'Unit', hints: ['unit', 'apt', 'suite', '#'] },
  { key: 'city', label: 'City', required: true, hints: ['city', 'town'] },
  { key: 'state', label: 'State', required: true, hints: ['state'] },
  { key: 'zip', label: 'ZIP code', hints: ['zip', 'postal'] },
  { key: 'listing_status', label: 'Listing status', hints: ['status', 'stage'] },
  { key: 'listing_id', label: 'Listing / MLS ID', hints: ['mls', 'listing id', 'listing #', 'listing number'] },
  { key: 'pending_date', label: 'Pending date', hints: ['pending', 'contract date'] },
  { key: 'expected_closing_date', label: 'Expected closing date', hints: ['closing', 'close date', 'settlement'] },
  { key: 'parcel_id', label: 'Parcel / APN', hints: ['apn', 'parcel'] },
  { key: 'source_date', label: 'Source export date', hints: ['export', 'source date', 'as of'] },
  { key: 'list_price', label: 'List price', hints: ['price', 'list price'] },
  { key: 'brokerage', label: 'Brokerage', hints: ['brokerage', 'office'] },
];

export function headerSignature(headers) {
  return headers.map((h) => String(h).trim().toLowerCase()).sort().join('|').slice(0, 500);
}

export function guessMapping(headers) {
  const mapping = {};
  const used = new Set();
  const lower = headers.map((h) => ({ raw: h, low: String(h).toLowerCase() }));
  for (const field of IMPORT_FIELDS) {
    const hit = lower.find((h) => !used.has(h.raw) && field.hints.some((hint) => h.low.includes(hint)));
    if (hit) {
      mapping[field.key] = hit.raw;
      used.add(hit.raw);
    }
  }
  return mapping;
}