// Referral Rebuild — Phase 2B ADMIN eligibility review.
//
// The ONLY seam that can write verified state. Admin-only (403 otherwise):
//   - reviewer identity and timestamps are SERVER-DERIVED from the
//     authenticated admin session;
//   - approval REQUIRES a complete application, evidence, a verification
//     source AND reference, and at least one approved jurisdiction;
//   - duplicate approval of an unchanged verified profile is a consistent
//     no-op (no history spam);
//   - eligibility_effective_start is SERVER-SET to the verification moment —
//     never client-supplied, never retroactive;
//   - reject / suspend / request_corrections require a factual reason;
//   - reinstate restores a suspended profile to verified ONLY if a prior
//     verification exists (server-side check, not an applicant claim);
//   - every transition APPENDS immutable history — prior verifications are
//     preserved, never overwritten;
//   - a verified profile NEVER activates compensation: the global
//     LEGACY_REFERRAL_COMPENSATION_ENABLED control stays disabled separately.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { eligibilityReply } from '../../shared/eligibilityContract.ts';
import { LEGACY_REFERRAL_COMPENSATION_ENABLED } from '../../shared/referralCompensationControl.ts';
import {
  ELIGIBILITY_STATUS,
  validateSubmission,
  matchesVerifiedSnapshot,
  computeEffectiveEligibility,
  appendHistoryEntry,
} from '../../shared/referralEligibilityControl.ts';

