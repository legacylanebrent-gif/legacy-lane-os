import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    // Fetch all PropstreamREListing records (no limit)
    const listings = await base44.asServiceRole.entities.PropstreamREListing.list('-imported_date', 100000);
    
    if (listings.length === 0) {
      return Response.json({ 
        message: 'No PropStream listings found to process',
        agents_created: 0 
      });
    }

    // Extract unique agents from listings using email OR phone as unique identifier
    const agentMap = new Map();
    const emailToAgentKey = new Map();
    const phoneToAgentKey = new Map();

    listings.forEach(listing => {
      const agentName = listing.listing_agent_name;
      const agentEmail = listing.listing_agent_email?.toLowerCase().trim();
      const agentPhone = listing.listing_agent_phone?.replace(/[^0-9]/g, '');
      
      if (!agentName) return;

      // Try to find existing agent by email or phone
      let agentKey = null;
      
      // Priority 1: Match by email
      if (agentEmail && emailToAgentKey.has(agentEmail)) {
        agentKey = emailToAgentKey.get(agentEmail);
      }
      // Priority 2: Match by phone
      else if (agentPhone && phoneToAgentKey.has(agentPhone)) {
        agentKey = phoneToAgentKey.get(agentPhone);
        // If this listing has an email, also map it
        if (agentEmail) emailToAgentKey.set(agentEmail, agentKey);
      }
      // Priority 3: Create new agent using name-email or name-phone
      else {
        agentKey = agentEmail 
          ? `email:${agentEmail}`
          : agentPhone 
            ? `phone:${agentPhone}`
            : `name:${agentName.toLowerCase()}`;
        
        if (agentEmail) emailToAgentKey.set(agentEmail, agentKey);
        if (agentPhone) phoneToAgentKey.set(agentPhone, agentKey);
      }

      const existing = agentMap.get(agentKey);
      
      if (existing) {
      // Update existing agent record - aggregate all listings
      existing.listing_count += 1;
      existing.total_volume += listing.estimated_value || 0;
      // Store full address with city, state, zip
      const fullAddress = [
        listing.property_address,
        listing.city,
        listing.state,
        listing.zip
      ].filter(Boolean).join(', ');
      if (fullAddress && !existing.property_addresses.includes(fullAddress)) {
        existing.property_addresses.push(fullAddress);
      }
      // Update contact info if we have better data
      if (!existing.agent_email && agentEmail) existing.agent_email = agentEmail;
      if (!existing.agent_phone && agentPhone) existing.agent_phone = agentPhone;
      if (!existing.agent_license && listing.listing_agent_license) existing.agent_license = listing.listing_agent_license;
      if (!existing.brokerage_name && listing.listing_brokerage) existing.brokerage_name = listing.listing_brokerage;
      } else {
      // Create new agent record
      const fullAddress = [
        listing.property_address,
        listing.city,
        listing.state,
        listing.zip
      ].filter(Boolean).join(', ');
      agentMap.set(agentKey, {
        agent_name: agentName,
        agent_email: agentEmail || null,
        agent_phone: agentPhone || null,
        agent_license: listing.listing_agent_license || null,
        brokerage_name: listing.listing_brokerage || null,
        brokerage_state: listing.brokerage_state || listing.state || null,
        territory_name: listing.territory_name || null,
        territory_id: listing.territory_id || null,
        state: listing.state || null,
        county: listing.county || null,
        listing_count: 1,
        total_volume: listing.estimated_value || 0,
        property_addresses: fullAddress ? [fullAddress] : [],
        lead_status: 'new',
        priority: 'medium',
        lead_score: 0,
        source_batch_id: listing.import_batch_id,
        last_contact_date: null,
        next_follow_up: null,
        notes: null,
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
    const BATCH_SIZE = 100;

    // Process agents in batches to avoid rate limits
    for (let i = 0; i < agentsToCreate.length; i += BATCH_SIZE) {
      const batch = agentsToCreate.slice(i, i + BATCH_SIZE);
      console.log(`Processing agent batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(agentsToCreate.length / BATCH_SIZE)} (${batch.length} agents)`);

      for (const agentData of batch) {
        const key = `${agentData.agent_name || ''}-${agentData.agent_email || ''}`.toLowerCase();
        const existingId = existingAgentMap.get(key);

        if (existingId) {
          // Update existing agent
          await base44.asServiceRole.entities.PropstreamAgentLead.update(existingId, {
            listing_count: agentData.listing_count,
            total_volume: agentData.total_volume,
            property_addresses: agentData.property_addresses,
            territory_name: agentData.territory_name,
            territory_id: agentData.territory_id,
            state: agentData.state,
            county: agentData.county,
            brokerage_name: agentData.brokerage_name,
            brokerage_state: agentData.brokerage_state,
          });
          updated++;
        } else {
          // Create new agent
          await base44.asServiceRole.entities.PropstreamAgentLead.create(agentData);
          created++;
        }
      }

      // Small delay between batches to avoid rate limits
      if (i + BATCH_SIZE < agentsToCreate.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
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