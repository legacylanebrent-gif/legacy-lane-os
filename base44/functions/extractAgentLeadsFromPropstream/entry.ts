import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    // Fetch all PropstreamREListing records
    const listings = await base44.asServiceRole.entities.PropstreamREListing.list('-imported_date', 1000);
    
    if (listings.length === 0) {
      return Response.json({ 
        message: 'No PropStream listings found to process',
        agents_created: 0 
      });
    }

    // Extract unique agents from listings
    const agentMap = new Map();

    listings.forEach(listing => {
      // Extract agent data from listing
      const agentKey = `${listing.listing_agent_name || ''}-${listing.listing_agent_email || ''}`.toLowerCase();
      
      if (!agentKey || !listing.listing_agent_name) return;

      const existing = agentMap.get(agentKey);
      
      if (existing) {
        // Update existing agent record
        existing.listing_count += 1;
        existing.total_volume += listing.estimated_value || 0;
        if (listing.property_address) {
          existing.property_addresses.push(listing.property_address);
        }
        if (listing.id) {
          existing.propstream_listing_ids.push(listing.id);
        }
      } else {
        // Create new agent record
        agentMap.set(agentKey, {
          agent_name: listing.listing_agent_name,
          agent_email: listing.listing_agent_email,
          agent_phone: listing.listing_agent_phone,
          agent_license: listing.listing_agent_license,
          brokerage_name: listing.brokerage_name,
          brokerage_address: listing.brokerage_address,
          brokerage_city: listing.brokerage_city,
          brokerage_state: listing.brokerage_state,
          brokerage_zip: listing.brokerage_zip,
          territory_name: listing.territory_name || null,
          territory_id: listing.territory_id || null,
          state: listing.state || null,
          county: listing.county || null,
          listing_count: 1,
          total_volume: listing.estimated_value || 0,
          property_addresses: listing.property_address ? [listing.property_address] : [],
          propstream_listing_ids: listing.id ? [listing.id] : [],
          lead_status: 'new',
          priority: 'medium',
          lead_score: 0,
          source_batch_id: listing.import_batch_id,
          first_seen_date: listing.imported_date || new Date().toISOString(),
          last_updated_date: new Date().toISOString(),
        });
      }
    });

    // Bulk create or update agent leads
    const agentsToCreate = Array.from(agentMap.values());
    
    if (agentsToCreate.length === 0) {
      return Response.json({ 
        message: 'No valid agent data found in listings',
        agents_created: 0 
      });
    }

    // Check for existing agents and update instead of create
    const existingAgents = await base44.asServiceRole.entities.PropstreamAgentLead.filter({});
    const existingAgentMap = new Map();
    
    existingAgents.forEach(agent => {
      const key = `${agent.agent_name || ''}-${agent.agent_email || ''}`.toLowerCase();
      existingAgentMap.set(key, agent.id);
    });

    let created = 0;
    let updated = 0;

    for (const agentData of agentsToCreate) {
      const key = `${agentData.agent_name || ''}-${agentData.agent_email || ''}`.toLowerCase();
      const existingId = existingAgentMap.get(key);

      if (existingId) {
        // Update existing agent
        await base44.asServiceRole.entities.PropstreamAgentLead.update(existingId, {
          listing_count: agentData.listing_count,
          total_volume: agentData.total_volume,
          property_addresses: agentData.property_addresses,
          propstream_listing_ids: agentData.propstream_listing_ids,
          territory_name: agentData.territory_name,
          territory_id: agentData.territory_id,
          state: agentData.state,
          county: agentData.county,
          brokerage_state: agentData.brokerage_state,
          last_updated_date: new Date().toISOString(),
        });
        updated++;
      } else {
        // Create new agent
        await base44.asServiceRole.entities.PropstreamAgentLead.create(agentData);
        created++;
      }
    }

    return Response.json({
      message: 'Successfully processed PropStream agent leads',
      total_listings_processed: listings.length,
      unique_agents_found: agentsToCreate.length,
      agents_created: created,
      agents_updated: updated,
    });

  } catch (error) {
    console.error('Error extracting agent leads:', error);
    return Response.json({ 
      error: 'Failed to extract agent leads',
      details: error.message 
    }, { status: 500 });
  }
});