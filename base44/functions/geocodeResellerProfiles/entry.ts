import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

async function geocodeZipOrCity(zip, city, state, apiKey) {
  const query = zip || `${city}, ${state}`;
  if (!query.trim()) return null;

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.status === 'OK' && data.results.length > 0) {
    const { lat, lng } = data.results[0].geometry.location;
    return { lat, lng };
  }
  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'GOOGLE_MAPS_API_KEY not set' }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const limit = body.limit || 100;

    // Fetch profiles that haven't been geocoded yet
    const profiles = await base44.asServiceRole.entities.ResellerProfile.filter({ geocode_status: 'not_geocoded' });
    const toProcess = profiles.slice(0, limit);

    let geocoded = 0, failed = 0, skipped = 0;

    for (const profile of toProcess) {
      if (!profile.zip && !profile.city) {
        skipped++;
        continue;
      }

      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 100));

      const coords = await geocodeZipOrCity(profile.zip, profile.city, profile.state, apiKey);
      if (coords) {
        await base44.asServiceRole.entities.ResellerProfile.update(profile.id, {
          lat: coords.lat,
          lng: coords.lng,
          geocode_status: 'geocoded'
        });
        geocoded++;
      } else {
        await base44.asServiceRole.entities.ResellerProfile.update(profile.id, {
          geocode_status: 'failed'
        });
        failed++;
      }
    }

    return Response.json({
      success: true,
      total_found: profiles.length,
      processed: toProcess.length,
      geocoded,
      failed,
      skipped,
      remaining: Math.max(0, profiles.length - toProcess.length)
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});