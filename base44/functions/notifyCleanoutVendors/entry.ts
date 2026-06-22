import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { cleanout_id } = await req.json();
    if (!cleanout_id) return Response.json({ error: 'cleanout_id required' }, { status: 400 });

    // Load the cleanout
    const cleanouts = await base44.asServiceRole.entities.Cleanout.filter({ id: cleanout_id });
    const cleanout = cleanouts[0];
    if (!cleanout) return Response.json({ error: 'Cleanout not found' }, { status: 404 });

    // Update status to published
    await base44.asServiceRole.entities.Cleanout.update(cleanout_id, {
      status: 'published',
      published_at: new Date().toISOString()
    });

    const addr = cleanout.property_address || {};
    const state = addr.state;

    // Find matching cleanout vendors — network members with notifications enabled
    const allVendors = await base44.asServiceRole.entities.CleanoutVendorProfile.filter({
      membership_status: 'network_member',
      is_active: true
    }, '-created_date', 500);

    const matched = allVendors.filter(v => {
      const stateMatch = !state || !v.service_states?.length || v.service_states.includes(state) || v.state === state;
      return stateMatch && v.lead_notifications_enabled;
    });

    const deadlineStr = cleanout.cleanout_deadline
      ? new Date(cleanout.cleanout_deadline + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
      : 'TBD';

    let notified = 0;
    for (const vendor of matched) {
      try {
        const firstName = vendor.contact_name?.split(' ')[0] || 'there';
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: vendor.email,
          subject: `🧹 New Cleanout Opportunity: ${cleanout.title}`,
          body: `Hi ${firstName},\n\nA new cleanout opportunity has been published on EstateSalen in your service area.\n\n${cleanout.title}\n${addr.street ? addr.street + '\n' : ''}${addr.city}, ${state} ${addr.zip}\n\nDeadline: ${deadlineStr}\n\n${cleanout.scope_description ? 'Scope: ' + cleanout.scope_description + '\n' : ''}${cleanout.access_notes ? 'Access: ' + cleanout.access_notes + '\n' : ''}\nLog in to EstateSalen to submit your bid.\n\n— EstateSalen Cleanout Network`,
          html: `<p>Hi ${esc(firstName)},</p>
<p>A new cleanout opportunity has been published on EstateSalen in your service area.</p>
<div style="background:#f8fafc;border-left:4px solid #0891b2;padding:16px 20px;border-radius:6px;margin:16px 0;">
  <h3 style="margin:0 0 8px;color:#1e293b;">${esc(cleanout.title)}</h3>
  <p style="margin:4px 0;color:#64748b;">📍 ${esc(addr.street ? addr.street + ', ' : '')}${esc(addr.city)}, ${esc(state)} ${esc(addr.zip)}</p>
  <p style="margin:4px 0;color:#64748b;">📅 Complete by: ${esc(deadlineStr)}</p>
  ${cleanout.scope_description ? `<p style="margin:8px 0 0;color:#475569;"><strong>Scope:</strong> ${esc(cleanout.scope_description)}</p>` : ''}
  ${cleanout.access_notes ? `<p style="margin:4px 0;color:#475569;"><strong>Access:</strong> ${esc(cleanout.access_notes)}</p>` : ''}
</div>
${cleanout.photos && cleanout.photos.length > 0 ? `<p style="margin:12px 0;"><img src="${esc(cleanout.photos[0])}" alt="Cleanout photo" style="max-width:400px;border-radius:8px;" /></p>` : ''}
<p style="margin:16px 0;"><a href="https://estatesalen.com/CleanoutDetail?id=${cleanout_id}" style="background:#0891b2;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:600;">View & Submit Bid</a></p>
<p style="color:#94a3b8;font-size:12px;margin-top:24px;">— EstateSalen Cleanout Network</p>`
        });
        notified++;
      } catch { /* non-blocking */ }
    }

    return Response.json({
      success: true,
      cleanout_id,
      vendors_found: matched.length,
      notified
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});