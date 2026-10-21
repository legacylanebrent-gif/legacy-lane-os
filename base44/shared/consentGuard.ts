// ── CHAPTER 18 P1 — MARKETING CONSENT GUARD (EXPLICIT-ONLY) ─────────────────
//
// DOCTRINE: UNKNOWN / ABSENT CONSENT = NOT ELIGIBLE FOR MARKETING.
// Affirmative permission must exist in an explicit, default-false consent
// record (ConsumerMarketingProfile opt-in flags, NotificationPreference
// marketing toggles). Opt-out / suppression always wins. Lookup failure fails
// CLOSED: a marketing send happens only when consent can be PROVEN.
//
// Operator service notices (a digest to the operator about their own account,
// an operational notice about their own sale) are NOT consumer marketing;
// those use isOperatorNoticeEmailAllowed below (opt-out only).

import { emailConsentFromRecords, loadPersonConsent } from './buyerConsent.ts';

export async function isMarketingEmailAllowed(base44, userId, kind = 'marketing') {
  try {
    if (!userId) return false;
    const truth = await loadPersonConsent(base44, { userId });
    return emailConsentFromRecords(truth, kind).eligible;
  } catch (e) {
    console.error('consentGuard error:', e);
    return false; // fail CLOSED for marketing
  }
}

// Operator-facing service notices: sent unless the operator explicitly turned
// the preference off or Customer.io flagged suppression. Not marketing.
export async function isOperatorNoticeEmailAllowed(base44, userId) {
  try {
    if (!userId) return false;
    const truth = await loadPersonConsent(base44, { userId });
    for (const p of truth.profiles) {
      if (['unsubscribed_all', 'complained', 'suppressed', 'bounced'].includes(p.suppression_status)) return false;
    }
    if (truth.notifPref && truth.notifPref.system_email === false) return false;
    if (truth.emailPref && truth.emailPref.estate_salen_marketing === false) return false;
    return true;
  } catch (e) {
    console.error('consentGuard (operator notice) error:', e);
    return true; // transient lookup failure must not block operational notices
  }
}