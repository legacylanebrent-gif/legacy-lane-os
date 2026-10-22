// Internal dependency-injected engine. Only server-owned adapters supply dependencies.
// No entity-create uniqueness is implied by sequential lookups. See repair report.
const clean = (v) => String(v || '').trim();
export function validateConsent(config, input) {
  if (!config.rollout_enabled) return;
  if (!clean(config.text)) throw Object.assign(new Error('consent_text_unconfigured'), { status: 503 });
  if (!clean(input.submission_id)) throw Object.assign(new Error('submission_id_required'), { status: 400 });
  if (input.consent_accepted !== true) throw Object.assign(new Error('consent_acceptance_required'), { status: 400 });
  if (input.consent_text_version !== config.text_version) throw Object.assign(new Error('consent_version_mismatch'), { status: 400 });
}
export async function sellerIdentity(input) {
  // Exact identity of all seller-supplied information plus server-derived scope.
  // Stored on private consent only; never returned in public responses or logs.
  const canonical = JSON.stringify([input.operator_id, input.referrer_id, ...[
    'first_name', 'last_name', 'email', 'phone', 'state', 'city', 'county', 'zip_code', 'need_notes',
  ].map((k) => k === 'email' ? clean(input[k]).toLowerCase() :
    k === 'state' ? clean(input[k]).toUpperCase() : clean(input[k]))]);
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical));
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('');
}
export async function runConsentIntake(input, deps) {
  const { config, storage, forward, clock } = deps;
  validateConsent(config, input); // Before ANY storage or forwarding.
  const identity = await sellerIdentity(input);
  let lead = input.submission_id ? await storage.findLead(input.submission_id) : null;
  const intakeReused = !!lead;
  if (lead && lead.partner_submission_identity !== identity) {
    throw Object.assign(new Error('submission_id_conflict'), { status: 409 });
  }
  let consent = config.rollout_enabled ? await storage.findConsent(input.submission_id) : null;
  if (consent && consent.submission_identity !== identity) {
    throw Object.assign(new Error('submission_id_conflict'), { status: 409 });
  }
  if (consent?.status === 'withdrawn') throw Object.assign(new Error('consent_withdrawn'), { status: 409 });
  if (!lead) lead = await storage.createLead({ ...input, partner_submission_identity: identity });
  if (config.rollout_enabled && !consent) {
    // A failed create never reaches forwarding; the lead remains reusable.
    consent = await storage.createConsent({
      consent_id: deps.newId(), source_type: 'partner_referred_inquiry', source_id: lead.id,
      submission_id: input.submission_id, submission_identity: identity,
      operator_id: input.operator_id, intended_recipient_ids: [input.operator_id],
      contact_purpose: 'introduction_only', consent_text_version: config.text_version,
      consent_text_snapshot: config.text, submitted_at: clock(), status: 'granted',
      attribution_source: 'partner_referral_link', processing_lock: false, processing_version: 0,
      intake_tracking: { submission_id: input.submission_id, consent_status: 'granted',
        intake_status: 'completed', lead_id: lead.id, forwarding_status: 'pending', forwarding_attempts: 0 },
    });
  }
  if (consent?.intake_tracking?.forwarding_status === 'completed') {
    return { ok: true, created: false, replayed: true, consent_recorded: true, intake_reused: true, stage: 'completed' };
  }
  // CAS on an EXISTING consent serializes forwarding retries, not first creates.
  if (consent && !await storage.claim(consent)) {
    return { ok: false, error: 'submission_in_progress', retryable: true, consent_recorded: true, stage: 'forwarding' };
  }
  let result;
  try {
    result = await forward(lead, input);
    if (!result?.ok) throw new Error('forwarding_failed');
  } catch {
    if (consent) await storage.finish(consent, { forwarding_status: 'retry_required',
      last_attempt_at: clock(), last_error: 'forwarding_failed' });
    return { ok: false, error: 'forwarding_failed', retryable: true,
      consent_recorded: !!consent, stage: 'forwarding' };
  }
  if (consent) await storage.finish(consent, { forwarding_status: 'completed',
    last_attempt_at: clock(), last_error: null, deal_id: result.deal_id });
  return { ok: true, created: !!result.created, replayed: !!result.replayed,
    consent_recorded: !!consent, intake_reused: intakeReused, stage: 'completed' };
}