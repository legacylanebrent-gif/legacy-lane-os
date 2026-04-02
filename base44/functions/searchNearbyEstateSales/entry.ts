import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { lat, lng, radius = 50000 } = await req.json();

        if (!lat || !lng) {
            return Response.json({ error: 'Latitude and longitude required' }, { status: 400 });
        }

        // Get estate sales from database
        const estateSales = await base44.entities.EstateSale.list();

        // Filter by distance using Haversine formula
        const nearbyEstates = estateSales.filter(estate => {
            if (!estate.location?.lat || !estate.location?.lng) return false;
            
            const distance = calculateDistance(
                lat, lng,
                estate.location.lat, estate.location.lng
            );
            
            return distance <= radius;
        }).map(estate => ({
            ...estate,
            distance: calculateDistance(lat, lng, estate.location.lat, estate.location.lng)
        })).sort((a, b) => a.distance - b.distance);

        return Response.json({ 
            success: true,
            estates: nearbyEstates 
        });
    } catch (error) {
        return Response.json({ 
            error: error.message,
            success: false 
        }, { status: 500 });
    }
});

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
}