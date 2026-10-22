// Software-affiliate reward writer for RESELLER referrals.
//
// Referral Rebuild Phase 1: self-service invocation is REMOVED. The caller
// must be a platform admin; the qualifying event is verified against the
// STORED referral record (reseller account type + a recorded first payment
// that only an admin path writes); and the reward is created only through
// the ONE canonical path (UserReward action_id `referral_<id>`), which
// deduplicates across every reward writer — processReferralRewards,
// updateReferralStatus, and this function. A client-editable flag never
// creates a reward on its own. The old User.account_balance credit (a
// dangling field with no consumer) is removed.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json(
        {
          error:
            'Admin access required. Referral rewards are issued by platform staff after the qualifying first payment is verified.'
        },
        { status: 403 }
      );
    }

    const { referral_id } = await req.json();

    if (!referral_id) {
      return Response.json({ error: 'referral_id required' }, { status: 400 });
    }

    // Fetch the referral record with the service role (admin-verified context).
    const referrals = await base44.asServiceRole.entities.Referral.filter({ id: referral_id });
    if (referrals.length === 0) {
      return Response.json({ error: 'Referral not found' }, { status: 404 });
    }

    const referral = referrals[0];

    // Server-verified qualifying event: reseller account type AND a recorded
    // first payment date (written only by the admin status path).
    if (referral.account_type !== 'reseller' || !referral.first_payment_date) {
      return Response.json(
        { error: 'Referral not eligible — awaiting a verified first payment' },
        { status: 400 }
      );
    }

    // Canonical dedup: one reward per referral across ALL reward paths.
    const existingRewards = await base44.asServiceRole.entities.UserReward.filter({
      user_id: referral.referrer_id,
      action_id: `referral_${referral.id}`
    });

    if (existingRewards.length > 0) {
      await base44.asServiceRole.entities.Referral.update(referral.id, {
        reward_status: 'sent',
        reward_amount: referral.reward_amount || 25
      });
      return Response.json({ success: true, status: 'already_rewarded' });
    }

    const amount = referral.reward_amount || 25;

    await base44.asServiceRole.entities.UserReward.create({
      user_id: referral.referrer_id,
      action_id: `referral_${referral.id}`,
      action_name: 'Referral Reward',
      points_earned: amount,
      notes: `$${amount} software-affiliate reward for referring ${referral.referred_user_name ||
        referral.referred_user_email ||
        referral.referred_company_name ||
        'a new company'}`
    });

    await base44.asServiceRole.entities.Referral.update(referral.id, {
      reward_status: 'sent',
      reward_amount: amount
    });

    return Response.json({
      success: true,
      status: 'rewarded',
      reward_amount: amount
    });
  } catch (error) {
    console.error('[processResellerReferralReward] Error:', error?.message);
    return Response.json({ error: error?.message }, { status: 500 });
  }
});