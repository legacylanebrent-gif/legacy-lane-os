import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const HOUSZU_APP_ID = "69d11abfe3a01036002a99a2";
const BASE_URL = `https://base44.app/api/apps/${HOUSZU_APP_ID}/functions`;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const HOUSZU_SHARED_KEY = Deno.env.get("HOUSZU_SHARED_API_KEY");

    // Try to get Houszu agent referral profiles (master territories)
    let houszuAgents = [];
    let houszuRaw = null;
    try {
      const res = await fetch(`${BASE_URL}/getAllAgentReferralProfiles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shared_key: HOUSZU_SHARED_KEY }),
      });
      const text = await res.text();
      houszuRaw = { status: res.status, body: text };
      if (res.ok) {
        const data = JSON.parse(text);
        houszuAgents = data.agents || data.profiles || data.data || [];
      }
    } catch (e) {
      houszuRaw = { error: e.message };
    }

    // Load local entity data
    const [agentApps, operatorProfiles] = await Promise.all([
      base44.asServiceRole.entities.AgentTerritoryApplication.list('-created_date', 500),
      base44.asServiceRole.entities.OperatorTerritoryProfile.list('-created_date', 500),
    ]);

    // Build master territories from AgentTerritoryApplication (county = master territory)
    const masterMap = {};
    for (const app of agentApps) {
      const key = `${app.county_requested}|${app.license_state}`;
      if (!masterMap[key]) {
        masterMap[key] = {
          id: key,
          county: app.county_requested,
          state: app.license_state,
          agents: [],
          total_micro_territories: 0,
        };
      }
      masterMap[key].agents.push({
        id: app.id,
        name: app.name,
        email: app.email,
        brokerage: app.brokerage,
        status: app.status,
        interested_in: app.interested_in,
        micro_territory_count: (app.territory_cities || []).length,
        territory_cities: app.territory_cities || [],
        territory_municipalities: app.territory_municipalities || [],
      });
      masterMap[key].total_micro_territories += (app.territory_cities || []).length;
    }

    // Flatten all micro territories (cities) across all agent apps
    const microTerritories = [];
    for (const app of agentApps) {
      for (const city of (app.territory_cities || [])) {
        const muniData = (app.territory_municipalities || []).find(m =>
          m.name?.toLowerCase() === city.toLowerCase()
        );
        microTerritories.push({
          city,
          county: app.county_requested,
          state: app.license_state,
          agent_name: app.name,
          agent_id: app.id,
          agent_status: app.status,
          type: muniData?.type || '',
          incorporated: muniData?.incorporated,
          notes: muniData?.notes || '',
        });
      }
    }

    return Response.json({
      master_territories: Object.values(masterMap),
      micro_territories: microTerritories,
      agent_applications: agentApps,
      operator_profiles: operatorProfiles,
      houszu_agents: houszuAgents,
      debug: { houszuRaw },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});