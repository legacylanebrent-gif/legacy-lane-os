import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json().catch(() => ({}));
    
    const eventId = payload.event_id || payload.event?.entity_id;
    const resellerId = payload.reseller_id;
    
    if (!eventId || !resellerId) {
      return Response.json({ error: 'event_id and reseller_id required' }, { status: 400 });
    }

    const reseller = await base44.asServiceRole.entities.User.get(resellerId);
    if (!reseller) {
      return Response.json({ error: 'Reseller not found' }, { status: 404 });
    }

    const event = await base44.asServiceRole.entities.ResellerPackupEvent.get(eventId);
    if (!event) {
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }

    const prefs = await base44.asServiceRole.entities.NotificationPreference.filter({ user_id: resellerId });
    const pref = prefs.length > 0 ? prefs[0] : null;

    const title = '🎉 Reseller Event Invitation';
    const message = `You're invited to "${event.event_title}" on ${event.event_date} in ${event.city}, ${event.state}`;
    const link = `/ResellerPackupEvents?id=${eventId}`;

    let sent = 0;

    // In-app notification
    if (!pref || pref.sale_update_in_app !== false) {
      await base44.asServiceRole.entities.Notification.create({
        user_id: resellerId,
        type: 'event',
        title,
        message,
        link_to_page: 'ResellerPackupEvents',
        link_params: `id=${eventId}`,
        related_entity_type: 'ResellerPackupEvent',
        related_entity_id: eventId,
        read: false
      });
      sent++;
    }

    // Email notification
    if (pref?.sale_update_email && reseller.email) {
      const body = `
<h2 style="color:#1e293b;font-family:Georgia,serif;">${title}</h2>
<p style="color:#475569;">Hi ${reseller.full_name || 'there'},</p>
<p style="color:#475569;">${message}</p>

<div style="background:#f8fafc;border-left:4px solid #f97316;padding:16px 20px;border-radius:6px;margin:16px 0;">
  <h3 style="margin:0 0 8px;color:#1e293b;">${event.event_title}</h3>
  <p style="margin:4px 0;color:#64748b;">📅 ${event.event_date} ${event.start_time ? `at ${event.start_time}` : ''}</p>
  <p style="margin:4px 0;color:#64748b;">📍 ${event.city}, ${event.state}</p>
  <p style="margin:4px 0;color:#64748b;">🎯 ${event.event_type.replace(/_/g, ' ')}</p>
</div>

<p style="color:#475569;">
  <a href="https://estatesalen.com/ResellerPackupEvents?id=${eventId}" style="background:#f97316;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:600;">RSVP Now</a>
</p>
      `.trim();

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: reseller.email,
        subject: title,
        body
      });
      sent++;
    }

    return Response.json({ sent, event_id: eventId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});