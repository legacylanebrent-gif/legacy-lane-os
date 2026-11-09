// notifyCompanyFollowers — tells a company's followers about a sale that just went live.
// Called from onSalePublished (the EstateSale publish orchestrator), service role.
// Not distance limited on purpose: following a company means hearing about its sales wherever
// they are. Idempotent per (follower, sale) — the Notification record is the receipt, so a
// re-saved or repeatedly-updated sale never alerts the same person twice.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const APP_URL = 'https://estatesalen.com';
const BATCH = 6;

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function saleDateLines(sale) {
  return (sale.sale_dates || [])
    .filter(d => d && d.date)
    .slice(0, 4)
    .map(d => {
      const times = [d.start_time, d.end_time].filter(Boolean).join(' - ');
      return times ? `${d.date} ${times}` : d.date;
    });
}

function emailHtml(sale, user) {
  const company = esc(sale.operator_name || 'A company you follow');
  const address = sale.property_address
    ? esc([sale.property_address.city, sale.property_address.state].filter(Boolean).join(', '))
    : 'Location to be announced';
  const dates = saleDateLines(sale).map(esc);
  const saleUrl = `${APP_URL}/EstateSaleDetail?id=${sale.id}`;
  const manageUrl = `${APP_URL}/FavoriteCompanies`;

  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;">
<tr><td align="center" style="padding:24px 16px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;border:1px solid #e5e7eb;">
    <tr><td style="background:#0891b2;padding:16px 24px;">
      <span style="font-family:Georgia,serif;font-size:20px;color:#000000;">EstateSalen</span>
    </td></tr>
    <tr><td style="padding:28px 24px 8px;">
      <h1 style="margin:0;font-family:Georgia,serif;font-size:24px;color:#0f172a;">New sale from ${company}</h1>
      <p style="margin:8px 0 0;color:#64748b;font-size:15px;">You follow this company, so here is the sale they just posted.</p>
    </td></tr>
    <tr><td style="padding:16px 24px 0;">
      <div style="background:#f8fafc;border-left:4px solid #0891b2;padding:16px 20px;">
        <p style="margin:0 0 6px;font-family:Georgia,serif;font-size:18px;color:#0f172a;">${esc(sale.title || 'Estate sale')}</p>
        <p style="margin:4px 0;color:#64748b;font-size:14px;">Location: ${address}</p>
        ${dates.length ? `<p style="margin:4px 0;color:#64748b;font-size:14px;">Dates: ${dates.join(' | ')}</p>` : ''}
      </div>
    </td></tr>
    <tr><td style="padding:20px 24px 8px;">
      <a href="${saleUrl}" style="display:inline-block;background:#0891b2;color:#000000;padding:12px 24px;text-decoration:none;font-weight:700;font-size:15px;">View Sale Details</a>
    </td></tr>
    <tr><td style="padding:12px 24px 24px;">
      <p style="margin:0;color:#94a3b8;font-size:12px;">Hi ${esc(user?.full_name || 'there')}, you are receiving this because you follow ${company} on EstateSalen. <a href="${manageUrl}" style="color:#0891b2;">Manage the companies you follow</a></p>
    </td></tr>
  </table>
</td></tr>
</table>
</body></html>`;
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const saleId = body?.sale_id || body?.data?.id || body?.event?.entity_id;
    if (!saleId) return Response.json({ error: 'sale_id required' }, { status: 400 });

    const sale = await base44.asServiceRole.entities.EstateSale.get(saleId)
      .catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!sale) return Response.json({ error: 'Sale not found' }, { status: 404 });

    // Only a live listing is worth an alert.
    if (!['upcoming', 'active'].includes(sale.status)) {
      return Response.json({ skipped: true, reason: `status=${sale.status}` });
    }
    if (!sale.operator_id) return Response.json({ skipped: true, reason: 'sale has no operator' });

    const follows = await base44.asServiceRole.entities.CompanyFollow.filter({ operator_id: sale.operator_id });
    const followers = (follows || []).filter(f => f.consumer_user_id && f.consumer_user_id !== sale.operator_id);
    if (followers.length === 0) return Response.json({ notified: 0, reason: 'no followers' });

    // Receipts already written for this sale — any follower holding one is skipped.
    const prior = await base44.asServiceRole.entities.Notification.filter({
      related_entity_type: 'EstateSale',
      related_entity_id: sale.id
    });
    const alreadyNotified = new Set((prior || []).map(n => n.user_id));

    const users = await base44.asServiceRole.entities.User.list();
    const userById = {};
    (users || []).forEach(u => { userById[u.id] = u; });

    const targets = followers.filter(f => !alreadyNotified.has(f.consumer_user_id) && userById[f.consumer_user_id]);
    if (targets.length === 0) return Response.json({ notified: 0, reason: 'already notified' });

    const companyName = sale.operator_name || 'a company you follow';

    // One notification record per follower doubles as the receipt (and stays unread only
    // for people who actually asked for in-app alerts).
    const records = targets.map(f => ({
      user_id: f.consumer_user_id,
      type: 'sale_update',
      title: `New sale from ${companyName}`,
      message: `${sale.title || 'Estate sale'}${sale.property_address?.city ? ` in ${sale.property_address.city}` : ''}`,
      link_to_page: 'EstateSaleDetail',
      link_params: `id=${sale.id}`,
      related_entity_type: 'EstateSale',
      related_entity_id: sale.id,
      read: f.notify_inapp === false
    }));
    await base44.asServiceRole.entities.Notification.bulkCreate(records);

    // Email only to followers who kept email alerts on.
    const emailTargets = targets.filter(f => f.notify_email !== false && userById[f.consumer_user_id]?.email);
    let emailed = 0;
    for (let i = 0; i < emailTargets.length; i += BATCH) {
      const chunk = emailTargets.slice(i, i + BATCH);
      const results = await Promise.allSettled(chunk.map(f => base44.asServiceRole.integrations.Core.SendEmail({
        to: userById[f.consumer_user_id].email,
        subject: `New sale from ${companyName}: ${sale.title || 'Estate sale'}`,
        body: emailHtml(sale, userById[f.consumer_user_id])
      })));
      emailed += results.filter(r => r.status === 'fulfilled').length;
      results.filter(r => r.status === 'rejected').forEach(r => console.error('Follower email failed:', r.reason?.message));
    }

    return Response.json({
      sale_id: sale.id,
      followers: followers.length,
      in_app: records.filter(r => r.read === false).length,
      emailed
    });
  } catch (error) {
    console.error('notifyCompanyFollowers failed:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}