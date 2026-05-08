import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const EARTH_RADIUS_MILES = 3959;

function haversineDistance(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_MILES * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Geocode a zip code using Google Maps API
async function geocodeZip(zip, apiKey) {
  const res = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${zip}&key=${apiKey}`
  );
  const data = await res.json();
  if (data.results?.[0]?.geometry?.location) {
    return data.results[0].geometry.location; // { lat, lng }
  }
  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json().catch(() => ({}));
    const { sale_id } = payload;

    // Use service role for this automation-triggered function
    const sale = sale_id
      ? (await base44.asServiceRole.entities.EstateSale.list()).find(s => s.id === sale_id)
      : null;

    if (!sale) {
      return Response.json({ error: 'Sale not found', sale_id }, { status: 400 });
    }

    // Only process upcoming/active sales
    if (!['upcoming', 'active'].includes(sale.status)) {
      return Response.json({ skipped: true, reason: 'sale not upcoming/active' });
    }

    const googleApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY') || '';

    // Get sale location
    const saleLat = sale.location?.lat;
    const saleLng = sale.location?.lng;

    // Get first sale date
    const saleStartDate = sale.sale_dates?.[0]?.date;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Load all user notification prefs that have alerts enabled
    const allPrefs = await base44.asServiceRole.entities.NotificationPreference.filter({
      sale_alert_enabled: true
    });

    if (allPrefs.length === 0) {
      return Response.json({ sent: 0, reason: 'no users with alerts enabled' });
    }

    // Load all users for email lookup
    const allUsers = await base44.asServiceRole.entities.User.list();
    const userMap = {};
    allUsers.forEach(u => { userMap[u.id] = u; });

    let sent = 0;
    let skipped = 0;

    for (const pref of allPrefs) {
      const user = userMap[pref.user_id];
      if (!user?.email) { skipped++; continue; }

      // --- Check category match (empty = all categories) ---
      if (pref.sale_alert_categories?.length > 0 && sale.categories?.length > 0) {
        const overlap = pref.sale_alert_categories.some(c =>
          sale.categories.map(sc => sc.toLowerCase()).includes(c.toLowerCase())
        );
        if (!overlap) { skipped++; continue; }
      }

      // --- Check followed-only filter ---
      if (pref.sale_alert_followed_only) {
        const follows = await base44.asServiceRole.entities.CompanyFollow.filter({
          consumer_user_id: pref.user_id,
          operator_id: sale.operator_id
        });
        if (follows.length === 0) { skipped++; continue; }
      }

      // --- Check days notice ---
      if (pref.sale_alert_min_days_notice > 0 && saleStartDate) {
        const saleDate = new Date(saleStartDate + 'T00:00:00');
        const daysAway = Math.ceil((saleDate - today) / (1000 * 60 * 60 * 24));
        if (daysAway < pref.sale_alert_min_days_notice) { skipped++; continue; }
      }

      // --- Check radius ---
      if (pref.sale_alert_radius_miles > 0) {
        let centerLat = pref.sale_alert_lat;
        let centerLng = pref.sale_alert_lng;

        // Fall back to geocoding the saved ZIP
        if (!centerLat && pref.sale_alert_zip && googleApiKey) {
          const geo = await geocodeZip(pref.sale_alert_zip, googleApiKey);
          if (geo) {
            centerLat = geo.lat;
            centerLng = geo.lng;
            // Persist geocoded coords back so we don't re-geocode every time
            await base44.asServiceRole.entities.NotificationPreference.update(pref.id, {
              sale_alert_lat: geo.lat,
              sale_alert_lng: geo.lng
            });
          }
        }

        if (centerLat && centerLng && saleLat && saleLng) {
          const dist = haversineDistance(centerLat, centerLng, saleLat, saleLng);
          if (dist > pref.sale_alert_radius_miles) { skipped++; continue; }
        }
        // If we can't determine location, let it through rather than block
      }

      // --- Check digest frequency (instant only here; digests handled by scheduler) ---
      if (pref.sale_alert_frequency !== 'instant') {
        skipped++;
        continue; // Digest emails are sent by a separate scheduled function
      }

      // --- Send email ---
      if (pref.sale_alert_email) {
        const saleAddress = sale.property_address
          ? `${sale.property_address.city}, ${sale.property_address.state}`
          : 'Location TBA';
        const saleDates = (sale.sale_dates || [])
          .map(d => {
            const parts = [d.date];
            if (d.start_time) parts.push(`${d.start_time}–${d.end_time || ''}`);
            return parts.join(' ');
          })
          .join(', ');

        const body = `
<h2 style="color:#1e293b;font-family:Georgia,serif;">New Estate Sale Near You!</h2>
<p style="color:#475569;">Hi ${user.full_name || 'there'},</p>
<p style="color:#475569;">A new estate sale matching your interests has just been posted:</p>

<div style="background:#f8fafc;border-left:4px solid #f97316;padding:16px 20px;border-radius:6px;margin:16px 0;">
  <h3 style="margin:0 0 8px;color:#1e293b;">${sale.title}</h3>
  <p style="margin:4px 0;color:#64748b;">📍 ${saleAddress}</p>
  ${saleDates ? `<p style="margin:4px 0;color:#64748b;">📅 ${saleDates}</p>` : ''}
  ${sale.categories?.length ? `<p style="margin:4px 0;color:#64748b;">🏷️ ${sale.categories.join(', ')}</p>` : ''}
  ${sale.description ? `<p style="margin:12px 0 0;color:#475569;">${sale.description.substring(0, 200)}${sale.description.length > 200 ? '...' : ''}</p>` : ''}
</div>

<p style="color:#475569;">
  <a href="https://estatesalen.com/EstateSaleDetail?id=${sale.id}" style="background:#f97316;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:600;">View Sale Details</a>
</p>

<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
<p style="color:#94a3b8;font-size:12px;">
  You're receiving this because you have sale alerts enabled. 
  <a href="https://estatesalen.com/NotificationSettings" style="color:#f97316;">Manage your alert preferences</a>
</p>
        `.trim();

        await base44.asServiceRole.integrations.Core.SendEmail({
          to: user.email,
          subject: `🏡 New Sale Near You: ${sale.title}`,
          body
        });
        sent++;

        // Update last sent timestamp
        await base44.asServiceRole.entities.NotificationPreference.update(pref.id, {
          sale_alert_last_sent: new Date().toISOString()
        });
      }

      // --- In-app notification ---
      if (pref.sale_alert_inapp) {
        await base44.asServiceRole.entities.Notification.create({
          user_id: pref.user_id,
          type: 'sale_update',
          title: 'New Sale Near You',
          message: `${sale.title} was just posted in ${sale.property_address?.city || 'your area'}`,
          link: `/EstateSaleDetail?id=${sale.id}`,
          read: false
        });
      }
    }

    return Response.json({ sent, skipped, sale_id: sale.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});