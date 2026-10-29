// Access, policy and audit helpers for the Agent Pending Listings workflow.
// Every record write in this feature runs through a sanctioned server function,
// so agent identity is always derived from the authenticated session.

export const DEFAULT_ALLOWED_ENRICHMENT = [
  'owner_of_record',
  'ownership_type',
  'owner_mailing_address',
  'parcel_id',
  'characteristics',
];

export const FALLBACK_CONFIG = {
  key: 'default',
  matching_version: 'v1',
  auto_verify_min_score: 92,
  possible_min_score: 70,
  ambiguity_gap: 8,
  max_candidates: 5,
  allowed_enrichment_fields: DEFAULT_ALLOWED_ENRICHMENT,
  max_rows_per_import: 500,
  max_ai_calls_per_import: 25,
  ai_assist_enabled: true,
};

export function isAdmin(user) {
  return !!user && user.role === 'admin';
}

export async function currentUser(base44) {
  return await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
}

export async function loadConfig(base44) {
  try {
    const rows = await base44.asServiceRole.entities.AgentListingConfig.filter({ key: 'default' });
    if (rows && rows.length > 0) return { ...FALLBACK_CONFIG, ...rows[0] };
  } catch (error) {
    console.error('[agentListings] config load failed, using defaults:', error?.message);
  }
  return { ...FALLBACK_CONFIG };
}

export function allowedFields(config) {
  const list = Array.isArray(config?.allowed_enrichment_fields) && config.allowed_enrichment_fields.length
    ? config.allowed_enrichment_fields
    : DEFAULT_ALLOWED_ENRICHMENT;
  // Hard floor: owner contact details are never permitted enrichment, whatever policy says.
  const forbidden = ['phone', 'email', 'phone_1', 'email_1', 'owner_phone', 'owner_email'];
  return list.filter((f) => !forbidden.includes(f));
}

// Ownership evidence as an agent may see it. Owner mailing address stays separate
// from the subject property address; nothing here implies the owner is the seller.
export function ownershipForAgent(opportunity, config) {
  const ownership = opportunity?.ownership || {};
  const fields = allowedFields(config);
  const out = {
    match_status: ownership.match_status || 'unmatched',
    review_status: ownership.review_status || 'none',
    source: ownership.source || '',
    source_date: ownership.source_date || '',
    matched_at: ownership.matched_at || '',
    matching_version: ownership.matching_version || '',
    rule_used: ownership.rule_used || '',
    explanation: ownership.explanation || '',
    confidence_basis: ownership.confidence_basis || '',
    conflict_note: ownership.conflict_note || '',
    agent_verified_owner: ownership.agent_verified_owner || '',
    agent_verified_at: ownership.agent_verified_at || '',
    resolved_by_name: ownership.resolved_by_name || '',
    resolved_at: ownership.resolved_at || '',
    candidates: Array.isArray(ownership.candidates) ? ownership.candidates : [],
    ai_hint: opportunity?.ai_match_hint?.summary || '',
    permitted_fields: fields,
  };
  if (fields.includes('owner_of_record')) out.owner_of_record = ownership.owner_of_record || '';
  if (fields.includes('ownership_type')) out.ownership_type = ownership.ownership_type || '';
  if (fields.includes('owner_mailing_address')) out.owner_mailing_address = ownership.owner_mailing_address || '';
  if (fields.includes('parcel_id')) out.parcel_id = ownership.parcel_id || '';
  if (fields.includes('characteristics')) out.characteristics = ownership.characteristics || {};
  return out;
}

export async function audit(base44, event) {
  const payload = {
    agent_user_id: event.agent_user_id,
    actor_user_id: event.actor_user_id || event.agent_user_id,
    actor_name: event.actor_name || '',
    actor_role: event.actor_role || 'agent',
    event_type: event.event_type,
    import_id: event.import_id || '',
    opportunity_id: event.opportunity_id || '',
    property_id: event.property_id || '',
    details: event.details || {},
    at: new Date().toISOString(),
  };
  try {
    await base44.asServiceRole.entities.AgentListingAuditEvent.create(payload);
  } catch (error) {
    // Audit failure must never break the business action, but it is logged.
    console.error('[agentListings] audit write failed:', JSON.stringify(payload).slice(0, 400), error?.message);
  }
}

export function json(data, status = 200) {
  return Response.json(data, { status });
}

export function agentActor(user) {
  return {
    actor_user_id: user.id,
    actor_name: user.full_name || user.email || '',
    actor_role: isAdmin(user) ? 'admin' : 'agent',
  };
}