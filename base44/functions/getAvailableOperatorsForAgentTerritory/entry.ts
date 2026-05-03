import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  // Validate shared key
  const incomingKey = req.headers.get('x-legacy-shared-key') || '';
  const expectedKey = Deno.env.get('LEGACY_SHARED_API_KEY') || '';
  if (!incomingKey || incomingKey !== expectedKey) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (req.method !== 'POST') {
    return Response.json({ error: 'Method Not Allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);

    let body = {};
    try { body = await req.json(); } catch (_) {}

    const {
      agent_id,
      MasterAgentID,
      county,
      state,
      zip_codes = [],
      towns = [],
      radius,
    } = body;

    // Fetch all available operator territory profiles
    const allProfiles = await base44.asServiceRole.entities.OperatorTerritoryProfile.filter({
      status: 'available',
    });

    // Filter: agreement_signed + capacity available + territory overlap
    const incomingZips = zip_codes.map(z => String(z).trim().toLowerCase());
    const incomingTowns = towns.map(t => String(t).trim().toLowerCase());
    const incomingCounty = county ? county.trim().toLowerCase() : '';

    const matched = [];

    for (const profile of allProfiles) {
      // Capacity check
      const capacity = (profile.max_agent_partnerships || 0) - (profile.current_agent_partnerships || 0);
      if (capacity <= 0) continue;

      // agreement_signed check
      if (profile.agreement_signed === false) continue;

      // Territory overlap check
      const profileZips = (profile.service_zip_codes || []).map(z => String(z).trim().toLowerCase());
      const profileTowns = (profile.service_towns || []).map(t => String(t).trim().toLowerCase());
      const profileCounties = (profile.service_counties || []).map(c => String(c).trim().toLowerCase());

      const zipOverlap = incomingZips.filter(z => profileZips.includes(z)).length;
      const townOverlap = incomingTowns.filter(t => profileTowns.includes(t)).length;
      const countyOverlap = incomingCounty && profileCounties.includes(incomingCounty) ? 1 : 0;

      const hasOverlap = zipOverlap > 0 || townOverlap > 0 || countyOverlap > 0;
      if (!hasOverlap) continue;

      // Scoring
      // Territory overlap: up to 40 pts
      const totalIncoming = Math.max(incomingZips.length + incomingTowns.length + (incomingCounty ? 1 : 0), 1);
      const totalOverlap = zipOverlap + townOverlap + countyOverlap;
      const territoryScore = Math.min(40, Math.round((totalOverlap / totalIncoming) * 40));

      // Availability: up to 20 pts (status === available = full 20)
      const availabilityScore = profile.status === 'available' ? 20 : 10;

      // Capacity: up to 20 pts (more slots = higher score)
      const maxSlots = profile.max_agent_partnerships || 1;
      const capacityScore = Math.min(20, Math.round((capacity / maxSlots) * 20));

      // Response time: up to 20 pts (based on updated_date recency — proxy for engagement)
      let responseScore = 10; // default mid
      if (profile.updated_date) {
        const daysSinceUpdate = (Date.now() - new Date(profile.updated_date).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceUpdate <= 7) responseScore = 20;
        else if (daysSinceUpdate <= 30) responseScore = 15;
        else if (daysSinceUpdate <= 90) responseScore = 10;
        else responseScore = 5;
      }

      const matchScore = territoryScore + availabilityScore + capacityScore + responseScore;

      matched.push({
        operator_id: profile.operator_id,
        company_name: profile.company_name || '',
        owner_name: profile.owner_name || '',
        email: profile.email || '',
        phone: profile.phone || '',
        service_counties: profile.service_counties || [],
        service_towns: profile.service_towns || [],
        service_zip_codes: profile.service_zip_codes || [],
        match_score: matchScore,
        status: profile.status,
      });
    }

    // Sort highest score first
    matched.sort((a, b) => b.match_score - a.match_score);

    return Response.json({ success: true, operators: matched });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});