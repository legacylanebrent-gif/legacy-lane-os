import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'GOOGLE_MAPS_API_KEY not set' }, { status: 500 });
    }

    // Fetch all vendors that need geocoding
    const allVendors = await base44.asServiceRole.entities.Vendor.list();
    const toGeocode = allVendors.filter(v => {
      const d = v.data || v;
      return !d.geocode_status || d.geocode_status === 'not_geocoded' || d.geocode_status === 'failed';
    });

    let geocoded = 0;
    let failed = 0;
    let skipped = 0;

    for (const vendor of toGeocode) {
      const data = vendor.data || vendor;
      const serviceAreas = data.service_areas || [];
      
      if (serviceAreas.length === 0) {
        await base44.asServiceRole.entities.Vendor.update(vendor.id, {
          geocode_status: 'skipped',
          geocode_last_run: new Date().toISOString()
        });
        skipped++;
        continue;
      }

      // Try geocode the first zip-like entry, then fall back to first city-like entry
      let geocodeTerm = null;
      for (const area of serviceAreas) {
        if (/^\d{5}$/.test(area.trim())) {
          geocodeTerm = area.trim();
          break;
        }
      }
      if (!geocodeTerm) {
        geocodeTerm = serviceAreas[0]; // use first non-zip term
      }

      try {
        const isZip = /^\d{5}$/.test(geocodeTerm);
        const addressParam = isZip
          ? `address=${encodeURIComponent(geocodeTerm)}&components=country:US`
          : `address=${encodeURIComponent(geocodeTerm + ', USA')}`;
        
        const geoRes = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?${addressParam}&key=${apiKey}`
        );
        const geoData = await geoRes.json();

        if (geoData.status === 'OK' && geoData.results?.[0]) {
          const { lat, lng } = geoData.results[0].geometry.location;
          await base44.asServiceRole.entities.Vendor.update(vendor.id, {
            lat,
            lng,
            geocoded_address: geoData.results[0].formatted_address,
            geocode_status: 'geocoded',
            geocode_last_run: new Date().toISOString()
          });
          geocoded++;
        } else {
          await base44.asServiceRole.entities.Vendor.update(vendor.id, {
            geocode_status: 'failed',
            geocode_last_run: new Date().toISOString()
          });
          failed++;
        }
      } catch (err) {
        await base44.asServiceRole.entities.Vendor.update(vendor.id, {
          geocode_status: 'failed',
          geocode_last_run: new Date().toISOString()
        });
        failed++;
      }

      // Small delay to avoid hitting Google Maps rate limits
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    return Response.json({
      total: toGeocode.length,
      geocoded,
      failed,
      skipped,
      message: `Geocoded ${geocoded} vendors, ${failed} failed, ${skipped} skipped`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});