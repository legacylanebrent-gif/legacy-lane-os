import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ─────────────────────────────────────────────
// syncConsumerProfile
// Creates or updates a ConsumerMarketingProfile for a user,
// then fires a Customer.io identify event.
// Called on user registration, profile update, or manually.
// ─────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    // If userId is passed, sync that user (admin only); otherwise sync self
    const targetUserId = body.user_id;
    const isAdmin = user.role === 'admin';

    let targetUser = user;
    if (targetUserId && targetUserId !== user.id) {
      if (!isAdmin) return Response.json({ error: 'Forbidden' }, { status: 403 });
      const users = await base44.asServiceRole.entities.User.filter({ id: targetUserId });
      targetUser = users[0];
      if (!targetUser) return Response.json({ error: 'User not found' }, { status: 404 });
    }

    // Find or create ConsumerMarketingProfile
    const existing = await base44.asServiceRole.entities.ConsumerMarketingProfile.filter({
      email: targetUser.email,
    });

    const profileData = {
      user_id: targetUser.id,
      email: targetUser.email,
      first_name: targetUser.full_name?.split(' ')[0] || '',
      last_name: targetUser.full_name?.split(' ').slice(1).join(' ') || '',
      zip_code: targetUser.zip_code || '',
      city: targetUser.city || '',
      state: targetUser.state || '',
      role: targetUser.primary_account_type || 'consumer',
      subscription_tier: targetUser.subscription_tier || 'none',
      subscription_status: targetUser.subscription_status || 'none',
      global_marketing_opt_in: true,
      estate_sale_alerts_opt_in: true,
      vip_alerts_opt_in: false,
      weekly_digest_opt_in: false,
      updated_at: new Date().toISOString(),
    };

    let profileId;
    if (existing.length > 0) {
      await base44.asServiceRole.entities.ConsumerMarketingProfile.update(existing[0].id, profileData);
      profileId = existing[0].id;
    } else {
      const created = await base44.asServiceRole.entities.ConsumerMarketingProfile.create({
        ...profileData,
        source: 'website_signup',
        created_at: new Date().toISOString(),
      });
      profileId = created.id;
    }

    // Mark user as synced
    await base44.asServiceRole.entities.User.update(targetUser.id, {
      consumer_marketing_synced: true,
    });

    // Fire Customer.io identify event
    try {
      await base44.asServiceRole.functions.invoke('customerioService', {
        action: 'identifyConsumer',
        profile: {
          user_id: targetUser.id,
          email: targetUser.email,
          first_name: profileData.first_name,
          last_name: profileData.last_name,
          role: profileData.role,
          subscription_tier: profileData.subscription_tier,
          subscription_status: profileData.subscription_status,
          zip_code: profileData.zip_code,
          city: profileData.city,
          state: profileData.state,
          source: 'profile_sync',
        },
      });
    } catch (e) {
      console.error('[syncConsumerProfile] CustomerIO identify failed:', e.message);
    }

    return Response.json({
      success: true,
      profile_id: profileId,
      synced: true,
    });
  } catch (error) {
    console.error('syncConsumerProfile error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});