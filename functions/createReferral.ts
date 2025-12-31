import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { referralCode } = await req.json();

    if (!referralCode) {
      return Response.json({ error: 'Referral code required' }, { status: 400 });
    }

    // Find the referrer using service role
    const users = await base44.asServiceRole.entities.User.list();
    const referrer = users.find(u => u.id.slice(0, 8).toUpperCase() === referralCode.toUpperCase());

    if (!referrer) {
      return Response.json({ error: 'Referrer not found' }, { status: 404 });
    }

    // Check if referral already exists
    const existingReferrals = await base44.asServiceRole.entities.Referral.filter({
      referred_user_id: user.id,
      referrer_id: referrer.id
    });

    if (existingReferrals.length > 0) {
      return Response.json({ 
        success: true, 
        message: 'Referral already exists',
        referral: existingReferrals[0]
      });
    }

    // Create referral using service role
    const referral = await base44.asServiceRole.entities.Referral.create({
      referrer_id: referrer.id,
      referrer_name: referrer.full_name,
      referrer_email: referrer.email,
      referred_user_id: user.id,
      referred_user_name: user.full_name,
      referred_user_email: user.email,
      account_type: 'estate_sale_operator',
      status: 'signed_up',
      referral_code: referralCode
    });

    // Create connection using service role
    await base44.asServiceRole.entities.Connection.create({
      account_owner_id: referrer.id,
      account_owner_type: 'estate_sale_operator',
      connected_user_id: user.id,
      connected_user_name: user.full_name,
      connected_user_email: user.email,
      connection_type: 'referral',
      source: 'operator_signup'
    });

    return Response.json({ 
      success: true, 
      referral,
      referrer: {
        name: referrer.full_name,
        email: referrer.email
      }
    });
  } catch (error) {
    console.error('Error creating referral:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});