import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    // Fetch all agent leads
    const agentLeads = await base44.asServiceRole.entities.PropstreamAgentLead.filter({});
    
    if (agentLeads.length === 0) {
      return Response.json({ 
        message: 'No agent leads found to update',
        updated_count: 0 
      });
    }

    // Fetch all PropStream listings to get territory data
    const listings = await base44.asServiceRole.entities.PropstreamREListing.list('-imported_date', 10000);
    
    // Create a map of property addresses to territory/state/county data
    const propertyDataMap = new Map();
    listings.forEach(listing => {
      if (listing.property_address) {
        // Extract state from territory name if not directly available (e.g., "Cumberland, NJ" -> "NJ")
        let extractedState = listing.brokerage_state || listing.state;
        if (!extractedState && listing.territory_name) {
          const parts = listing.territory_name.split(',').map(p => p.trim());
          if (parts.length > 1 && parts[1].length === 2) {
            extractedState = parts[1];
          }
        }
        
        propertyDataMap.set(listing.property_address.toLowerCase(), {
          territory_name: listing.territory_name || null,
          territory_id: listing.territory_id || null,
          state: listing.state || null,
          county: listing.county || null,
          brokerage_state: extractedState
        });
      }
    });

    let updated_count = 0;

    // Update each agent lead
    for (const agent of agentLeads) {
      if (!agent.property_addresses || agent.property_addresses.length === 0) continue;

      // Get territory data from the first property address
      const firstProperty = agent.property_addresses[0].toLowerCase();
      const propertyData = propertyDataMap.get(firstProperty);

      if (propertyData) {
        const updateData = {
          territory_name: propertyData.territory_name,
          territory_id: propertyData.territory_id,
          state: propertyData.state,
          county: propertyData.county,
          brokerage_state: propertyData.brokerage_state
        };

        await base44.asServiceRole.entities.PropstreamAgentLead.update(agent.id, updateData);
        updated_count++;
      }
    }

    return Response.json({
      message: 'Successfully backfilled territory and state data',
      total_agents: agentLeads.length,
      updated_count: updated_count,
    });

  } catch (error) {
    console.error('Error backfilling agent data:', error);
    return Response.json({ 
      error: 'Failed to backfill agent data',
      details: error.message 
    }, { status: 500 });
  }
});