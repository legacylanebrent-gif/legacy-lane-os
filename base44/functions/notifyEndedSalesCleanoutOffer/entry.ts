import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // ── Compute yesterday's date in America/New_York timezone ──
        const now = new Date();
        const etString = now.toLocaleString('en-US', {
            timeZone: 'America/New_York',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        const match = etString.match(/(\d{2})\/(\d{2})\/(\d{4})/);
        const etYear = parseInt(match[3]);
        const etMonth = parseInt(match[1]);
        const etDay = parseInt(match[2]);

        const yesterdayDate = new Date(etYear, etMonth - 1, etDay - 1);
        const yMonth = String(yesterdayDate.getMonth() + 1).padStart(2, '0');
        const yDay = String(yesterdayDate.getDate()).padStart(2, '0');
        const yesterdayStr = `${yesterdayDate.getFullYear()}-${yMonth}-${yDay}`;

        // ── Fetch all sales that could have ended ──
        const [activeSales, upcomingSales, completedSales] = await Promise.all([
            base44.asServiceRole.entities.EstateSale.filter({ status: 'active' }),
            base44.asServiceRole.entities.EstateSale.filter({ status: 'upcoming' }),
            base44.asServiceRole.entities.EstateSale.filter({ status: 'completed' }),
        ]);

        const allSales = [...(activeSales || []), ...(upcomingSales || []), ...(completedSales || [])];

        // ── Filter sales whose LAST sale_date.date === yesterday ──
        const endedSales = allSales.filter(sale => {
            if (!sale.sale_dates || sale.sale_dates.length === 0) return false;
            const lastDate = sale.sale_dates[sale.sale_dates.length - 1];
            return lastDate.date === yesterdayStr;
        });

        let notified = 0;
        let skipped = 0;

        for (const sale of endedSales) {
            // ── Dedup: check if notification already sent for this sale ──
            const existingNotifs = await base44.asServiceRole.entities.Notification.filter({
                related_entity_id: sale.id,
                type: 'sale_update'
            });

            const alreadySent = existingNotifs.some(n =>
                n.title && n.title.includes('Congratulations on completing')
            );

            if (alreadySent) {
                skipped++;
                continue;
            }

            // ── Get operator info ──
            const operator = await base44.asServiceRole.entities.User.get(sale.operator_id);
            if (!operator) {
                skipped++;
                continue;
            }

            const saleTitle = sale.title || 'Your sale';
            const saleLocation = sale.property_address
                ? `${sale.property_address.city || ''}, ${sale.property_address.state || ''}`.trim().replace(/,$/, '')
                : '';

            // ── Create in-app notification ──
            await base44.asServiceRole.entities.Notification.create({
                user_id: sale.operator_id,
                type: 'sale_update',
                title: `🎉 Congratulations on completing: ${saleTitle}`,
                message: `Your sale "${saleTitle}" has ended. Need to schedule a cleanout? Create one now and we'll automatically notify cleanout companies in your area who will send you proposals.`,
                link_to_page: 'CleanoutEditor',
                link_params: 'id=new',
                related_entity_type: 'EstateSale',
                related_entity_id: sale.id,
                read: false
            });

            // ── Send email ──
            if (operator.email) {
                const emailBody = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
<tr><td style="background:linear-gradient(135deg,#1e293b 0%,#334155 100%);padding:28px 32px;text-align:center;">
  <div style="font-family:Georgia,serif;font-size:26px;font-weight:bold;color:#ffffff;letter-spacing:1px;">EstateSalen.com</div>
  <div style="font-size:12px;color:#f97316;margin-top:4px;letter-spacing:2px;text-transform:uppercase;">Estate Sale Platform</div>
</td></tr>
<tr><td style="padding:36px 32px;">
  <h2 style="margin:0 0 16px 0;font-size:22px;color:#1e293b;font-family:Georgia,serif;">🎉 Congratulations on a Successful Sale!</h2>
  <p style="margin:0 0 16px 0;font-size:15px;color:#475569;line-height:1.7;">Hi ${operator.full_name || 'there'},</p>
  <p style="margin:0 0 16px 0;font-size:15px;color:#475569;line-height:1.7;">Congratulations on the successful completion of your sale <strong>"${saleTitle}"</strong>${saleLocation ? ` in ${saleLocation}` : ''}! We hope it was a great success.</p>

  <div style="background:#ecfeff;border-left:4px solid #06b6d4;padding:16px 20px;border-radius:6px;margin:20px 0;">
    <h3 style="margin:0 0 8px 0;color:#0e7490;font-size:16px;">🧹 Need a Cleanout?</h3>
    <p style="margin:0 0 12px 0;font-size:14px;color:#475569;line-height:1.6;">
      Now that your sale has ended, you may need a cleanout to remove any remaining items and prepare the property. EstateSalen.com can connect you with professional cleanout companies in your area.
    </p>
    <p style="margin:0 0 8px 0;font-size:14px;color:#475569;line-height:1.6;"><strong>Here's how it works:</strong></p>
    <ul style="margin:0 0 12px 0;padding-left:20px;font-size:14px;color:#475569;line-height:1.8;">
      <li>Create a cleanout listing with photos and details of what needs to be removed</li>
      <li>As soon as you publish, we automatically send your listing to all cleanout companies in your area</li>
      <li>Companies will review your listing and send you competitive proposals</li>
      <li>You review the bids and choose the best offer — no phone tag, no hassle</li>
    </ul>
  </div>

  <div style="text-align:center;margin:28px 0;">
    <a href="https://estatesalen.com/CleanoutEditor?id=new" style="display:inline-block;background:#06b6d4;color:#ffffff;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:700;text-decoration:none;margin:4px;">🧹 Create a Cleanout</a>
    <a href="https://estatesalen.com/MySales" style="display:inline-block;background:#f97316;color:#ffffff;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:700;text-decoration:none;margin:4px;">Go to My Sales</a>
  </div>

  <p style="margin:16px 0 0 0;font-size:14px;color:#64748b;line-height:1.6;">
    💡 As soon as you publish your cleanout details, the listing link will automatically be sent to all cleanout companies in your area — they'll review it and send you proposals. No need to call around!
  </p>
</td></tr>
<tr><td style="background:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;text-align:center;">
  <p style="margin:0 0 6px 0;font-size:13px;color:#64748b;">EstateSalen.com &nbsp;|&nbsp; Estate Sale & Cleanout Platform</p>
  <p style="margin:0;font-size:12px;color:#94a3b8;">This is an automated message. Please do not reply directly to this email.</p>
</td></tr>
</table></td></tr></table>
</body></html>`;

                try {
                    await base44.asServiceRole.integrations.Core.SendEmail({
                        to: operator.email,
                        from_name: 'EstateSalen.com',
                        subject: `🎉 Congratulations on completing: ${saleTitle}`,
                        body: emailBody
                    });
                } catch (emailErr) {
                    console.error('Failed to send email for sale', sale.id, emailErr);
                }
            }

            notified++;
        }

        return Response.json({
            success: true,
            yesterday: yesterdayStr,
            total_checked: allSales.length,
            ended_sales: endedSales.length,
            notified,
            skipped
        });
    } catch (error) {
        console.error('Error in notifyEndedSalesCleanoutOffer:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});