export default async function(req) {
  let operation = 'list';
  const reply = (data, init) => eligibilityReply(operation, data, init);
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return reply({ ok: false, error: 'unauthorized' }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return reply({ ok: false, error: 'admin_required' }, { status: 403 });
    }

    let body: any = {};
    try { body = await req.json(); } catch { body = {}; }
    const action = String(body.action || 'list');
    operation = action === 'review' ? `review.${String(body.review_action || '')}` : action;
    const service = base44.asServiceRole;
    const now = new Date().toISOString();
    const byName = user.full_name || user.email || 'Administrator';

    if (action === 'list') {
      const page = await service.entities.ReferralEligibilityProfile.filter({});
      const profiles = page.items || page || [];
      return reply({
        ok: true,
        profiles: profiles.map((p) => ({
          ...p,
          effective: computeEffectiveEligibility(p, null, now),
        })),
        compensation_enabled: LEGACY_REFERRAL_COMPENSATION_ENABLED,
      });
    }

    if (action === 'get') {
      const userId = String(body.user_id || '').trim();
      if (!userId) {
        return reply({ ok: false, error: 'user_id_required' }, { status: 400 });
      }
      const page = await service.entities.ReferralEligibilityProfile.filter(
        { user_id: userId });
      const profile = (page.items || page || [])[0];
      if (!profile) {
        return reply({ ok: false, error: 'profile_not_found' }, { status: 404 });
      }
      return reply({
        ok: true,
        profile: { ...profile, effective: computeEffectiveEligibility(profile, null, now) },
        compensation_enabled: LEGACY_REFERRAL_COMPENSATION_ENABLED,
      });
    }

    if (action === 'review') {
      const userId = String(body.user_id || '').trim();
      const reviewAction = String(body.review_action || '').trim();
      const reason = String(body.reason || '').trim();
      if (!userId || !reviewAction) {
        return reply(
          { ok: false, error: 'user_id_and_review_action_required' }, { status: 400 });
      }

      const page = await service.entities.ReferralEligibilityProfile.filter(
        { user_id: userId });
      const profile = (page.items || page || [])[0];
      if (!profile) {
        return reply({ ok: false, error: 'profile_not_found' }, { status: 404 });
      }

      const fromStatus = profile.status;
      const transition = (toStatus, historyAction, historyReason, patch = {}) => {
        return {
          status: toStatus,
          status_reason: historyReason || null,
          eligibility_history: appendHistoryEntry(profile, {
            at: now, by: user.id, by_name: byName,
            from_status: fromStatus, to_status: toStatus,
            action: historyAction, reason: historyReason || null,
          }),
          last_activity_at: now,
          ...patch,
        };
      };

      if (reviewAction === 'approve') {
        // Evidence + required fields BEFORE verification — fail closed.
        const check = validateSubmission(profile.self_submitted || {});
        if (!check.ok) {
          return reply(
            { ok: false, error: 'application_incomplete', missing: check.missing },
            { status: 400 });
        }
        if (((profile.self_submitted || {}).evidence_file_uris || []).length === 0) {
          return reply({ ok: false, error: 'evidence_required' }, { status: 400 });
        }
        const ver = body.verification || {};
        const source = String(ver.verification_source || '').trim();
        const reference = String(ver.verification_reference || '').trim();
        const jurisdictions = (Array.isArray(ver.approved_jurisdictions)
          ? ver.approved_jurisdictions : [])
          .map((j) => String(j || '').trim().toUpperCase()).filter(Boolean);
        const licenseStatus = String(ver.license_status || '').trim();
        if (!source || !reference) {
          return reply(
            { ok: false, error: 'verification_source_and_reference_required' },
            { status: 400 });
        }
        if (!jurisdictions.length) {
          return reply(
            { ok: false, error: 'approved_jurisdiction_required' }, { status: 400 });
        }
        if (!['active', 'inactive', 'unknown'].includes(licenseStatus)) {
          return reply(
            { ok: false, error: 'license_status_required' }, { status: 400 });
        }

        // Duplicate approval handled consistently: an unchanged verified
        // profile is a no-op (no history duplicate).
        if (fromStatus === ELIGIBILITY_STATUS.VERIFIED &&
            matchesVerifiedSnapshot(profile)) {
          return reply({
            ok: true, already_verified: true, profile,
            compensation_enabled: LEGACY_REFERRAL_COMPENSATION_ENABLED,
          });
        }

        const verifiedBlock = {
          verification_source: source,
          verification_reference: reference,
          reviewer_user_id: user.id,
          reviewer_name: byName,
          verified_at: now,
          license_status: licenseStatus,
          brokerage_legal_name:
            String(ver.brokerage_legal_name || '').trim() || null,
          approved_jurisdictions: jurisdictions,
          agreement_references: (Array.isArray(ver.agreement_references)
            ? ver.agreement_references : [])
            .map((a) => String(a || '').trim()).filter(Boolean),
          // SERVER-set effective start — never client-supplied, never
          // retroactive: no old introduction becomes payable by approval.
          eligibility_effective_start: now,
          eligibility_effective_end:
            ver.eligibility_effective_end || null,
          verified_snapshot: { ...(profile.self_submitted || {}) },
        };

        const updated = await service.entities.ReferralEligibilityProfile.update(
          profile.id, transition(
            ELIGIBILITY_STATUS.VERIFIED, 'verified',
            String(ver.note || '').trim() || null,
            { verified: verifiedBlock, status_reason: null }));

        return reply({
          ok: true,
          profile: {
            ...updated,
            effective: computeEffectiveEligibility(updated, null, now),
          },
          compensation_enabled: LEGACY_REFERRAL_COMPENSATION_ENABLED,
        });
      }

      if (reviewAction === 'reject' || reviewAction === 'suspend' ||
          reviewAction === 'request_corrections') {
        if (!reason) {
          return reply(
            { ok: false, error: 'reason_required' }, { status: 400 });
        }
        const toStatus = reviewAction === 'reject'
          ? ELIGIBILITY_STATUS.REJECTED
          : reviewAction === 'suspend'
            ? ELIGIBILITY_STATUS.SUSPENDED
            : ELIGIBILITY_STATUS.CORRECTIONS_REQUIRED;
        const historyAction = reviewAction === 'reject' ? 'rejected'
          : reviewAction === 'suspend' ? 'suspended' : 'corrections_requested';
        const updated = await service.entities.ReferralEligibilityProfile.update(
          profile.id, transition(toStatus, historyAction, reason));
        return reply({
          ok: true,
          profile: {
            ...updated,
            effective: computeEffectiveEligibility(updated, null, now),
          },
          compensation_enabled: LEGACY_REFERRAL_COMPENSATION_ENABLED,
        });
      }

      if (reviewAction === 'reinstate') {
        // Only a PRIOR server-written verification can be reinstated —
        // never an applicant claim.
        if (fromStatus !== ELIGIBILITY_STATUS.SUSPENDED) {
          return reply(
            { ok: false, error: 'profile_not_suspended' }, { status: 400 });
        }
        if (!profile.verified || !profile.verified.verified_at) {
          return reply(
            { ok: false, error: 'no_prior_verification_to_reinstate' }, { status: 400 });
        }
        const updated = await service.entities.ReferralEligibilityProfile.update(
          profile.id, transition(
            ELIGIBILITY_STATUS.VERIFIED, 'reinstated', reason || null));
        return reply({
          ok: true,
          profile: {
            ...updated,
            effective: computeEffectiveEligibility(updated, null, now),
          },
          compensation_enabled: LEGACY_REFERRAL_COMPENSATION_ENABLED,
        });
      }

      return reply(
        { ok: false, error: 'unknown_review_action' }, { status: 400 });
    }

    return reply({ ok: false, error: 'unknown_action' }, { status: 400 });
  } catch (error) {
    console.error('referralEligibilityAdmin error:', (error as Error).message);
    return reply({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}