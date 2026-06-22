import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ─────────────────────────────────────────────
// sendOperatorCampaign
// Sends a branded email campaign to the operator's audience.
// Elite-tier only. 1000 profiles included, $40 per additional 1000.
// Uses the platform's built-in SendEmail integration (no Customer.io needed).
// ─────────────────────────────────────────────

const ELITE_TIERS = ['elite'];
const ADMIN_ROLES = ['super_admin', 'platform_ops', 'admin', 'support_agent', 'marketing_ops', 'data_analyst'];
const BATCH_SIZE = 20; // concurrent sends per batch

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { campaign_id, action } = body;

    // ── getQuota ──
    if (action === 'getQuota') {
      const quota = await getOrCreateQuota(base44, user);
      const available = quota.profiles_included + quota.additional_purchased - quota.profiles_used;
      return Response.json({
        success: true,
        quota: {
          profiles_included: quota.profiles_included,
          additional_purchased: quota.additional_purchased,
          profiles_used: quota.profiles_used,
          available: Math.max(0, available),
          tier: quota.subscription_tier,
        }
      });
    }

    // ── getRecipients (preview audience size) ──
    if (action === 'getRecipients') {
      const tierCheck = await checkEliteAccess(base44, user);
      if (!tierCheck.allowed) return Response.json({ error: tierCheck.message }, { status: 403 });

      const recipients = await fetchRecipients(base44, user.id);
      const quota = await getOrCreateQuota(base44, user);
      const available = quota.profiles_included + quota.additional_purchased - quota.profiles_used;

      return Response.json({
        success: true,
        recipient_count: recipients.length,
        available_quota: Math.max(0, available),
        would_send: Math.min(recipients.length, Math.max(0, available)),
        needs_purchase: recipients.length > available,
      });
    }

    // ── sendCampaign ──
    if (action === 'sendCampaign') {
      if (!campaign_id) return Response.json({ error: 'Missing campaign_id' }, { status: 400 });

      const tierCheck = await checkEliteAccess(base44, user);
      if (!tierCheck.allowed) return Response.json({ error: tierCheck.message }, { status: 403 });

      // Fetch the campaign
      const campaign = await base44.entities.Campaign.get(campaign_id);
      if (!campaign) return Response.json({ error: 'Campaign not found' }, { status: 404 });
      if (campaign.creator_id !== user.id && !ADMIN_ROLES.includes(user.primary_account_type) && user.role !== 'admin') {
        return Response.json({ error: 'You do not own this campaign' }, { status: 403 });
      }
      if (campaign.campaign_type !== 'email') {
        return Response.json({ error: 'Only email campaigns can be sent via this function' }, { status: 400 });
      }
      if (!campaign.email_subject || !campaign.email_body) {
        return Response.json({ error: 'Campaign is missing email subject or body' }, { status: 400 });
      }

      // Check quota
      const quota = await getOrCreateQuota(base44, user);
      const available = quota.profiles_included + quota.additional_purchased - quota.profiles_used;
      if (available <= 0) {
        return Response.json({
          error: 'Profile quota exhausted',
          needs_purchase: true,
          available: 0,
          message: 'You have used all your included profiles. Purchase an additional 1,000 profiles for $40 to continue sending.'
        }, { status: 402 });
      }

      // Fetch recipients
      const recipients = await fetchRecipients(base44, user.id);
      if (recipients.length === 0) {
        return Response.json({ error: 'No eligible recipients found. You need active followers with marketing opt-in.' }, { status: 400 });
      }

      // Limit to available quota
      const recipientsToSend = recipients.slice(0, available);
      const senderName = campaign.sender_name || user.company_name || user.full_name || 'EstateSalen';
      const replyTo = campaign.reply_to_email || '';

      // Send emails in concurrent batches
      let sentCount = 0;
      let failedCount = 0;
      for (let i = 0; i < recipientsToSend.length; i += BATCH_SIZE) {
        const batch = recipientsToSend.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map(recipient =>
            base44.asServiceRole.integrations.Core.SendEmail({
              to: recipient.email,
              subject: campaign.email_subject,
              body: campaign.email_body,
              from_name: senderName,
            })
          )
        );
        for (const r of results) {
          if (r.status === 'fulfilled') sentCount++;
          else failedCount++;
        }
      }

      // Update quota
      await base44.asServiceRole.entities.OperatorEmailQuota.update(quota.id, {
        profiles_used: quota.profiles_used + sentCount,
      });

      // Update campaign
      const newSent = (campaign.metrics?.sent || 0) + sentCount;
      await base44.entities.Campaign.update(campaign_id, {
        status: 'active',
        sent_at: new Date().toISOString(),
        recipient_count: sentCount,
        sender_name: senderName,
        metrics: {
          ...(campaign.metrics || {}),
          sent: newSent,
        },
      });

      return Response.json({
        success: true,
        sent: sentCount,
        failed: failedCount,
        remaining_quota: available - sentCount,
      });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('sendOperatorCampaign error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ── Helpers ──

async function checkEliteAccess(base44, user) {
  if (ADMIN_ROLES.includes(user.primary_account_type) || user.role === 'admin') {
    return { allowed: true };
  }
  const subscriptions = await base44.entities.Subscription.filter({ user_id: user.id, status: 'active' });
  const tier = subscriptions.length > 0 ? subscriptions[0].tier : null;
  if (!ELITE_TIERS.includes(tier)) {
    return { allowed: false, message: 'Campaign sending is an Elite-tier feature. Upgrade to Elite to send branded email campaigns.' };
  }
  return { allowed: true };
}

async function getOrCreateQuota(base44, user) {
  const existing = await base44.asServiceRole.entities.OperatorEmailQuota.filter({ operator_id: user.id });
  if (existing.length > 0) return existing[0];

  const subscriptions = await base44.entities.Subscription.filter({ user_id: user.id, status: 'active' });
  const tier = subscriptions.length > 0 ? subscriptions[0].tier : 'elite';

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setFullYear(now.getFullYear() + 1);

  return await base44.asServiceRole.entities.OperatorEmailQuota.create({
    operator_id: user.id,
    operator_email: user.email,
    company_name: user.company_name || '',
    subscription_tier: ELITE_TIERS.includes(tier) ? tier : 'elite',
    profiles_included: 1000,
    profiles_used: 0,
    additional_purchased: 0,
    period_start: now.toISOString(),
    period_end: periodEnd.toISOString(),
  });
}

async function fetchRecipients(base44, operatorId) {
  // Get active followers of this operator
  const followers = await base44.asServiceRole.entities.OperatorFollowerSubscription.filter({
    operator_id: operatorId,
    subscription_status: 'active',
  });

  // Deduplicate by email
  const seen = new Set();
  const recipients = [];
  for (const f of followers) {
    if (f.consumer_email && !seen.has(f.consumer_email.toLowerCase())) {
      seen.add(f.consumer_email.toLowerCase());
      recipients.push({ email: f.consumer_email, user_id: f.consumer_user_id });
    }
  }
  return recipients;
}