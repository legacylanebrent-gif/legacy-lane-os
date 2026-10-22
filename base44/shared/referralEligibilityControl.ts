// Referral Rebuild — Phase 2B shared INDIVIDUAL eligibility control.
//
// THE ONE status machine, material-change detector, immutable-history helper,
// and SERVER-SIDE effective-eligibility computation for
// ReferralEligibilityProfile. Server functions are the ONLY writers of
// status, verified state, and history — clients can never mint any of it.
//
// Doctrine:
//   - Self-submitted information is a CLAIM, never verified truth.
//   - Only authorized admins verify; identity and timestamps are
//     SERVER-DERIVED. Operators can never approve themselves.
//   - Eligibility status is SEPARATE from the global
//     LEGACY_REFERRAL_COMPENSATION_ENABLED control: a verified profile
//     NEVER activates payments by itself.
//   - NO RETROACTIVITY: eligibility starts at verification, never earlier —
//     no old seller introduction becomes payable by a later approval.
//   - Effective eligibility is COMPUTED AT THE TIME OF USE from the record
//     (status, effective window, license expiration, license status,
//     jurisdiction approval) — never from a scheduled job or a stale UI
//     status. Unknown/unsupported jurisdiction stays ineligible.
//   - A company NEVER becomes licensed because one associated person is;
//     joining a team establishes NO licensure or eligibility.

export const ELIGIBILITY_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  UNDER_REVIEW: 'under_review',
  CORRECTIONS_REQUIRED: 'corrections_required',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
  SUSPENDED: 'suspended',
  REVERIFICATION_REQUIRED: 'reverification_required',
};

// Applicant-settable fields — the ONLY keys ever read from client input.
export const SELF_FIELDS = [
  'legal_name', 'license_number', 'license_state', 'license_type',
  'license_expiration', 'brokerage_name', 'brokerage_state',
  'affiliation_attested', 'evidence_file_uris', 'notes',
];

// Fields whose change on a VERIFIED profile is MATERIAL and therefore
// requires re-verification. The prior verified block is preserved, never
// overwritten.
export const MATERIAL_FIELDS = [
  'legal_name', 'license_number', 'license_state', 'license_type',
  'license_expiration', 'brokerage_name', 'brokerage_state',
];

// Required for a complete application.
export const REQUIRED_SUBMISSION_FIELDS = [
  'legal_name', 'license_number', 'license_state', 'license_type',
  'brokerage_name',
];

// Pick ONLY applicant-settable fields from arbitrary client input.
// status, verified, eligibility_history, reviewer identity, timestamps,
// jurisdictions, agreement state, eligibility dates, and compensation
// activation are NEVER read from the payload — attempts to set them are
// silently impossible because this is the only intake path.
export function sanitizeSelfSubmission(patch) {
  const src = patch || {};
  const out = {};
  let any = false;
  for (const key of SELF_FIELDS) {
    if (src[key] !== undefined) {
      any = true;
      if (key === 'affiliation_attested') {
        out[key] = src[key] === true;
      } else if (key === 'evidence_file_uris') {
        out[key] = (Array.isArray(src[key]) ? src[key] : [])
          .map((v) => String(v || '').trim()).filter(Boolean).slice(0, 10);
      } else {
        out[key] = String(src[key] == null ? '' : src[key]).trim() || null;
      }
    }
  }
  if (out.license_state) out.license_state = out.license_state.toUpperCase().slice(0, 2);
  if (out.brokerage_state) out.brokerage_state = out.brokerage_state.toUpperCase().slice(0, 2);
  return any ? out : null;
}

export function validateSubmission(self) {
  const missing = [];
  for (const key of REQUIRED_SUBMISSION_FIELDS) {
    if (!self[key]) missing.push(key);
  }
  if (self.affiliation_attested !== true) missing.push('affiliation_attested');
  if (!(self.evidence_file_uris || []).length) missing.push('evidence_file_uris');
  return { ok: missing.length === 0, missing };
}

export function isMaterialChange(previousSelf, nextSelf) {
  const a = previousSelf || {};
  const b = nextSelf || {};
  return MATERIAL_FIELDS.some((k) => (a[k] || null) !== (b[k] || null));
}

// True when the CURRENT self-submitted block still matches the snapshot
// that was verified (no material drift since verification).
export function matchesVerifiedSnapshot(profile) {
  const snap = (profile.verified || {}).verified_snapshot || {};
  if (!Object.keys(snap).length) return false;
  return !isMaterialChange(snap, profile.self_submitted || {});
}

// History entries are ONLY appended by server functions — this helper never
// rewrites or removes prior entries.
export function appendHistoryEntry(profile, entry) {
  return [...(profile.eligibility_history || []), { ...entry }];
}

// Compute EFFECTIVE eligibility at the time of use. `jurisdiction` (optional
// uppercase 2-letter state) is checked against approved_jurisdictions.
// Returns { eligible, reasons: [{ code, detail }] } — deterministic,
// explainable, and never a payment authorization.
export function computeEffectiveEligibility(profile, jurisdiction, nowIso) {
  const reasons = [];
  if (!profile || profile.status !== ELIGIBILITY_STATUS.VERIFIED ||
      !profile.verified || !profile.verified.verified_at) {
    return {
      eligible: false,
      reasons: [{ code: 'not_verified', detail: profile ? profile.status : 'no_profile' }],
    };
  }
  const v = profile.verified;
  const nowMs = Date.parse(nowIso || new Date().toISOString());

  // TRUST ONLY SERVER-CONTROLLED DATA: expiration is read from the
  // SERVER-PINNED verified snapshot (written by the admin review seam),
  // never from the live applicant-editable self_submitted claim. If the
  // applicant block has drifted from the pinned snapshot at all, the
  // profile is not effectively eligible regardless of stored status
  // (defense in depth behind the material-change flag).
  const snap = v.verified_snapshot || {};
  if (Object.keys(snap).length && isMaterialChange(snap, profile.self_submitted || {})) {
    reasons.push({
      code: 'reverification_pending',
      detail: 'self-submitted information no longer matches the verified snapshot',
    });
  }
  const licExp = snap.license_expiration || (profile.self_submitted || {}).license_expiration;
  if (licExp && nowMs > Date.parse(`${licExp}T23:59:59Z`)) {
    reasons.push({ code: 'license_expired', detail: licExp });
  }
  if (v.license_status !== 'active') {
    reasons.push({ code: 'license_not_active', detail: v.license_status || 'unknown' });
  }
  // REQUIRED AFFILIATION + AGREEMENT CONDITIONS (server-written fields only):
  // a confirmed brokerage legal identity and at least one referenced
  // agreement must back the verification.
  if (!String(v.brokerage_legal_name || '').trim()) {
    reasons.push({
      code: 'brokerage_not_confirmed',
      detail: 'no confirmed brokerage legal identity on the verified block',
    });
  }
  if (!(v.agreement_references || []).length) {
    reasons.push({
      code: 'no_agreement_reference',
      detail: 'no referenced agreement applicable to this verification',
    });
  }
  if (!(v.approved_jurisdictions || []).length) {
    reasons.push({ code: 'no_approved_jurisdiction', detail: 'none recorded' });
  }
  if (jurisdiction) {
    const j = String(jurisdiction).trim().toUpperCase();
    if (!(v.approved_jurisdictions || []).includes(j)) {
      reasons.push({ code: 'jurisdiction_not_approved', detail: j });
    }
  }
  return { eligible: reasons.length === 0, reasons };
}