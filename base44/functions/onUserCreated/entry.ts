import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ─────────────────────────────────────────────
// onUserCreated
// Entity automation: fires when a new User is created.
// Creates a ConsumerMarketingProfile and fires CustomerIO identify
// so new users are synced in real-time (not just via scheduled backfill).
// ─────────────────────────────────────────────

function getCustomerIoConfig() {
  const enabled = Deno.env.get('CUSTOMERIO_ENABLED') === 'true';
  const pipelinesWriteKey = Deno.env.get('CUSTOMERIO_API_KEY') || '';
  const configured = enabled && !!pipelinesWriteKey;
  return { enabled, configured, pipelinesWriteKey };
}

async function cioIdentify(profile, config) {
  if (!config.configured) return { skipped: true };
  const payload = {
    userId: profile.user_id || profile.email,
    traits: {
      email: profile.email,
      first_name: profile.first_name || '',
      last_name: profile.last_name || '',
      role: profile.role || 'consumer',
      subscription_tier: profile.subscription_tier || 'none',
      subscription_status: profile.subscription_status || 'none',
      zip_code: profile.zip_code || '',
      city: profile.city || '',
      state: profile.state || '',
      source: profile.source || 'registration_automation',
      updated_at: new Date().toISOString(),
    },
  };
  const res = await fetch('https://cdp.customer.io/v1/identify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${btoa(config.pipelinesWriteKey + ':')}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`CIO identify failed: ${res.status}`);
  return { sent: true };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const config = getCustomerIoConfig();

    const body = await req.json().catch(() => ({}));
    // Entity automation payload: { event: { type, entity_name, entity_id }, data: {...} }
    const userData = body.data;
    if (!userData || !userData.id) {
      return Response.json({ success: false, reason: 'No user data in payload' });
    }

    // Check if profile already exists
    const existing = await base44.asServiceRole.entities.ConsumerMarketingProfile.filter({
      email: userData.email,
    });

    const profileData = {
      user_id: userData.id,
      email: userData.email,
      first_name: userData.full_name?.split(' ')[0] || '',
      last_name: userData.full_name?.split(' ').slice(1).join(' ') || '',
      zip_code: userData.zip_code || '',
      city: userData.city || '',
      state: userData.state || '',
      role: userData.primary_account_type || 'consumer',
      subscription_tier: userData.subscription_tier || 'none',
      subscription_status: userData.subscription_status || 'none',
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
    await base44.asServiceRole.entities.User.update(userData.id, {
      consumer_marketing_synced: true,
    });

    // Fire CustomerIO identify
    try {
      await cioIdentify({
        user_id: userData.id,
        email: userData.email,
        ...profileData,
        source: 'registration_automation',
      }, config);
    } catch (e) {
      console.error('[onUserCreated] CIO identify failed:', e.message);
    }

    return Response.json({ success: true, profile_id: profileId });
  } catch (error) {
    console.error('onUserCreated error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});