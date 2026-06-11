import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get all users with digest preferences
    const prefsWithDigest = await base44.asServiceRole.entities.NotificationPreference.filter({
      sale_alert_enabled: true,
      sale_alert_frequency: { $in: ['daily_digest', 'weekly_digest'] }
    });

    if (prefsWithDigest.length === 0) {
      return Response.json({ sent: 0, reason: 'no users with digest preferences' });
    }

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    let totalSent = 0;

    for (const pref of prefsWithDigest) {
      const user = await base44.asServiceRole.entities.User.get(pref.user_id);
      if (!user?.email) continue;

      // Check if already sent today (for daily) or this week (for weekly)
      const lastSent = pref.sale_alert_last_sent ? new Date(pref.sale_alert_last_sent) : null;
      
      if (pref.sale_alert_frequency === 'daily_digest' && lastSent && lastSent > oneDayAgo) {
        continue; // Already sent today
      }
      
      if (pref.sale_alert_frequency === 'weekly_digest' && lastSent && lastSent > sevenDaysAgo) {
        continue; // Already sent this week
      }

      // Fetch new sales since last digest
      const cutoffDate = lastSent || sevenDaysAgo;
      const allSales = await base44.asServiceRole.entities.EstateSale.list('-created_date', 100);
      
      const newSales = allSales.filter(sale => {
        const saleDate = new Date(sale.created_date);
        return saleDate > cutoffDate && ['upcoming', 'active'].includes(sale.status);
      });

      if (newSales.length === 0) {
        continue; // No new sales to report
      }

      // Build digest email
      const saleListHtml = newSales.slice(0, 10).map(sale => {
        const address = sale.property_address ? `${sale.property_address.city}, ${sale.property_address.state}` : 'Location TBA';
        const dates = (sale.sale_dates || []).map(d => d.date).join(', ');
        return `
          <div style="background:#f8fafc;padding:12px;margin:8px 0;border-radius:4px;">
            <h4 style="margin:0 0 4px;color:#1e293b;">${sale.title}</h4>
            <p style="margin:2px 0;color:#64748b;font-size:14px;">📍 ${address}</p>
            ${dates ? `<p style="margin:2px 0;color:#64748b;font-size:14px;">📅 ${dates}</p>` : ''}
            <p style="margin:8px 0 0;">
              <a href="https://estatesalen.com/EstateSaleDetail?id=${sale.id}" style="color:#f97316;text-decoration:none;font-weight:600;">View Details →</a>
            </p>
          </div>
        `;
      }).join('');

      const subject = pref.sale_alert_frequency === 'daily_digest' 
        ? `📬 Your Daily Estate Sale Digest (${newSales.length} new)`
        : `📬 Your Weekly Estate Sale Digest (${newSales.length} new)`;

      const body = `
<h2 style="color:#1e293b;font-family:Georgia,serif;">Your ${pref.sale_alert_frequency === 'daily_digest' ? 'Daily' : 'Weekly'} Estate Sale Digest</h2>
<p style="color:#475569;">Hi ${user.full_name || 'there'},</p>
<p style="color:#475569;">Here are ${newSales.length} new estate sales since your last digest:</p>

${saleListHtml}

${newSales.length > 10 ? `<p style="color:#64748b;margin:16px 0;">+ ${newSales.length - 10} more sales on the website.</p>` : ''}

<p style="margin:24px 0;">
  <a href="https://estatesalen.com/EstateSaleFinder" style="background:#f97316;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:600;">Browse All Sales</a>
</p>

<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
<p style="color:#94a3b8;font-size:12px;">
  You're receiving this because you have ${pref.sale_alert_frequency} enabled.
  <a href="https://estatesalen.com/NotificationSettings" style="color:#f97316;">Manage preferences</a>
</p>
      `.trim();

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: user.email,
        subject,
        body
      });

      // Update last sent timestamp
      await base44.asServiceRole.entities.NotificationPreference.update(pref.id, {
        sale_alert_last_sent: now.toISOString()
      });

      totalSent++;
    }

    return Response.json({ sent: totalSent });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});