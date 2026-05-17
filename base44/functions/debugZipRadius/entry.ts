import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function haversine(lat1, lon1, lat2, lon2) {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Geocode 07748 via Google Maps
    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    const geoRes = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=07748&components=country:US&key=${apiKey}`);
    const geoData = await geoRes.json();
    const center = geoData.results?.[0]?.geometry?.location;

    if (!center) return Response.json({ error: 'Could not geocode ZIP', geoData });

    // Fetch all NJ operators
    const [leads, netOps, orgOps] = await Promise.all([
      base44.asServiceRole.entities.FutureOperatorLead.filter({ state: 'NJ' }, '-created_date', 1000).catch(() => []),
      base44.asServiceRole.entities.FutureEstateOperator.filter({ state: 'NJ' }, '-created_date', 1000).catch(() => []),
      base44.asServiceRole.entities.EstatesalesOrgOperator.filter({ base_state: 'NJ' }, '-created_date', 1000).catch(() => []),
    ]);

    const allOps = [...(leads || []), ...(netOps || []), ...(orgOps || [])];

    const totalCount = allOps.length;
    const withCoords = allOps.filter(op => op.lat && op.lng);
    const withoutCoords = allOps.filter(op => !op.lat || !op.lng);

    const within10 = withCoords.filter(op => haversine(center.lat, center.lng, op.lat, op.lng) <= 10);
    const within25 = withCoords.filter(op => haversine(center.lat, center.lng, op.lat, op.lng) <= 25);
    const within50 = withCoords.filter(op => haversine(center.lat, center.lng, op.lat, op.lng) <= 50);

    return Response.json({
      zip: '07748',
      geocoded_to: { lat: center.lat, lng: center.lng, address: geoData.results[0].formatted_address },
      nj_total_operators: totalCount,
      nj_with_coords: withCoords.length,
      nj_without_coords: withoutCoords.length,
      within_10_miles: within10.length,
      within_25_miles: within25.length,
      within_50_miles: within50.length,
      sample_within_10: within10.slice(0, 5).map(op => ({
        name: op.company_name,
        city: op.geocoded_city || op.city,
        lat: op.lat,
        lng: op.lng,
        dist_miles: Math.round(haversine(center.lat, center.lng, op.lat, op.lng) * 10) / 10,
      })),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});