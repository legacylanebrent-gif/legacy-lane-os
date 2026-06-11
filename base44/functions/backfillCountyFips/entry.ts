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
    
    let updated_count = 0;
    const updatesToProcess = [];

    // Collect all territories that need FIPS codes
    for (const territory of territories) {
      if (!territory.county_fips && territory.territory_id) {
        // Extract FIPS from territory_id (e.g., 'NJ-34003' -> '34003')
        const parts = territory.territory_id.split('-');
        if (parts.length === 2 && parts[1] && /^\d{5}$/.test(parts[1])) {
          updatesToProcess.push({
            id: territory.id,
            county_fips: parts[1]
          });
        }
      }
    }

    console.log(`[backfillCountyFips] Found ${updatesToProcess.length} territories to update`);

    // Update one at a time with delay to avoid rate limits
    for (let i = 0; i < updatesToProcess.length; i++) {
      const update = updatesToProcess[i];
      try {
        await base44.asServiceRole.entities.HousioTerritory.update(update.id, { county_fips: update.county_fips });
        updated_count++;
        
        // Log progress every 100 records
        if ((i + 1) % 100 === 0) {
          console.log(`[backfillCountyFips] Progress: ${i + 1}/${updatesToProcess.length}`);
        }
      } catch (updateError) {
        console.error(`Failed to update territory ${update.id}:`, updateError.message);
      }
      
      // 100ms delay between updates
      if (i < updatesToProcess.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return Response.json({
      message: 'Successfully backfilled county_fips for HousioTerritories',
      total_territories: territories.length,
      updated_count: updated_count,
    });

  } catch (error) {
    console.error('[backfillCountyFips] Error:', error);
    return Response.json({ 
      error: 'Failed to backfill county FIPS codes',
      details: error.message 
    }, { status: 500 });
  }
});