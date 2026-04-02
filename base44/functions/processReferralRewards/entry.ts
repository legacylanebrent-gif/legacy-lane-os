import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Admin only
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get all paid referrals
    const referrals = await base44.asServiceRole.entities.Referral.filter({
      status: 'paid'
    });

    const results = [];

    for (const referral of referrals) {
      // Check if reward already given
      const existingRewards = await base44.asServiceRole.entities.UserReward.filter({
        user_id: referral.referrer_id,
        action_id: `referral_${referral.id}`
      });

      if (existingRewards.length > 0) {
        results.push({
          referral_id: referral.id,
          status: 'already_rewarded'
        });
        continue;
      }

      // Create reward
      await base44.asServiceRole.entities.UserReward.create({
        user_id: referral.referrer_id,
        action_id: `referral_${referral.id}`,
        action_name: 'Referral Commission',
        points_earned: referral.reward_amount || 25,
        description: `$${referral.reward_amount || 25} earned for referring ${referral.referred_user_name || referral.referred_user_email}`
      });

      // Update referral reward status
      await base44.asServiceRole.entities.Referral.update(referral.id, {
        reward_status: 'sent'
      });

      results.push({
        referral_id: referral.id,
        status: 'rewarded',
        amount: referral.reward_amount || 25
      });
    }

    return Response.json({
      success: true,
      processed: results.length,
      results
    });
  } catch (error) {
    console.error('Error processing referral rewards:', error);
    return Response.json({
      error: error.message
    }, { status: 500 });
  }
});