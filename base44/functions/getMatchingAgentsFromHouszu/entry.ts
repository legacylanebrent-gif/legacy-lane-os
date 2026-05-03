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

    // 2. Debug: confirm secrets exist
    const rawUrl = Deno.env.get('HOUSZU_API_URL') || '';
    const HOUSZU_API_KEY = Deno.env.get('HOUSZU_API_KEY') || '';

    console.log('[DEBUG] HOUSZU_API_URL present:', rawUrl ? 'YES' : 'NO');
    console.log('[DEBUG] HOUSZU_API_URL value:', rawUrl);
    console.log('[DEBUG] HOUSZU_API_KEY present:', HOUSZU_API_KEY ? 'YES' : 'NO');

    // Strip any /api/... path suffix — the secret may include a full endpoint path
    const HOUSZU_BASE_URL = rawUrl.replace(/\/api\/.*$/, '').replace(/\/$/, '');
    const endpoint = `${HOUSZU_BASE_URL}/api/getAvailableAgentsForOperatorTerritory`;

    // 3. Build request body per Houszu spec
    const requestBody = {
      operator_id: operatorId || 'legacy_lane_test_001',
      county: (territory.service_counties || [])[0] || '',
      state: 'NJ',
      zip_codes: territory.service_zip_codes || [],
      towns: territory.service_towns || [],
      radius: 20,
    };

    console.log('[DEBUG] Outbound endpoint:', endpoint);
    console.log('[DEBUG] Outbound body:', JSON.stringify(requestBody));

    let houszuStatus = null;
    let houszuRawBody = null;
    let houszuAgents = [];
    let debugMessage = '';

    try {
      const houszuRes = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-houszu-shared-key': HOUSZU_API_KEY,
        },
        body: JSON.stringify(requestBody),
      });

      houszuStatus = houszuRes.status;
      console.log('[DEBUG] Houszu response status:', houszuStatus);

      const rawText = await houszuRes.text();
      houszuRawBody = rawText;
      console.log('[DEBUG] Houszu raw response body:', rawText);

      if (houszuStatus === 401) {
        debugMessage = 'Shared key mismatch or missing header.';
        console.warn('[DEBUG]', debugMessage);
      } else if (houszuStatus === 404) {
        debugMessage = 'Houszu API URL or function path is incorrect.';
        console.warn('[DEBUG]', debugMessage);
      } else if (houszuStatus === 405) {
        debugMessage = 'Function exists but method is wrong; must use POST.';
        console.warn('[DEBUG]', debugMessage);
      } else if (houszuRes.ok) {
        try {
          const houszuData = JSON.parse(rawText);
          houszuAgents = houszuData.agents || [];
          if (houszuAgents.length === 0) {
            debugMessage = 'Connection works, but no matching AgentReferralProfile records were found.';
          } else {
            debugMessage = `Success — ${houszuAgents.length} agent(s) returned.`;
          }
          console.log('[DEBUG]', debugMessage);
        } catch (_) {
          debugMessage = 'Response was 200 but body was not valid JSON.';
          console.warn('[DEBUG]', debugMessage, rawText);
        }
      } else {
        debugMessage = `Unexpected status ${houszuStatus}.`;
        console.warn('[DEBUG]', debugMessage);
      }
    } catch (fetchErr) {
      debugMessage = `Fetch error: ${fetchErr.message}`;
      console.warn('[DEBUG] Houszu fetch error:', fetchErr.message);
    }

    // 4. Get existing matches to avoid duplicates
    const existingMatches = await base44.asServiceRole.entities.OperatorAgentMatch.filter({ operator_id: operatorId });
    const existingAgentIds = new Set(existingMatches.map(m => m.agent_id));

    // 5. Store new agents
    const newAgents = houszuAgents.filter(a => !existingAgentIds.has(String(a.agent_id || a.id)));
    for (const agent of newAgents) {
      await base44.asServiceRole.entities.OperatorAgentMatch.create({
        operator_id: operatorId,
        agent_id: String(agent.agent_id || agent.id || ''),
        MasterAgentID: String(agent.MasterAgentID || agent.master_agent_id || ''),
        agent_name: agent.agent_name || agent.name || '',
        brokerage_name: agent.brokerage_name || agent.brokerage || '',
        match_score: Number(agent.match_score || agent.score || 0),
        status: 'pending',
      });
    }

    // 6. Return all matches + debug info
    const allMatches = await base44.asServiceRole.entities.OperatorAgentMatch.filter({ operator_id: operatorId });
    allMatches.sort((a, b) => (b.match_score || 0) - (a.match_score || 0));

    return Response.json({
      territory,
      matches: allMatches,
      new_agents_found: newAgents.length,
      debug: {
        houszu_url_present: !!rawUrl,
        houszu_key_present: !!HOUSZU_API_KEY,
        endpoint,
        last_status: houszuStatus,
        last_response_body: houszuRawBody,
        agents_returned: houszuAgents.length,
        message: debugMessage,
        synced_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});