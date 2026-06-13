import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const LOW_THRESHOLD = 0.1;  // 10% remaining = warn
const EXHAUSTED_THRESHOLD = 0;  // 0 remaining = exhausted

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get all credit accounts
    const accounts = await base44.asServiceRole.entities.OperatorAICreditAccount.list();

    // Get all admin users
    const allUsers = await base44.asServiceRole.entities.User.list();
    const admins = allUsers.filter(u => u.role === 'admin');

    if (admins.length === 0) {
      return Response.json({ status: 'no_admins', message: 'No admin users found to notify' });
    }

    const now = new Date();
    const alerts = { exhausted: [], low: [], healthy: 0 };

    for (const account of accounts) {
      const baseLimit = account.google_lens_searches_limit || 0;
      const baseUsed = account.google_lens_searches_used || 0;
      const purchased = account.google_lens_purchased_searches || 0;
      const purchasedUsed = account.google_lens_purchased_used || 0;

      // Skip unlimited accounts
      if (baseLimit === -1 || baseLimit >= 10000) {
        alerts.healthy++;
        continue;
      }

      // Skip accounts with no base limit (not using Google Lens)
      if (baseLimit === 0 && purchased === 0) {
        continue;
      }

      const remainingPurchased = Math.max(0, purchased - purchasedUsed);
      const remainingBase = Math.max(0, baseLimit - baseUsed);
      const totalRemaining = remainingPurchased + remainingBase;
      const totalLimit = baseLimit + purchased;

      // Get operator info
      let operatorName = account.operator_id;
      try {
        const ops = await base44.asServiceRole.entities.User.filter({ id: account.operator_id });
        if (ops.length > 0) {
          operatorName = ops[0].company_name || ops[0].full_name || account.operator_id;
        }
      } catch (e) {
        // Operator may not exist
      }

      const accountSummary = {
        operator_id: account.operator_id,
        operator_name: operatorName,
        subscription_tier: account.subscription_tier || 'starter',
        base_limit: baseLimit,
        base_used: baseUsed,
        purchased: purchased,
        purchased_used: purchasedUsed,
        remaining: totalRemaining,
        usage_pct: totalLimit > 0 ? Math.round(((totalLimit - totalRemaining) / totalLimit) * 100) : 0,
      };

      if (totalRemaining <= EXHAUSTED_THRESHOLD) {
        alerts.exhausted.push(accountSummary);

        // Mark account as over_limit
        await base44.asServiceRole.entities.OperatorAICreditAccount.update(account.id, {
          status: 'over_limit',
        });
      } else if (totalRemaining <= totalLimit * LOW_THRESHOLD) {
        alerts.low.push(accountSummary);
      } else {
        alerts.healthy++;
      }
    }

    // Build notifications for admins
    const notifications = [];

    for (const exhausted of alerts.exhausted) {
      for (const admin of admins) {
        notifications.push({
          user_id: admin.id,
          type: 'system',
          title: 'Google Lens Credits Exhausted',
          message: `${exhausted.operator_name} (${exhausted.subscription_tier} tier) has used all ${exhausted.base_limit} Google Lens searches. They need a plan upgrade or credit purchase.`,
          read: false,
          link_to_page: 'AdminDashboard',
        });
      }
    }

    for (const low of alerts.low) {
      for (const admin of admins) {
        notifications.push({
          user_id: admin.id,
          type: 'system',
          title: 'Google Lens Credits Running Low',
          message: `${low.operator_name} (${low.subscription_tier} tier) has only ${low.remaining} of ${low.base_limit + low.purchased} Google Lens searches remaining (${low.usage_pct}% used). Consider prompting an upgrade.`,
          read: false,
          link_to_page: 'AdminDashboard',
        });
      }
    }

    // Batch create all notifications
    if (notifications.length > 0) {
      // Create in batches of 50 to avoid rate limits
      for (let i = 0; i < notifications.length; i += 50) {
        const batch = notifications.slice(i, i + 50);
        await base44.asServiceRole.entities.Notification.bulkCreate(batch);
      }
    }

    return Response.json({
      status: 'complete',
      accounts_scanned: accounts.length,
      exhausted: alerts.exhausted.map(a => a.operator_name),
      low: alerts.low.map(a => a.operator_name),
      healthy: alerts.healthy,
      notifications_created: notifications.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});