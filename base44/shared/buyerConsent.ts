// ── CHAPTER 18 P1 — DETERMINISTIC, EXPLICIT-ONLY MARKETING CONSENT TRUTH ────
//
// DOCTRINE (P1-1..P1-5):
//   UNKNOWN / ABSENT CONSENT = NOT ELIGIBLE FOR MARKETING.
//   Explicit affirmative permission is required. Nothing is inferred from
//   account creation, RSVP, VIP signup, attendance, inquiry, Offer, purchase,
//   seller relationship, or professional relationship.
//   EMAIL CONSENT NEVER AUTHORIZES SMS; SMS CONSENT NEVER AUTHORIZES EMAIL.
//   Opt-out / suppression ALWAYS wins (a merge or conflict must never make
//   permission more permissive).
//   No legacy record is mass-converted — unknown stays unknown, honestly.
//
// AFFIRMATIVE sources are ONLY records whose flags default to FALSE and are
// set by an explicit human action (ConsumerMarketingProfile opt-in flags from
// buyer signups, NotificationPreference marketing toggles set in the user's
// own preferences). Schema-defaulted opt-in booleans (e.g. EmailPreferences
// flags that default true) are treated as OPT-OUT signals only — a `false`
// there is an explicit withdrawal, a `true` there is NOT proof of consent.

export const SUPPRESSED_STATUSES = ['unsubscribed_all', 'complained', 'suppressed', 'bounced'];

export const normEmail = (v) => String(v || '').trim().toLowerCase();

// P1-36 — controlled discovery-source vocabulary (explicit attendee response
// only; UNKNOWN is valid and never substituted).
export const MARKETING_SOURCE_VALUES = [
  'estate_sale_listing_site', 'email', 'sms', 'facebook', 'instagram',
  'other_social', 'sign', 'qr', 'referral', 'walk_by', 'other', 'unknown'
];

const pageOf = (p) => (p && p.items) || (Array.isArray(p) ? p : []);

// Load every consent record that exists for one person (by user id and/or
// normalized email). Records the caller cannot see are simply absent —
// eligibility only ever relies on what can be proven.
export async function loadPersonConsent(base44, { userId, email }) {
  const service = base44.asServiceRole;
  const profileJobs = [];
  if (userId) profileJobs.push(
    service.entities.ConsumerMarketingProfile.filter({ user_id: userId }, { limit: 5 }).catch(() => null));
  if (email) profileJobs.push(
    service.entities.ConsumerMarketingProfile.filter({ email: normEmail(email) }, { limit: 5 }).catch(() => null));
  const [p1, p2, userPage, emailPrefPage, notifPrefPage] = await Promise.all([
    ...profileJobs,
    userId ? service.entities.User.filter({ id: userId }).catch(() => null) : Promise.resolve(null),
    userId ? service.entities.EmailPreferences.filter({ user_id: userId }).catch(() => null) : Promise.resolve(null),
    userId ? service.entities.NotificationPreference.filter({ user_id: userId }).catch(() => null) : Promise.resolve(null),
  ]);

  const profiles = [];
  const seen = new Set();
  for (const page of [p1, p2]) {
    for (const r of pageOf(page)) {
      if (!seen.has(r.id)) { seen.add(r.id); profiles.push(r); }
    }
  }
  const user = userPage && pageOf(userPage)[0];
  const resolvedEmail = normEmail(email || (user && user.email));
  if (!emailPrefPage && resolvedEmail) {
    // opt-out records are keyed by user id; without one there is none to read
  }
  return {
    profiles,
    emailPref: emailPrefPage ? (pageOf(emailPrefPage)[0] || null) : null,
    notifPref: notifPrefPage ? (pageOf(notifPrefPage)[0] || null) : null,
  };
}

// EMAIL eligibility. kind: 'marketing' (general marketing) | 'local_sales'
// (sale/alert marketing). Returns { eligible, source, at } — provenance is
// reported only when actually recorded; unknown stays null (P1-3).
export function emailConsentFromRecords({ profiles = [], emailPref = null, notifPref = null }, kind = 'marketing') {
  const profs = profiles || [];
  for (const p of profs) {
    if (SUPPRESSED_STATUSES.includes(p.suppression_status)) {
      return { eligible: false, source: 'suppressed', at: null };
    }
  }
  if (notifPref && notifPref.marketing_email === false) {
    return { eligible: false, source: 'notification preference opt-out', at: null };
  }
  if (emailPref) {
    const flag = kind === 'local_sales' ? emailPref.local_sale_notifications : emailPref.estate_salen_marketing;
    if (flag === false) return { eligible: false, source: 'email preference opt-out', at: null };
  }
  // AFFIRMATIVE — explicit, default-false opt-in records only.
  for (const p of profs) {
    if (p.global_marketing_opt_in === true) {
      return { eligible: true, source: p.email_consent_source || 'buyer profile opt-in', at: p.email_consent_at || p.updated_at || null };
    }
    if (kind === 'local_sales' && p.estate_sale_alerts_opt_in === true) {
      return { eligible: true, source: p.email_consent_source || 'sale alerts opt-in', at: p.email_consent_at || p.updated_at || null };
    }
  }
  if (notifPref && notifPref.marketing_email === true) {
    return { eligible: true, source: 'app notification preferences', at: notifPref.updated_date || null };
  }
  return { eligible: false, source: null, at: null }; // UNKNOWN — not eligible
}

// SMS eligibility — evaluated COMPLETELY separately from email.
export function smsConsentFromRecords({ profiles = [], notifPref = null }) {
  const profs = profiles || [];
  for (const p of profs) {
    if (p.suppression_status === 'unsubscribed_all') {
      return { eligible: false, source: 'suppressed (all channels)', at: null };
    }
  }
  if (notifPref && notifPref.marketing_sms === false) {
    return { eligible: false, source: 'notification preference opt-out', at: null };
  }
  for (const p of profs) {
    if (p.sms_marketing_opt_in === true) {
      return { eligible: true, source: p.sms_consent_source || 'buyer profile SMS opt-in', at: p.sms_consent_at || p.updated_at || null };
    }
  }
  if (notifPref && notifPref.marketing_sms === true) {
    return { eligible: true, source: 'app notification preferences', at: notifPref.updated_date || null };
  }
  return { eligible: false, source: null, at: null }; // UNKNOWN — not eligible
}