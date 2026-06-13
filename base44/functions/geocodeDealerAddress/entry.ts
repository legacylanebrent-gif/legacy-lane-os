import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { street, city, state, zip } = await req.json();
    if (!city || !state) return Response.json({ error: 'city and state are required' }, { status: 400 });

    const parts = [street, city, state, zip].filter(Boolean).join(', ');
    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');

    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(parts)}&components=country:US&key=${apiKey}`
    );
    const data = await res.json();

    if (data.status !== 'OK' || !data.results?.[0]) {
      return Response.json({ error: 'No results', status: data.status }, { status: 404 });
    }

    const { lat, lng } = data.results[0].geometry.location;
    const formatted = data.results[0].formatted_address;

    // Save geocoded location to user profile
    await base44.auth.updateMe({
      store_address_geocoded: { lat, lng, formatted }
    });

    return Response.json({ lat, lng, formatted, saved: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});