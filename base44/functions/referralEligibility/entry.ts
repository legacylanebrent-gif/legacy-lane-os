// Referral Rebuild — Phase 2B operator eligibility portal.
//
// The ONE seam an operator uses to submit and correct their OWN license and
// brokerage application information. Server-enforced transitions:
//   - identity is derived from the AUTHENTICATED session;
//   - ONLY applicant-settable fields are read from the payload (sanitize);
//   - status, verified state, reviewer identity, verification timestamps,
//     approved jurisdictions, agreement state, eligibility dates, and
//     compensation activation are NEVER client-settable;
//   - a material change to a verified profile's license/brokerage fields
//     flags reverification_required server-side (prior verification
//     preserved in history);
//   - a suspended profile cannot be resubmitted by its owner.
//
// A verified profile NEVER activates compensation: the global
// LEGACY_REFERRAL_COMPENSATION_ENABLED control stays disabled independently.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { LEGACY_REFERRAL_COMPENSATION_ENABLED } from '../../shared/referralCompensationControl.ts';
import {
  ELIGIBILITY_STATUS,
  sanitizeSelfSubmission,
  validateSubmission,
  isMaterialChange,
  computeEffectiveEligibility,
  appendHistoryEntry,
} from '../../shared/referralEligibilityControl.ts';

async function resolveCompanyId(service, userId) {
  try {
    const byPrimary = await service.entities.Company.filter(
      { primary_contact_user_id: userId });
    const primary = (byPrimary.items || byPrimary || [])[0];
    if (primary) return primary.id;
    const byMember = await service.entities.Company.filter(
      { member_user_ids: userId });
    const member = (byMember.items || byMember || [])[0];
    return member ? member.id : null;
  } catch {
    return null;
  }
}

async function findOwnProfile(service, user) {
  const page = await service.entities.ReferralEligibilityProfile.filter(
    { user_id: user.id });
  const existing = (page.items || page || [])[0];
  if (existing) return existing;
  // Draft shell — created only through this authenticated seam, anchored to
  // the session identity. Company linkage is CONTEXT ONLY (never licensure).
  const companyId = await resolveCompanyId(service, user.id);
  return service.entities.ReferralEligibilityProfile.create({
    user_id: user.id,
    company_id: companyId,
    status: ELIGIBILITY_STATUS.DRAFT,
    self_submitted: {},
    eligibility_history: [],
    last_activity_at: new Date().toISOString(),
  });
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }

    let body: any = {};
    try { body = await req.json(); } catch { body = {}; }
    const action = String(body.action || 'get');
    const service = base44.asServiceRole;
    const now = new Date().toISOString();
    const byName = user.full_name || user.email || 'Applicant';

    if (action === 'get') {
      const profile = await findOwnProfile(service, user);
      if (!profile.company_id) {
        const companyId = await resolveCompanyId(service, user.id);
        if (companyId) {
          await service.entities.ReferralEligibilityProfile.update(
            profile.id, { company_id: companyId });
          profile.company_id = companyId;
        }
      }
      return Response.json({
        ok: true,
        profile,
        effective: computeEffectiveEligibility(profile, body.jurisdiction, now),
        compensation_enabled: LEGACY_REFERRAL_COMPENSATION_ENABLED,
      });
    }

    if (action === 'submit') {
      // ONLY applicant fields are read — everything else the caller sends
      // (status, verified, history, reviewer, dates, jurisdictions,
      // compensation flags) is structurally ignored by sanitizeSelfSubmission.
      const self = sanitizeSelfSubmission(body.self_submitted || {});
      if (!self) {
        return Response.json({ ok: false, error: 'nothing_to_submit' }, { status: 400 });
      }
      const check = validateSubmission(self);
      if (!check.ok) {
        return Response.json(
          { ok: false, error: 'incomplete_application', missing: check.missing },
          { status: 400 });
      }

      const profile = await findOwnProfile(service, user);
      if (profile.status === ELIGIBILITY_STATUS.SUSPENDED) {
        return Response.json({ ok: false, error: 'profile_suspended' }, { status: 403 });
      }

      const material = isMaterialChange(profile.self_submitted, self);
      const fromStatus = profile.status;
      let toStatus = fromStatus;
      let historyAction = null;

      if (material &&
          (fromStatus === ELIGIBILITY_STATUS.VERIFIED ||
           fromStatus === ELIGIBILITY_STATUS.REVERIFICATION_REQUIRED)) {
        // Material change to verified license/brokerage info: the prior
        // verified block is PRESERVED untouched; re-verification is
        // required before compensated activity can resume.
        toStatus = ELIGIBILITY_STATUS.REVERIFICATION_REQUIRED;
        historyAction = 'material_change_reverification';
      } else if ([
        ELIGIBILITY_STATUS.DRAFT,
        ELIGIBILITY_STATUS.REJECTED,
        ELIGIBILITY_STATUS.CORRECTIONS_REQUIRED,
      ].includes(fromStatus)) {
        toStatus = ELIGIBILITY_STATUS.SUBMITTED;
        historyAction = 'application_submitted';
      } else if (fromStatus === ELIGIBILITY_STATUS.SUBMITTED ||
                 fromStatus === ELIGIBILITY_STATUS.UNDER_REVIEW ||
                 fromStatus === ELIGIBILITY_STATUS.REVERIFICATION_REQUIRED) {
        // Applicant update with no material change: status unchanged,
        // no history spam.
        toStatus = fromStatus;
      }

      const history = historyAction
        ? appendHistoryEntry(profile, {
            at: now, by: user.id, by_name: byName,
            from_status: fromStatus, to_status: toStatus,
            action: historyAction, reason: null,
          })
        : (profile.eligibility_history || []);

      const updated = await service.entities.ReferralEligibilityProfile.update(
        profile.id, {
          self_submitted: {
            ...(profile.self_submitted || {}),
            ...self,
            submitted_at: now,
            updated_at: now,
          },
          status: toStatus,
          status_reason: toStatus === ELIGIBILITY_STATUS.REVERIFICATION_REQUIRED
            ? 'Material change to verified license/brokerage information — re-verification required.'
            : (toStatus === ELIGIBILITY_STATUS.SUBMITTED ? null : profile.status_reason),
          eligibility_history: history,
          last_activity_at: now,
        });

      return Response.json({
        ok: true,
        profile: updated,
        effective: computeEffectiveEligibility(updated, body.jurisdiction, now),
        compensation_enabled: LEGACY_REFERRAL_COMPENSATION_ENABLED,
        submission_is_not_approval: true,
      });
    }

    return Response.json({ ok: false, error: 'unknown_action' }, { status: 400 });
  } catch (error) {
    console.error('referralEligibility error:', (error as Error).message);
    return Response.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}