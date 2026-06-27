import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Returns the UTC Date for 00:00:00 today in America/New_York (DST-aware)
function startOfTodayET() {
  const tz = 'America/New_York';
  const now = new Date();
  const etParts = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).formatToParts(now);
  const utcParts = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).formatToParts(now);
  const g = t => etParts.find(p => p.type === t).value;
  const gu = t => utcParts.find(p => p.type === t).value;
  const etMin = ((parseInt(g('hour'), 10) % 24) * 60) + parseInt(g('minute'), 10);
  const utcMin = ((parseInt(gu('hour'), 10) % 24) * 60) + parseInt(gu('minute'), 10);
  let offsetMin = utcMin - etMin;
  if (offsetMin > 720) offsetMin -= 1440;
  if (offsetMin < -720) offsetMin += 1440;
  const etMidnightUTC = Date.UTC(parseInt(g('year'), 10), parseInt(g('month'), 10) - 1, parseInt(g('day'), 10), 0, 0, 0);
  return new Date(etMidnightUTC + offsetMin * 60000);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const isDaily = body.mode === 'daily';

    // Auth: manual full extraction requires an admin; daily automation runs server-side
    if (!isDaily) {
      const user = await base44.auth.me();
      if (!user || user.role !== 'admin') {
        return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
      }
    }

    const batchSize = body.batch_size || 100;
    const batchNumber = body.batch_number || 1;

    // Fetch listings — daily mode only today's imports; full mode all records
    let listings;
    if (isDaily) {
      const since = startOfTodayET();
      listings = [];
      const PAGE = 5000;
      let skip = 0;
      while (true) {
        const batch = await base44.asServiceRole.entities.PropstreamREListing.filter({}, '-created_date', PAGE, skip);
        if (!batch || batch.length === 0) break;
        for (const l of batch) {
          if (new Date(l.created_date) >= since) listings.push(l);
        }
        if (new Date(batch[batch.length - 1].created_date) < since) break;
        if (batch.length < PAGE) break;
        skip += PAGE;
      }
    } else {
      listings = await base44.asServiceRole.entities.PropstreamREListing.list('-imported_date', 100000);
    }

    if (listings.length === 0) {
      return Response.json({
        message: isDaily ? 'No new PropStream listings imported today' : 'No PropStream listings found to process',
        mode: isDaily ? 'daily' : 'full',
        agents_created: 0
      });
    }

    // Extract unique agents using multi-tier matching:
    // 1. Email (most reliable)
    // 2. Agent Name + State + Brokerage (handles missing email scenarios)
    // 3. Agent Name + State (fallback)
    // Phone is NOT used for deduplication to avoid shared office lines.
    const agentMap = new Map();
    const emailToAgentKey = new Map();
    const nameStateBrokerageKey = new Map();

    listings.forEach(listing => {
      const agentName = listing.listing_agent_name;
      const agentEmail = listing.listing_agent_email?.toLowerCase().trim();
      const agentPhone = listing.listing_agent_phone?.replace(/[^0-9]/g, '');
      const agentState = listing.state?.toUpperCase().trim();
      const brokerageName = listing.listing_brokerage?.toUpperCase().trim();
      
      if (!agentName) return;

      // Try to find existing agent using multi-tier matching
      let agentKey = null;
      
      // Priority 1: Match by email (most reliable unique identifier)
      if (agentEmail && emailToAgentKey.has(agentEmail)) {
        agentKey = emailToAgentKey.get(agentEmail);
      }
      // Priority 2: Match by Agent Name + State + Brokerage
      // This handles cases where same agent appears with/without email
      else if (agentState && brokerageName) {
        const compositeKey = `${agentName.toLowerCase()}|${agentState}|${brokerageName}`;
        if (nameStateBrokerageKey.has(compositeKey)) {
          agentKey = nameStateBrokerageKey.get(compositeKey);
          // If this listing has email, map it to existing agent
          if (agentEmail) {
            emailToAgentKey.set(agentEmail, agentKey);
          }
        }
      }
      
      // Create new agent key if no match found
      if (!agentKey) {
        // Use composite key if we have state and brokerage
        if (agentState && brokerageName) {
          agentKey = `composite:${agentName.toLowerCase()}|${agentState}|${brokerageName}`;
          nameStateBrokerageKey.set(`${agentName.toLowerCase()}|${agentState}|${brokerageName}`, agentKey);
        } else if (agentState) {
          agentKey = `state:${agentState}:${agentName.toLowerCase()}`;
        } else {
          agentKey = `name:${agentName.toLowerCase()}`;
        }
        
        // Map email to this key for future listings
        if (agentEmail) {
          emailToAgentKey.set(agentEmail, agentKey);
        }
      }

      const existing = agentMap.get(agentKey);
      
      if (existing) {
      // Update existing agent record - aggregate all listings
      existing.listing_count += 1;
      existing.total_volume += listing.estimated_value || 0;
      // Store full address with city, state, zip, price, and territory
      const fullAddress = [
        listing.property_address,
        listing.city,
        listing.state,
        listing.zip
      ].filter(Boolean).join(', ');
      if (fullAddress) {
        const price = listing.list_price || listing.estimated_value || 0;
        const territory = listing.territory_name || listing.county ? `${listing.territory_name || listing.county}, ${listing.state}` : '';
        const addressWithPriceAndTerritory = `${fullAddress} - $${price.toLocaleString()}${territory ? ` (${territory})` : ''}`;
        if (!existing.property_addresses.includes(addressWithPriceAndTerritory)) {
          existing.property_addresses.push(addressWithPriceAndTerritory);
        }
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
      const price = listing.list_price || listing.estimated_value || 0;
      const territory = listing.territory_name || listing.county ? `${listing.territory_name || listing.county}, ${listing.state}` : '';
      const addressWithPriceAndTerritory = fullAddress ? `${fullAddress} - $${price.toLocaleString()}${territory ? ` (${territory})` : ''}` : '';
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
        property_addresses: addressWithPriceAndTerritory ? [addressWithPriceAndTerritory] : [],
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
        agents_created: 0,
        has_more_batches: false
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
    
    // Daily mode processes all of today's agents in one pass; full mode batches
    const startIndex = isDaily ? 0 : (batchNumber - 1) * batchSize;
    const endIndex = isDaily ? agentsToCreate.length : Math.min(startIndex + batchSize, agentsToCreate.length);
    const batchToProcess = agentsToCreate.slice(startIndex, endIndex);
    
    // Separate creates and updates for bulk operations
    const creates = [];
    const updates = [];
    
    batchToProcess.forEach(agentData => {
      const key = `${agentData.agent_name || ''}-${agentData.agent_email || ''}`.toLowerCase();
      const existingId = existingAgentMap.get(key);

      if (existingId) {
        updates.push({
          id: existingId,
          data: {
            listing_count: agentData.listing_count,
            total_volume: agentData.total_volume,
            property_addresses: agentData.property_addresses,
            territory_name: agentData.territory_name,
            territory_id: agentData.territory_id,
            state: agentData.state,
            county: agentData.county,
            brokerage_name: agentData.brokerage_name,
            brokerage_state: agentData.brokerage_state,
          }
        });
      } else {
        creates.push(agentData);
      }
    });
    
    // Execute bulk operations with retry logic for rate limits
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    const maxRetries = 3;
    
    // Bulk create
    if (creates.length > 0) {
      let retries = 0;
      while (retries < maxRetries) {
        try {
          await base44.asServiceRole.entities.PropstreamAgentLead.bulkCreate(creates);
          created = creates.length;
          break;
        } catch (error) {
          if (error.status === 429 && retries < maxRetries - 1) {
            retries++;
            await delay(1000 * Math.pow(2, retries)); // Exponential backoff
          } else {
            throw error;
          }
        }
      }
    }
    
    // Bulk update - process in smaller chunks of 20 to avoid rate limits
    if (updates.length > 0) {
      const chunkSize = 20;
      for (let i = 0; i < updates.length; i += chunkSize) {
        const chunk = updates.slice(i, i + chunkSize);
        let retries = 0;
        while (retries < maxRetries) {
          try {
            for (const update of chunk) {
              await base44.asServiceRole.entities.PropstreamAgentLead.update(update.id, update.data);
            }
            updated += chunk.length;
            break;
          } catch (error) {
            if (error.status === 429 && retries < maxRetries - 1) {
              retries++;
              await delay(2000 * Math.pow(2, retries));
            } else {
              throw error;
            }
          }
        }
      }
    }

    // Check if there are more batches
    const hasMoreBatches = endIndex < agentsToCreate.length;

    return Response.json({
      message: isDaily
        ? `Daily extraction complete: processed ${listings.length} listing(s) imported today`
        : `Successfully processed batch ${batchNumber} of PropStream agent leads`,
      mode: isDaily ? 'daily' : 'full',
      total_listings_processed: listings.length,
      unique_agents_found: agentsToCreate.length,
      agents_created: created,
      agents_updated: updated,
      batch_number: batchNumber,
      batch_size: batchSize,
      has_more_batches: hasMoreBatches,
      total_batches: Math.ceil(agentsToCreate.length / batchSize)
    });

  } catch (error) {
    console.error('Error extracting agent leads:', error);
    return Response.json({ 
      error: 'Failed to extract agent leads',
      details: error.message 
    }, { status: 500 });
  }
});