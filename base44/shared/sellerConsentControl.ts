// Referral Rebuild — Phase 2A shared seller-consent control.
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
//   - The SERVER generates the timestamp and pins the version; the exact
//     displayed text is snapshotted verbatim. A client never supplies any of
//     these.
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

// Record consent for one inquiry submission. Idempotent per source record.
// `service` is the service-role client. NEVER trust client input for
// timestamps, versions, or text.
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

  // One consent record per source inquiry — a retried submission never
  // duplicates.
  const existing = await service.entities.SellerConsent.filter({
    source_type: input.source_type,
    source_id: input.source_id,
  });
  if ((existing.items || existing || []).length > 0) {
    const rec = (existing.items || existing)[0];
    return { recorded: true, duplicate: true, consent_id: rec.consent_id, id: rec.id };
  }

  const now = new Date().toISOString();
  const created = await service.entities.SellerConsent.create({
    consent_id: `SC-${Date.now()}-${Math.random().toString(16).slice(2, 8).toUpperCase()}`,
    source_type: input.source_type,
    source_id: input.source_id,
    operator_id: input.operator_id,
    intended_recipient_ids: (input.intended_recipient_ids || []).filter(Boolean),
    contact_purpose: 'introduction_only',
    consent_text_version: SELLER_CONSENT_TEXT_VERSION,
    consent_text_snapshot: SELLER_CONSENT_TEXT,
    submitted_at: now,
    attribution_source: input.attribution_source || null,
    status: 'granted',
  });

  return { recorded: true, duplicate: false, consent_id: created.consent_id, id: created.id };
}