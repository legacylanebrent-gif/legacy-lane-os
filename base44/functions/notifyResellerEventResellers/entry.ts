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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { event_id, include_sms } = await req.json();
    if (!event_id) return Response.json({ error: 'event_id required' }, { status: 400 });

    // Fetch the event
    const events = await base44.asServiceRole.entities.ResellerPackupEvent.filter({ id: event_id });
    const event = events[0];
    if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });

    // Geocode the event address to get lat/lng for radius matching
    let eventLat = null, eventLng = null;
    const mapsKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (mapsKey && event.zip) {
      const geoRes = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(event.zip)}&key=${mapsKey}`);
      const geoData = await geoRes.json();
      if (geoData.status === 'OK' && geoData.results[0]) {
        eventLat = geoData.results[0].geometry.location.lat;
        eventLng = geoData.results[0].geometry.location.lng;
      }
    }

    const radiusMiles = event.reseller_invite_radius_miles || 25;

    // Fetch all active geocoded resellers with notifications enabled
    const allResellers = await base44.asServiceRole.entities.ResellerProfile.filter({
      is_active: true,
      lead_notifications_enabled: true,
      geocode_status: 'geocoded'
    });

    // Filter by radius if we have coordinates
    let targetResellers = allResellers;
    if (eventLat && eventLng) {
      targetResellers = allResellers.filter(r => {
        if (!r.lat || !r.lng) return false;
        return distanceMiles(eventLat, eventLng, r.lat, r.lng) <= radiusMiles;
      });
    }

    const eventDateStr = event.event_date
      ? new Date(event.event_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
      : 'TBD';

    const locationDisplay = event.address_visibility === 'full_address'
      ? `${event.address}, ${event.city}, ${event.state} ${event.zip}`
      : event.address_visibility === 'zip_only'
        ? `ZIP: ${event.zip}`
        : `${event.city}, ${event.state}`;

    const eventTypeLabels = {
      free_giveaway: 'Free Giveaway',
      low_cost_purchase: 'Low-Cost Item Purchase',
      fill_a_bag: 'Fill-A-Bag',
      fill_a_car: 'Fill-A-Car',
      fill_a_trailer: 'Fill-A-Trailer',
      bundle_buyout: 'Bundle Buyout',
    };

    const eventTypeLabel = eventTypeLabels[event.event_type] || event.event_type;

    let emailsSent = 0, smsSent = 0, smsErrors = 0;
    const SMS_COST_PER = 0.05;

    // Twilio config (optional — SMS only runs if secrets are set)
    const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioFrom = Deno.env.get('TWILIO_FROM_NUMBER');
    const twilioReady = !!(twilioSid && twilioToken && twilioFrom);

    for (const reseller of targetResellers) {
      // --- Free: Email notification ---
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: reseller.email,
          subject: `🗂️ New Reseller Event Near You: ${event.event_title}`,
          body: `Hi ${reseller.contact_name || reseller.business_name},\n\nA new reseller pack-up event has just been published near you!\n\nEvent: ${event.event_title}\nType: ${eventTypeLabel}\nDate: ${eventDateStr}\nTime: ${event.start_time || 'TBD'}${event.end_time ? ' – ' + event.end_time : ''}\nLocation: ${locationDisplay}\n\n${event.event_notes ? 'Notes: ' + event.event_notes + '\n\n' : ''}Register now to claim your spot.\n\n—EstateSalen Reseller Network`
        });
        emailsSent++;
      } catch { /* non-blocking */ }

      // --- Paid: SMS via Twilio (only if opted-in and Twilio is configured) ---
      if (include_sms && twilioReady && reseller.phone) {
        try {
          const phone = reseller.phone.replace(/\D/g, '');
          if (phone.length >= 10) {
            const e164 = phone.startsWith('1') ? `+${phone}` : `+1${phone}`;
            const smsBody = `EstateSalen: New Reseller Event — ${event.event_title} (${eventTypeLabel}) on ${eventDateStr} near ${event.city}, ${event.state}. Log in to register.`;
            const authHeader = 'Basic ' + btoa(`${twilioSid}:${twilioToken}`);
            const twilioRes = await fetch(
              `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
              {
                method: 'POST',
                headers: { 'Authorization': authHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ From: twilioFrom, To: e164, Body: smsBody })
              }
            );
            if (twilioRes.ok) smsSent++;
            else smsErrors++;
          }
        } catch { smsErrors++; }
      }
    }

    const smsCost = smsSent * SMS_COST_PER;

    return Response.json({
      success: true,
      resellers_found: targetResellers.length,
      emails_sent: emailsSent,
      sms_sent: smsSent,
      sms_errors: smsErrors,
      sms_cost: smsCost,
      radius_miles: radiusMiles,
      twilio_configured: twilioReady,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});