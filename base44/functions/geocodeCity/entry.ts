import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const { city, state } = await req.json();
    if (!city || !state) return Response.json({ error: 'city and state are required' }, { status: 400 });

    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(city + ', ' + state)}&components=country:US&key=${apiKey}`
    );
    const data = await res.json();

    if (data.status !== 'OK' || !data.results?.[0]) {
      return Response.json({ error: 'No results', status: data.status }, { status: 404 });
    }

    const { lat, lng } = data.results[0].geometry.location;
    return Response.json({ lat, lng, formatted: data.results[0].formatted_address });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});