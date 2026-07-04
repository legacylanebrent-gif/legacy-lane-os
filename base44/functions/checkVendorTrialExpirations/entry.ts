import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ─────────────────────────────────────────────
// checkVendorTrialExpirations
// Daily check for vendor free trial expirations.
// Looks for Vendor records linked to Subscriptions with status 'pending'
// (trial) that are approaching or past their renewal date, and sends
// notifications to the vendor.
// ─────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const now = new Date();
    const soonThreshold = new Date(now);
    soonThreshold.setDate(soonThreshold.getDate() + 3); // 3 days from now

    // Find subscriptions in 'pending' (trial) status for vendor account types
    const trialSubs = await base44.asServiceRole.entities.Subscription.filter({
      status: 'pending',
    });

    let notified = 0;
    let expired = 0;

    for (const sub of trialSubs) {
      // Check if this is a vendor-type subscription
      const accountType = sub.account_type || sub.plan_type || '';
      const isVendor = accountType.includes('vendor') || accountType.includes('cleanout');

      if (!isVendor) continue;

      const renewalDate = sub.renewal_date || sub.end_date ? new Date(sub.renewal_date || sub.end_date) : null;

      if (!renewalDate) continue;

      if (renewalDate < now) {
        // Trial expired — mark subscription as expired
        await base44.asServiceRole.entities.Subscription.update(sub.id, {
          status: 'expired',
        });
        expired++;
      } else if (renewalDate <= soonThreshold) {
        // Trial expiring soon — send notification
        try {
          await base44.asServiceRole.entities.Notification.create({
            user_id: sub.user_id,
            title: 'Your free trial is ending soon',
            message: `Your vendor free trial expires on ${renewalDate.toLocaleDateString()}. Upgrade to continue receiving leads and directory placement.`,
            type: 'trial_expiring',
            is_read: false,
            created_at: now.toISOString(),
            metadata: { subscription_id: sub.id, renewal_date: renewalDate.toISOString() },
          });
          notified++;
        } catch (e) {
          console.error(`Failed to notify vendor ${sub.user_id}:`, e.message);
        }
      }
    }

    return Response.json({
      success: true,
      checked: trialSubs.length,
      notified,
      expired,
    });
  } catch (error) {
    console.error('checkVendorTrialExpirations error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});