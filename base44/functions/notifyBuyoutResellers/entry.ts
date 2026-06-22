import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Haversine distance in miles
function distanceMiles(lat1, lng1, lat2, lng2) {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const saleId = body?.sale_id || body?.data?.id || body?.event?.entity_id;
    if (!saleId) return Response.json({ error: 'sale_id required' }, { status: 400 });

    // Load the sale
    const sales = await base44.asServiceRole.entities.EstateSale.filter({ id: saleId });
    const sale = sales[0];
    if (!sale) return Response.json({ error: 'Sale not found' }, { status: 404 });

    // Only buyout events
    if (sale.sale_type !== 'buyout_or_cleanout') {
      return Response.json({ skipped: true, reason: 'not a buyout event' });
    }

    const cfg = sale.buyout_config || {};
    const radiusMiles = cfg.reseller_radius_miles || 25;
    const addr = sale.property_address || {};

    // Geocode the sale location
    let saleLat = sale.location?.lat;
    let saleLng = sale.location?.lng;
    if ((!saleLat || !saleLng) && addr.zip) {
      const mapsKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
      if (mapsKey) {
        try {
          const geoRes = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addr.zip)}&key=${mapsKey}`);
          const geoData = await geoRes.json();
          if (geoData.status === 'OK' && geoData.results[0]) {
            saleLat = geoData.results[0].geometry.location.lat;
            saleLng = geoData.results[0].geometry.location.lng;
          }
        } catch { /* non-blocking */ }
      }
    }

    // Find active resellers with buyout lead notifications enabled
    const allResellers = await base44.asServiceRole.entities.ResellerProfile.filter({
      is_active: true,
      lead_notifications_enabled: true,
      geocode_status: 'geocoded'
    });

    // Filter by radius and buyout lead type
    let targetResellers = allResellers.filter(r => {
      if (!r.lat || !r.lng) return false;
      if (r.lead_types && r.lead_types.length > 0 && !r.lead_types.includes('buyout')) return false;
      return distanceMiles(saleLat, saleLng, r.lat, r.lng) <= radiusMiles;
    });

    // Apply max reseller spots limit
    if (cfg.max_reseller_spots && targetResellers.length > cfg.max_reseller_spots) {
      targetResellers = targetResellers.slice(0, cfg.max_reseller_spots);
    }

    const bidDeadlineStr = cfg.bid_deadline
      ? new Date(cfg.bid_deadline).toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })
      : 'TBD';

    const locationDisplay = `${addr.city || ''}${addr.city && addr.state ? ', ' : ''}${addr.state || ''}${addr.zip ? ' ' + addr.zip : ''}`;
    const modeLabel = cfg.buyout_mode === 'cherry_pick' ? 'Cherry Pick (individual items)' : 'Full Buyout (all or nothing)';

    let emailsSent = 0;
    for (const reseller of targetResellers) {
      try {
        const name = reseller.contact_name || reseller.business_name || 'there';
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: reseller.email,
          subject: `🔨 New Buyout Opportunity Near You: ${sale.title}`,
          body: `Hi ${name},\n\nA new buyout opportunity has just been published near you on EstateSalen!\n\n${sale.title}\nLocation: ${locationDisplay}\nMode: ${modeLabel}\nBid Deadline: ${bidDeadlineStr}\n${cfg.minimum_bid ? 'Minimum Bid: $' + cfg.minimum_bid + '\n' : ''}${cfg.estimated_total_value ? 'Estimated Total Value: $' + cfg.estimated_total_value + '\n' : ''}${cfg.inventory_summary ? 'Inventory: ' + cfg.inventory_summary + '\n' : ''}${cfg.highlights ? 'Highlights: ' + cfg.highlights + '\n' : ''}${cfg.pickup_deadline ? 'Pickup Deadline: ' + cfg.pickup_deadline + '\n' : ''}${cfg.payment_terms ? 'Payment: ' + cfg.payment_terms + '\n' : ''}\nLog in to EstateSalen to submit your bid.\n\n— EstateSalen Buyout Network`,
          html: `<p>Hi ${esc(name)},</p>
<p>A new buyout opportunity has just been published near you on EstateSalen!</p>
<div style="background:#fff7ed;border-left:4px solid #f97316;padding:16px 20px;border-radius:6px;margin:16px 0;">
  <h3 style="margin:0 0 8px;color:#1e293b;">${esc(sale.title)}</h3>
  <p style="margin:4px 0;color:#64748b;">📍 ${esc(locationDisplay)}</p>
  <p style="margin:4px 0;color:#64748b;">📦 ${esc(modeLabel)}</p>
  <p style="margin:4px 0;color:#64748b;">⏰ Bid Deadline: ${esc(bidDeadlineStr)}</p>
  ${cfg.minimum_bid ? `<p style="margin:4px 0;color:#64748b;">💵 Minimum Bid: $${cfg.minimum_bid}</p>` : ''}
  ${cfg.estimated_total_value ? `<p style="margin:4px 0;color:#64748b;">💎 Est. Total Value: $${cfg.estimated_total_value}</p>` : ''}
  ${cfg.inventory_summary ? `<p style="margin:8px 0 0;color:#475569;"><strong>Inventory:</strong> ${esc(cfg.inventory_summary)}</p>` : ''}
  ${cfg.highlights ? `<p style="margin:4px 0;color:#475569;"><strong>Highlights:</strong> ${esc(cfg.highlights)}</p>` : ''}
  ${cfg.pickup_deadline ? `<p style="margin:4px 0;color:#64748b;">🚚 Pickup Deadline: ${esc(cfg.pickup_deadline)}</p>` : ''}
  ${cfg.payment_terms ? `<p style="margin:4px 0;color:#64748b;">💳 Payment: ${esc(cfg.payment_terms)}</p>` : ''}
</div>
<p style="margin:16px 0;"><a href="https://estatesalen.com/MySales" style="background:#f97316;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:600;">Log In to Bid</a></p>
<p style="color:#94a3b8;font-size:12px;margin-top:24px;">— EstateSalen Buyout Network</p>`
        });
        emailsSent++;
      } catch { /* non-blocking */ }
    }

    return Response.json({
      success: true,
      sale_id: saleId,
      resellers_found: targetResellers.length,
      emails_sent: emailsSent,
      radius_miles: radiusMiles
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});