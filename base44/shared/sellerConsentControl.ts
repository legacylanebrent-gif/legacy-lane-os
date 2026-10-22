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

// Recording and retry orchestration live in consentIntakeEngine.ts. Its
// production adapter alone supplies this pinned configuration. No environment
// switch, request-body configuration or public testing endpoint exists.