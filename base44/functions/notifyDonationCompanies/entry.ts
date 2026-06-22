import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { donation_id } = await req.json();
    if (!donation_id) return Response.json({ error: 'donation_id required' }, { status: 400 });

    // Load the donation
    const donations = await base44.asServiceRole.entities.Donation.filter({ id: donation_id });
    const donation = donations[0];
    if (!donation) return Response.json({ error: 'Donation not found' }, { status: 404 });

    // Update status to published
    await base44.asServiceRole.entities.Donation.update(donation_id, {
      status: 'published',
      published_at: new Date().toISOString()
    });

    const addr = donation.property_address || {};
    const state = addr.state;

    // Find donation company vendors in the state
    const allVendors = await base44.asServiceRole.entities.Vendor.filter({
      vendor_type: 'donation_company'
    }, '-created_date', 500);

    const matched = allVendors.filter(v => {
      const stateMatch = !state || !v.service_areas?.length || v.service_areas.includes(state);
      return stateMatch;
    });

    const deadlineStr = donation.pickup_deadline
      ? new Date(donation.pickup_deadline + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
      : 'TBD';

    // Build seller contact block
    let sellerBlock = '';
    if (!donation.operator_handling_donations) {
      const parts = [];
      if (donation.seller_name) parts.push(`Name: ${donation.seller_name}`);
      if (donation.seller_phone) parts.push(`Phone: ${donation.seller_phone}`);
      if (donation.seller_email) parts.push(`Email: ${donation.seller_email}`);
      if (parts.length) sellerBlock = parts.join('\n');
    }

    let notified = 0;
    for (const vendor of matched) {
      try {
        const to = vendor.user_id ? null : null; // Vendor entity doesn't store email directly; use company_name
        // Vendor entity has no email field — send to admin for distribution, or skip if no contact
        // Actually, Vendor entity has website but no email. We'll create DonationResponse records
        // for each matched vendor so they can respond via the platform.
        await base44.asServiceRole.entities.DonationResponse.create({
          donation_id,
          vendor_id: vendor.id,
          vendor_name: vendor.company_name,
          status: 'pending'
        });
        notified++;
      } catch { /* non-blocking */ }
    }

    // Send email to admin about the published donation
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: 'admin@estatesalen.com',
        subject: `📦 New Donation Event Published: ${donation.title}`,
        body: `A donation event has been published on EstateSalen.\n\n${donation.title}\n${addr.street ? addr.street + '\n' : ''}${addr.city}, ${state} ${addr.zip}\n\nPickup Deadline: ${deadlineStr}\n${donation.scope_description ? 'Items: ' + donation.scope_description + '\n' : ''}${donation.access_notes ? 'Access: ' + donation.access_notes + '\n' : ''}${sellerBlock ? 'Seller Contact:\n' + sellerBlock + '\n' : 'Operator is handling all donations.\n'}\nMatched donation companies: ${matched.length}\n\n— EstateSalen Donation Network`,
        html: `<p>A donation event has been published on EstateSalen.</p>
<div style="background:#fdf2f8;border-left:4px solid #ec4899;padding:16px 20px;border-radius:6px;margin:16px 0;">
  <h3 style="margin:0 0 8px;color:#1e293b;">${esc(donation.title)}</h3>
  <p style="margin:4px 0;color:#64748b;">📍 ${esc(addr.street ? addr.street + ', ' : '')}${esc(addr.city)}, ${esc(state)} ${esc(addr.zip)}</p>
  <p style="margin:4px 0;color:#64748b;">📅 Pickup by: ${esc(deadlineStr)}</p>
  ${donation.scope_description ? `<p style="margin:8px 0 0;color:#475569;"><strong>Items:</strong> ${esc(donation.scope_description)}</p>` : ''}
  ${donation.access_notes ? `<p style="margin:4px 0;color:#475569;"><strong>Access:</strong> ${esc(donation.access_notes)}</p>` : ''}
</div>
${donation.photos && donation.photos.length > 0 ? `<p style="margin:12px 0;"><img src="${esc(donation.photos[0])}" alt="Donation photo" style="max-width:400px;border-radius:8px;" /></p>` : ''}
<p style="margin:12px 0;color:#475569;"><strong>Matched donation companies:</strong> ${matched.length}</p>
<p style="color:#94a3b8;font-size:12px;margin-top:24px;">— EstateSalen Donation Network</p>`
      });
    } catch { /* non-blocking */ }

    return Response.json({
      success: true,
      donation_id,
      companies_found: matched.length,
      notified
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});