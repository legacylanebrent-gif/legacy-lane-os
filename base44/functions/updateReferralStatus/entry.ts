import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Admin only
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { referralId, status } = await req.json();

    if (!referralId || !status) {
      return Response.json({ error: 'Referral ID and status required' }, { status: 400 });
    }

    // Get the referral
    const referrals = await base44.asServiceRole.entities.Referral.filter({ id: referralId });
    if (referrals.length === 0) {
      return Response.json({ error: 'Referral not found' }, { status: 404 });
    }

    const referral = referrals[0];

    // Update referral status
    await base44.asServiceRole.entities.Referral.update(referralId, {
      status,
      ...(status === 'subscribed' ? { subscription_started_date: new Date().toISOString() } : {}),
      ...(status === 'paid' ? { first_payment_date: new Date().toISOString() } : {})
    });

    // If status is now 'paid', award the reward
    if (status === 'paid') {
      // Check if reward already given
      const existingRewards = await base44.asServiceRole.entities.UserReward.filter({
        user_id: referral.referrer_id,
        action_id: `referral_${referralId}`
      });

      if (existingRewards.length === 0) {
        // Create reward
        await base44.asServiceRole.entities.UserReward.create({
          user_id: referral.referrer_id,
          action_id: `referral_${referralId}`,
          action_name: 'Referral Commission',
          points_earned: referral.reward_amount || 25,
          description: `$${referral.reward_amount || 25} earned for referring ${referral.referred_user_name || referral.referred_user_email}`
        });

        // Update referral reward status
        await base44.asServiceRole.entities.Referral.update(referralId, {
          reward_status: 'sent'
        });
      }
    }

    return Response.json({
      success: true,
      referral: {
        id: referralId,
        status
      }
    });
  } catch (error) {
    console.error('Error updating referral status:', error);
    return Response.json({
      error: error.message
    }, { status: 500 });
  }
});