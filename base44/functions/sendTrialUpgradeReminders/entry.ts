import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ─────────────────────────────────────────────
// sendTrialUpgradeReminders
// Daily check for operator/business free trials (Subscription status 'pending').
// - From day 10 of the 14-day trial (4 or fewer days remaining), sends a daily
//   upgrade-reminder email with a link to the Packages page.
// - Once the trial renewal date passes, marks the subscription 'expired' and
//   sends a final "trial ended" email.
// Vendor/cleanout trials are handled by checkVendorTrialExpirations.
// ─────────────────────────────────────────────

const APP_URL = 'https://estatesalen.com';
const DAY_MS = 24 * 60 * 60 * 1000;

function reminderEmailTemplate(fullName, packageName, renewalDate, daysLeft) {
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
    <h2 style="color:#1e293b;">Your free trial ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}</h2>
    <p style="color:#334155;font-size:15px;">
      Hi ${fullName || 'there'},
    </p>
    <p style="color:#334155;font-size:15px;">
      Your <strong>${packageName}</strong> free trial ends on <strong>${renewalDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</strong>.
      Upgrade now to keep your plan active — including SERP pricing searches, marketing tools, and lead access.
    </p>
    <p style="margin:28px 0;">
      <a href="${APP_URL}/OperatorPackages"
         style="background-color:#f97316;color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">
        Upgrade Now
      </a>
    </p>
    <p style="color:#64748b;font-size:13px;">
      If you don't upgrade, your trial access will end on ${renewalDate.toLocaleDateString()} and SERP pricing searches will remain locked until you subscribe.
    </p>
  </div>`;
}

function trialEndedEmailTemplate(fullName, packageName) {
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
    <h2 style="color:#1e293b;">Your free trial has ended</h2>
    <p style="color:#334155;font-size:15px;">
      Hi ${fullName || 'there'},
    </p>
    <p style="color:#334155;font-size:15px;">
      Your <strong>${packageName}</strong> free trial has ended. Upgrade now to reactivate your plan
      and unlock SERP pricing searches, marketing tools, and full lead access.
    </p>
    <p style="margin:28px 0;">
      <a href="${APP_URL}/OperatorPackages"
         style="background-color:#f97316;color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">
        Upgrade Now
      </a>
    </p>
  </div>`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    const trialSubs = await base44.asServiceRole.entities.Subscription.filter({
      status: 'pending',
    });

    let reminders = 0;
    let expired = 0;
    let skipped = 0;

    for (const sub of trialSubs) {
      const accountType = sub.account_type || sub.plan_type || '';
      // Vendor/cleanout trials are handled by checkVendorTrialExpirations
      if (accountType.includes('vendor') || accountType.includes('cleanout')) continue;
      if (!sub.renewal_date) continue;

      // User already upgraded to a paid plan? End the trial record.
      const activeSubs = await base44.asServiceRole.entities.Subscription.filter({
        user_id: sub.user_id,
        status: 'active',
      });
      if (activeSubs.length > 0) {
        await base44.asServiceRole.entities.Subscription.update(sub.id, {
          status: 'expired',
          end_date: now.toISOString(),
        });
        continue;
      }

      // Skip if we already sent today's reminder for this trial
      const lastReminder = sub.last_trial_reminder_date
        ? sub.last_trial_reminder_date.slice(0, 10)
        : null;
      if (lastReminder === today) continue;

      const owner = await base44.asServiceRole.entities.User.get(sub.user_id);
      if (!owner || !owner.email) {
        skipped++;
        continue;
      }

      const renewalDate = new Date(sub.renewal_date);
      const packageName = sub.package_name || 'EstateSalen';

      if (renewalDate < now) {
        // Trial ended — mark expired and send final notice
        await base44.asServiceRole.entities.Subscription.update(sub.id, {
          status: 'expired',
          end_date: now.toISOString(),
          last_trial_reminder_date: now.toISOString(),
        });
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: owner.email,
            subject: 'Your EstateSalen free trial has ended',
            html: trialEndedEmailTemplate(owner.full_name, packageName),
          });
          expired++;
        } catch (emailErr) {
          console.error(`Failed trial-ended email to ${owner.email}:`, emailErr.message);
        }
      } else {
        const daysLeft = Math.ceil((renewalDate - now) / DAY_MS);
        if (daysLeft > 4) continue; // Reminders begin on day 10 of a 14-day trial

        await base44.asServiceRole.entities.Subscription.update(sub.id, {
          last_trial_reminder_date: now.toISOString(),
        });
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: owner.email,
            subject: `Your free trial ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'} — upgrade now`,
            html: reminderEmailTemplate(owner.full_name, packageName, renewalDate, daysLeft),
          });
          reminders++;
        } catch (emailErr) {
          console.error(`Failed reminder email to ${owner.email}:`, emailErr.message);
        }
      }
    }

    return Response.json({
      success: true,
      checked: trialSubs.length,
      reminders,
      expired,
      skipped,
    });
  } catch (error) {
    console.error('sendTrialUpgradeReminders error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});