import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { origin, destination } = await req.json();
    if (!origin || !destination) {
      return Response.json({ error: 'origin and destination are required' }, { status: 400 });
    }

    // Use OpenStreetMap Nominatim for geocoding (free, no key required)
    const geocode = async (address) => {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
      const res = await fetch(url, { headers: { 'User-Agent': 'LegacyLaneOS/1.0' } });
      const data = await res.json();
      if (!data.length) throw new Error(`Location not found: ${address}`);
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), display_name: data[0].display_name };
    };

    const [originGeo, destGeo] = await Promise.all([geocode(origin), geocode(destination)]);

    // Use OSRM (OpenStreetMap routing) for driving distance — no key required
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${originGeo.lng},${originGeo.lat};${destGeo.lng},${destGeo.lat}?overview=false`;
    const osrmRes = await fetch(osrmUrl);
    const osrmData = await osrmRes.json();

    if (osrmData.code !== 'Ok' || !osrmData.routes?.length) {
      return Response.json({ error: 'Could not calculate driving route' }, { status: 400 });
    }

    const route = osrmData.routes[0];
    const miles = Math.round((route.distance / 1609.344) * 10) / 10; // meters → miles
    const durationMin = Math.round(route.duration / 60);

    return Response.json({
      miles,
      distance_text: `${miles} mi`,
      duration_text: durationMin >= 60
        ? `${Math.floor(durationMin / 60)}h ${durationMin % 60}min`
        : `${durationMin} min`,
      origin_address: originGeo.display_name,
      destination_address: destGeo.display_name,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});