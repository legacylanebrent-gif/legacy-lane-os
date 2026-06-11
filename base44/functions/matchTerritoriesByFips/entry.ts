import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    // Fetch all HousioTerritories
    const territories = await base44.asServiceRole.entities.HousioTerritory.filter({});
    
    // Create a map of FIPS to territory_id
    const fipsToTerritoryMap = new Map();
    territories.forEach(territory => {
      // Extract FIPS from territory_id (e.g., 'NJ-34003' -> '34003')
      if (territory.territory_id) {
        const fips = territory.territory_id.split('-')[1];
        if (fips) {
          fipsToTerritoryMap.set(fips, {
            territory_id: territory.territory_id,
            territory_name: `${territory.county || 'Unknown'} County`,
            county: territory.county,
            state: territory.state
          });
        }
      }
      // Also map by county name for fallback
      if (territory.county && territory.state) {
        const countyKey = `${territory.state}-${territory.county}`.toLowerCase();
        if (!fipsToTerritoryMap.has(countyKey)) {
          fipsToTerritoryMap.set(countyKey, {
            territory_id: territory.territory_id,
            territory_name: territory.county,
            county: territory.county,
            state: territory.state
          });
        }
      }
    });

    console.log(`[matchTerritoriesByFips] Built map with ${fipsToTerritoryMap.size} territory mappings`);

    // Fetch all PropStream listings
    const listings = await base44.asServiceRole.entities.PropstreamREListing.filter({});
    
    let updated_count = 0;
    let not_matched_count = 0;

    // Update each listing with territory match
    for (const listing of listings) {
      let territoryMatch = null;

      // Try to match by FIPS code first
      if (listing.fips_code) {
        territoryMatch = fipsToTerritoryMap.get(listing.fips_code);
      }

      // Fallback: match by state-county
      if (!territoryMatch && listing.state && listing.county) {
        const countyKey = `${listing.state}-${listing.county}`.toLowerCase();
        territoryMatch = fipsToTerritoryMap.get(countyKey);
      }

      if (territoryMatch) {
        await base44.asServiceRole.entities.PropstreamREListing.update(listing.id, {
          territory_id: territoryMatch.territory_id,
          territory_name: territoryMatch.territory_name,
          county: territoryMatch.county || listing.county,
          state: territoryMatch.state || listing.state
        });
        updated_count++;
      } else {
        not_matched_count++;
      }
    }

    return Response.json({
      message: 'Successfully matched listings to territories',
      total_listings: listings.length,
      matched_count: updated_count,
      not_matched_count: not_matched_count,
      territories_available: territories.length,
    });

  } catch (error) {
    console.error('[matchTerritoriesByFips] Error:', error);
    return Response.json({ 
      error: 'Failed to match territories',
      details: error.message 
    }, { status: 500 });
  }
});