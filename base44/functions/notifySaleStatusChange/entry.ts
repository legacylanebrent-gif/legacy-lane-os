import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json().catch(() => ({}));
    
    // Handle entity automation payload
    const estateSaleId = payload.estate_sale_id || payload.event?.entity_id;
    const oldStatus = payload.old_data?.status;
    const newStatus = payload.data?.status;

    if (!estateSaleId) {
      return Response.json({ error: 'estate_sale_id required' }, { status: 400 });
    }

    const sale = await base44.asServiceRole.entities.EstateSale.get(estateSaleId);
    if (!sale) {
      return Response.json({ error: 'Sale not found', estateSaleId }, { status: 400 });
    }

    // Skip if status didn't change
    if (oldStatus === newStatus) {
      return Response.json({ skipped: true, reason: 'status unchanged' });
    }

    const Estate Sale Company Owner = await base44.asServiceRole.entities.User.get(sale.operator_id);
    if (!Estate Sale Company Owner) {
      return Response.json({ error: 'Estate Sale Company Owner not found' }, { status: 404 });
    }

    // Get Estate Sale Company Owner's notification preferences
    const prefs = await base44.asServiceRole.entities.NotificationPreference.filter({ 
      user_id: sale.operator_id 
    });
    const pref = prefs.length > 0 ? prefs[0] : null;

    let title, message, link;

    // Determine notification content based on status change
    if (newStatus === 'upcoming' && oldStatus === 'draft') {
      title = '📅 Sale Published';
      message = `Your sale "${sale.title}" is now live and visible to the public.`;
      link = `/SaleEditor?id=${sale.id}`;
    } else if (newStatus === 'active') {
      title = '🎉 Sale Started';
      message = `Your sale "${sale.title}" has started! Good luck!`;
      link = `/MySales`;
    } else if (newStatus === 'completed') {
      title = '✅ Sale Completed';
      message = `Your sale "${sale.title}" has been marked as completed. Time to recap!`;
      link = `/SaleRecap?id=${sale.id}`;
    } else if (newStatus === 'archived') {
      title = '📦 Sale Archived';
      message = `Your sale "${sale.title}" has been archived.`;
      link = `/MySales`;
    } else {
      return Response.json({ skipped: true, reason: 'unhandled status change' });
    }

    let sent = 0;

    // Send in-app notification
    if (!pref || pref.sale_update_in_app !== false) {
      await base44.asServiceRole.entities.Notification.create({
        user_id: sale.operator_id,
        type: 'sale_update',
        title,
        message,
        link_to_page: link.split('?')[0].replace('/', ''),
        link_params: link.split('?')[1] || null,
        related_entity_type: 'EstateSale',
        related_entity_id: sale.id,
        read: false
      });
      sent++;
    }

    // Send email notification
    if (pref?.sale_update_email && Estate Sale Company Owner.email) {
      const saleAddress = sale.property_address
        ? `${sale.property_address.city}, ${sale.property_address.state}`
        : 'Location TBA';
      
      const body = `
<h2 style="color:#1e293b;font-family:Georgia,serif;">${title}</h2>
<p style="color:#475569;">Hi ${Estate Sale Company Owner.full_name || 'there'},</p>
<p style="color:#475569;">${message}</p>

<div style="background:#f8fafc;border-left:4px solid #f97316;padding:16px 20px;border-radius:6px;margin:16px 0;">
  <h3 style="margin:0 0 8px;color:#1e293b;">${sale.title}</h3>
  <p style="margin:4px 0;color:#64748b;">📍 ${saleAddress}</p>
  <p style="margin:4px 0;color:#64748b;">Status: <strong>${newStatus}</strong></p>
</div>

<p style="color:#475569;">
  <a href="https://estatesalen.com${link}" style="background:#f97316;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:600;">View Sale</a>
</p>

<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
<p style="color:#94a3b8;font-size:12px;">
  You're receiving this because you have sale update notifications enabled.
  <a href="https://estatesalen.com/NotificationSettings" style="color:#f97316;">Manage preferences</a>
</p>
      `.trim();

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: Estate Sale Company Owner.email,
        subject: `${title}: ${sale.title}`,
        body
      });
      sent++;
    }

    return Response.json({ sent, sale_id: sale.id, status_change: `${oldStatus} → ${newStatus}` });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});