import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { referral_id } = await req.json();

    if (!referral_id) {
      return Response.json({ error: 'referral_id required' }, { status: 400 });
    }

    // Fetch the referral record
    const referrals = await base44.entities.Referral.filter({ id: referral_id });
    if (referrals.length === 0) {
      return Response.json({ error: 'Referral not found' }, { status: 404 });
    }

    const referral = referrals[0];

    // Only process if referred user is a reseller and subscribed
    if (referral.account_type !== 'reseller' || referral.status !== 'subscribed') {
      return Response.json({ error: 'Referral not eligible for reward' }, { status: 400 });
    }

    // Update referral reward status
    await base44.entities.Referral.update(referral_id, {
      reward_status: 'sent',
      reward_amount: 25
    });

    // Add credit to referrer's account balance
    const referrerUser = await base44.auth.me();
    if (referrerUser && referrerUser.id === referral.referrer_id) {
      // Update referrer's balance (assuming a balance field exists or we track it via transactions)
      const currentBalance = referrerUser.account_balance || 0;
      await base44.auth.updateMe({
        account_balance: currentBalance + 25
      });
    }

    return Response.json({
      success: true,
      message: '$25 reward processed for reseller referral',
      reward_amount: 25
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});