import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Allow admin to pass an operator_id override for testing
    let body = {};
    try { body = await req.clone().json(); } catch (_) {}
    const operatorId = (user.role === 'admin' && body.operator_id) ? body.operator_id : user.id;

    // 1. Load operator territory profile
    const profiles = await base44.asServiceRole.entities.OperatorTerritoryProfile.filter({ operator_id: operatorId });
    if (!profiles || profiles.length === 0) {
      return Response.json({ error: 'No territory profile found. Please create one first.' }, { status: 404 });
    }
    const territory = profiles[0];

    // 2. Call Houszu API
    // Strip trailing slashes and any path from the base URL to avoid double-path issues
    const rawUrl = Deno.env.get('HOUSZU_API_URL') || 'https://api.houszu.com';
    const HOUSZU_API_URL = rawUrl.replace(/\/api\/.*$/, '').replace(/\/$/, '');
    const HOUSZU_API_KEY = Deno.env.get('HOUSZU_API_KEY') || '';

    let houszuAgents = [];
    try {
      const houszuRes = await fetch(`${HOUSZU_API_URL}/api/getAvailableAgentsForOperatorTerritory`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${HOUSZU_API_KEY}`,
        },
        body: JSON.stringify({
          operator_id: operatorId,
          service_counties: territory.service_counties || [],
          service_zip_codes: territory.service_zip_codes || [],
          service_towns: territory.service_towns || [],
        }),
      });

      if (houszuRes.ok) {
        const houszuData = await houszuRes.json();
        houszuAgents = houszuData.agents || [];
      } else {
        console.warn('Houszu API returned non-200:', houszuRes.status);
        // Fall through with empty agents — don't hard fail
      }
    } catch (fetchErr) {
      console.warn('Houszu API fetch error:', fetchErr.message);
      // Fall through with empty agents
    }

    // 3. Get existing matches for this operator to avoid duplicates
    const existingMatches = await base44.entities.OperatorAgentMatch.filter({ operator_id: operatorId });
    const existingAgentIds = new Set(existingMatches.map(m => m.agent_id));

    // 4. Store new agents locally (only new ones not already stored)
    const newAgents = houszuAgents.filter(a => !existingAgentIds.has(String(a.agent_id || a.id)));
    for (const agent of newAgents) {
      await base44.entities.OperatorAgentMatch.create({
        operator_id: operatorId,
        agent_id: String(agent.agent_id || agent.id || ''),
        MasterAgentID: String(agent.MasterAgentID || agent.master_agent_id || ''),
        agent_name: agent.agent_name || agent.name || '',
        brokerage_name: agent.brokerage_name || agent.brokerage || '',
        match_score: Number(agent.match_score || agent.score || 0),
        status: 'pending',
      });
    }

    // 5. Return all matches sorted by match_score desc
    const allMatches = await base44.entities.OperatorAgentMatch.filter({ operator_id: operatorId });
    allMatches.sort((a, b) => (b.match_score || 0) - (a.match_score || 0));

    return Response.json({
      territory,
      matches: allMatches,
      new_agents_found: newAgents.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});