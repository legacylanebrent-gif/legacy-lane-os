// Referral Rebuild — Phase 2A/2B shared seller-consent control.
//
// THE ONE versioned mechanism for recording a seller's permission to be
// contacted for an INTRODUCTION (Referral Phase 2 design Part 2A).
//
// Doctrine:
//   - The final consent WORDING is an unresolved broker/legal decision. Until
//     approved wording exists, the rollout is DISABLED: intake seams keep
//     running EXACTLY as today (the unpaid seller-introduction flow is
//     untouched) and NO consent records are written. Absence of a record =
//     NOT RECORDED — historical submissions are never backfilled.
//   - Enabling requires BOTH flipping the flag AND supplying broker/legal-
//     approved text + a bumped version. A configured flag with empty text
//     FAILS CLOSED (no record is ever written from a blank consent text).
//   - When ENABLED, the seller must AFFIRMATIVELY ACCEPT the exact versioned
//     text: the submission carries consent_accepted=true and the version the
//     seller SAW; a version mismatch is rejected (stale display), and
//     acceptance is NEVER inferred from a timestamp, a referral token, or
//     mere form submission.
//   - The SERVER generates the timestamp and pins the version; the exact
//     displayed text is snapshotted verbatim. A client never supplies any of
//     these.
//   - Consent is stored BEFORE any forwarding to recipients; a consent-
//     storage failure prevents forwarding (enforced by the intake seam).
//   - Phase 2B: a STABLE SUBMISSION ID (client-generated uuid, reused across
//     retries) is the idempotency anchor — a retried submission reuses the
//     same consent and inquiry, and only re-attempts what failed. Intake and
//     forwarding states are tracked EXPLICITLY on the consent record.
//   - Optional marketing consent is a SEPARATE block (never granted by
//     inquiry capture; withdrawal of one never affects the other).
//   - This is a consent record only: NOT verified licensing, NOT broker
//     approval, NOT an executed brokerage referral agreement, and it creates
//     NO compensation entitlement of any kind.

export const SELLER_CONSENT_ROLLOUT_ENABLED = false;

// Bump this version whenever the displayed text changes. A stored consent
// never silently covers different wording.
export const SELLER_CONSENT_TEXT_VERSION = 'SC-DRAFT-V0';

// PLACEHOLDER — must be replaced with broker/legal-APPROVED wording before
// the rollout flag may be enabled. Empty by design; the recorder fails
// closed while it is empty.
export const SELLER_CONSENT_TEXT = '';

// Effective public configuration — fail-closed: the rollout counts as
// enabled ONLY when the flag is set AND approved non-empty text exists.
// Draft/empty text is never shown to sellers.
export function getSellerConsentConfig() {
  const enabled = SELLER_CONSENT_ROLLOUT_ENABLED &&
    !!String(SELLER_CONSENT_TEXT || '').trim();
  return {
    rollout_enabled: enabled,
    text_version: SELLER_CONSENT_TEXT_VERSION,
    text: enabled ? SELLER_CONSENT_TEXT : '',
  };
}

// Record consent for one inquiry submission. Idempotent per STABLE
// SUBMISSION ID first, then per source record. `service` is the
// service-role client. NEVER trust client input for timestamps, versions,
// text, or acceptance.
export async function recordSellerConsent(service, input) {
  if (!SELLER_CONSENT_ROLLOUT_ENABLED) {
    return { recorded: false, reason: 'consent_rollout_disabled' };
  }
  if (!String(SELLER_CONSENT_TEXT || '').trim()) {
    // Fail closed: the flag must never be enabled without approved text.
    throw new Error('consent_text_unconfigured');
  }
  if (!input || !input.source_type || !input.source_id || !input.operator_id) {
    throw new Error('consent_source_unresolved');
  }
  // AFFIRMATIVE ACCEPTANCE of the EXACT displayed version — never inferred.
  if (input.consent_accepted !== true) {
    throw new Error('consent_not_accepted');
  }
  if (String(input.consent_text_version || '') !== SELLER_CONSENT_TEXT_VERSION) {
    // The seller accepted a different (stale) version than the current one.
    throw new Error('consent_version_mismatch');
  }
  // Stable submission id is the retry/idempotency anchor when enabled.
  if (!input.submission_id) {
    throw new Error('submission_id_required');
  }

  // One consent per submission — a retried submission never duplicates.
  const bySubmission = await service.entities.SellerConsent.filter(
    { submission_id: input.submission_id });
  const existingSubmission = (bySubmission.items || bySubmission || [])[0];
  if (existingSubmission) {
    return {
      recorded: true, duplicate: true,
      consent_id: existingSubmission.consent_id, id: existingSubmission.id,
    };
  }
  const bySource = await service.entities.SellerConsent.filter({
    source_type: input.source_type,
    source_id: input.source_id,
  });
  const existingSource = (bySource.items || bySource || [])[0];
  if (existingSource) {
    return {
      recorded: true, duplicate: true,
      consent_id: existingSource.consent_id, id: existingSource.id,
    };
  }

  const now = new Date().toISOString();
  const created = await service.entities.SellerConsent.create({
    consent_id: `SC-${Date.now()}-${Math.random().toString(16).slice(2, 8).toUpperCase()}`,
    source_type: input.source_type,
    source_id: input.source_id,
    submission_id: input.submission_id,
    operator_id: input.operator_id,
    intended_recipient_ids: (input.intended_recipient_ids || []).filter(Boolean),
    contact_purpose: 'introduction_only',
    consent_text_version: SELLER_CONSENT_TEXT_VERSION,
    consent_text_snapshot: SELLER_CONSENT_TEXT,
    submitted_at: now,
    attribution_source: input.attribution_source || null,
    status: 'granted',
    intake_tracking: {
      submission_id: input.submission_id,
      consent_status: 'granted',
      intake_status: 'completed',
      lead_id: input.source_id,
      forwarding_status: 'pending',
      forwarding_attempts: 0,
      last_attempt_at: now,
      last_error: null,
    },
  });

  return { recorded: true, duplicate: false, consent_id: created.consent_id, id: created.id };
}

// Explicit, recoverable intake/forwarding state transitions on the consent
// record — the intake seam (never the client) writes these. Prior states
// are replaced by the CURRENT state (the append-only truth of WHO was told
// WHAT lives in downstream_notifications; this block is the live state).
export async function updateConsentIntakeState(service, consentRecordId, patch) {
  if (!consentRecordId) return null;
  const record = await service.entities.SellerConsent.get(consentRecordId);
  if (!record) return null;
  const current = record.intake_tracking || {};
  const next = {
    ...current,
    ...patch,
    forwarding_attempts: (current.forwarding_attempts || 0) + 1,
    last_attempt_at: new Date().toISOString(),
  };
  return service.entities.SellerConsent.update(record.id, { intake_tracking: next });
}