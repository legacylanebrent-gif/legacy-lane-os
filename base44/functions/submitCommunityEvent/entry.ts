import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      title, description, event_type,
      organizer_name, organizer_email, organizer_phone,
      property_address, start_date, end_date, start_time, end_time,
      website_url, admission_fee, photos
    } = body;

    if (!title || !event_type || !organizer_name || !property_address || !start_date) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Geocode the address using the existing geocodeCity function or Google Maps
    let location = null;
    let geocode_status = 'not_geocoded';
    const fullAddress = [
      property_address.street,
      property_address.city,
      property_address.state,
      property_address.zip
    ].filter(Boolean).join(', ');

    if (fullAddress) {
      try {
        const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
        const geoResp = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${apiKey}`
        );
        const geoData = await geoResp.json();
        if (geoData.status === 'OK' && geoData.results?.[0]?.geometry?.location) {
          location = {
            lat: geoData.results[0].geometry.location.lat,
            lng: geoData.results[0].geometry.location.lng
          };
          geocode_status = 'geocoded';
          if (!property_address.formatted_address) {
            property_address.formatted_address = geoData.results[0].formatted_address;
          }
        } else {
          geocode_status = 'failed';
        }
      } catch (geoErr) {
        console.error('Geocode error:', geoErr);
        geocode_status = 'failed';
      }
    }

    const event = await base44.entities.CommunityEvent.create({
      title,
      description,
      event_type,
      organizer_name,
      organizer_id: user.id,
      organizer_email: organizer_email || user.email,
      organizer_phone,
      property_address,
      location,
      start_date,
      end_date: end_date || start_date,
      start_time,
      end_time,
      website_url,
      admission_fee,
      photos: photos || [],
      status: 'draft',
      submitted_at: new Date().toISOString(),
      geocode_status
    });

    return Response.json({ success: true, event });
  } catch (error) {
    console.error('Error submitting community event:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});