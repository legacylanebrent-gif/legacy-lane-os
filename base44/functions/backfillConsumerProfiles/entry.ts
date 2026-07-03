import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ─────────────────────────────────────────────
// backfillConsumerProfiles
// Scheduled function: finds all users not yet synced to
// ConsumerMarketingProfile + Customer.io, and syncs them.
// Processes 100 users per run. Inlines Customer.io API calls.
// ─────────────────────────────────────────────

function getCustomerIoConfig() {
  const enabled = Deno.env.get('CUSTOMERIO_ENABLED') === 'true';
  const pipelinesWriteKey = Deno.env.get('CUSTOMERIO_PIPELINES_WRITE_KEY') || '';
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
      source: profile.source || 'backfill_sync',
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

    // Auth check — admin only (for manual triggers)
    try {
      const user = await base44.auth.me();
      if (user && user.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    } catch {
      // Scheduled automation — no user context, continue with service role
    }

    const config = getCustomerIoConfig();

    // Find users not yet synced
    const unsyncedUsers = await base44.asServiceRole.entities.User.filter({
      consumer_marketing_synced: { $ne: true },
    });

    let synced = 0;
    let failed = 0;
    let cioSent = 0;
    let cioFailed = 0;
    const errors = [];

    for (const user of unsyncedUsers.slice(0, 100)) {
      try {
        // Find or create ConsumerMarketingProfile
        const existing = await base44.asServiceRole.entities.ConsumerMarketingProfile.filter({
          email: user.email,
        });

        const profileData = {
          user_id: user.id,
          email: user.email,
          first_name: user.full_name?.split(' ')[0] || '',
          last_name: user.full_name?.split(' ').slice(1).join(' ') || '',
          zip_code: user.zip_code || '',
          city: user.city || '',
          state: user.state || '',
          role: user.primary_account_type || 'consumer',
          subscription_tier: user.subscription_tier || 'none',
          subscription_status: user.subscription_status || 'none',
          global_marketing_opt_in: true,
          estate_sale_alerts_opt_in: true,
          vip_alerts_opt_in: false,
          weekly_digest_opt_in: false,
          updated_at: new Date().toISOString(),
        };

        if (existing.length > 0) {
          await base44.asServiceRole.entities.ConsumerMarketingProfile.update(existing[0].id, profileData);
        } else {
          await base44.asServiceRole.entities.ConsumerMarketingProfile.create({
            ...profileData,
            source: 'website_signup',
            created_at: new Date().toISOString(),
          });
        }

        // Mark user as synced
        await base44.asServiceRole.entities.User.update(user.id, {
          consumer_marketing_synced: true,
        });

        // Fire Customer.io identify directly
        try {
          await cioIdentify({
            user_id: user.id,
            email: user.email,
            first_name: profileData.first_name,
            last_name: profileData.last_name,
            role: profileData.role,
            subscription_tier: profileData.subscription_tier,
            subscription_status: profileData.subscription_status,
            zip_code: profileData.zip_code,
            city: profileData.city,
            state: profileData.state,
            source: 'backfill_sync',
          }, config);
          cioSent++;
        } catch (e) {
          console.error(`[backfill] CIO identify failed for ${user.email}:`, e.message);
          cioFailed++;
        }

        synced++;
      } catch (err) {
        failed++;
        errors.push({ email: user.email, error: err.message });
      }
    }

    return Response.json({
      success: true,
      processed: unsyncedUsers.slice(0, 100).length,
      synced,
      failed,
      cio_sent: cioSent,
      cio_failed: cioFailed,
      remaining: Math.max(0, unsyncedUsers.length - 100),
      errors: errors.slice(0, 5),
    });
  } catch (error) {
    console.error('backfillConsumerProfiles error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});