import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * getAvailableOperatorsForAgentTerritory
 *
 * Returns a scored, ranked list of available Legacy Lane operators
 * for a given agent territory request.
 *
 * Scoring priority:
 *   1. ZIP code match   (50 pts each, max 100)
 *   2. County match     (30 pts each, max 60)
 *   3. Town match       (10 pts each, max 30)
 *   4. Available status (+10 bonus)
 *
 * Auth: x-legacy-shared-key header (for Houszu server-to-server)
 *       OR authenticated app user (admin / real_estate_agent)
 *
 * Input (POST body):
 *   - agent_id      (string)
 *   - zip_codes     (string[])
 *   - counties      (string[])
 *   - towns         (string[])   optional
 *   - state         (string)     optional, default "NJ"
 */

function scoreOperator(profile, requestZips, requestCounties, requestTowns) {
  let score = 0;
  const matchedFields = {};

  const profileZips     = (profile.service_zip_codes || []).map(z => z.trim().toLowerCase());
  const profileCounties = (profile.service_counties  || []).map(c => c.trim().toLowerCase());
  const profileTowns    = (profile.service_towns      || []).map(t => t.trim().toLowerCase());

  const normZips     = (requestZips     || []).map(z => z.trim().toLowerCase());
  const normCounties = (requestCounties || []).map(c => c.trim().toLowerCase());
  const normTowns    = (requestTowns    || []).map(t => t.trim().toLowerCase());

  // Tier 1: ZIP (50 pts each, cap 100)
  const zipMatches = normZips.filter(z => profileZips.includes(z));
  if (zipMatches.length > 0) {
    const pts = Math.min(zipMatches.length * 50, 100);
    score += pts;
    matchedFields.zips = zipMatches;
  }

  // Tier 2: County (30 pts each, cap 60)
  const countyMatches = normCounties.filter(c => profileCounties.includes(c));
  if (countyMatches.length > 0) {
    const pts = Math.min(countyMatches.length * 30, 60);
    score += pts;
    matchedFields.counties = countyMatches;
  }

  // Tier 3: Town (10 pts each, cap 30)
  const townMatches = normTowns.filter(t => profileTowns.includes(t));
  if (townMatches.length > 0) {
    const pts = Math.min(townMatches.length * 10, 30);
    score += pts;
    matchedFields.towns = townMatches;
  }

  // Availability bonus
  if (profile.status === 'available') {
    score += 10;
  }

  return { score: Math.min(score, 100), matchedFields };
}

Deno.serve(async (req) => {
  // GET = health check (no auth)
  if (req.method === 'GET') {
    return Response.json({
      success: true,
      message: 'Legacy Lane OS operator endpoint is reachable. Use POST with x-legacy-shared-key header.',
      correct_url: '/functions/getAvailableOperatorsForAgentTerritory',
      scoring: 'ZIP (50pts) → County (30pts) → Town (10pts) → Available (+10)',
    });
  }

  if (req.method !== 'POST') {
    return Response.json({ success: false, error: 'Method Not Allowed. Use POST.' }, { status: 405 });
  }

  // Auth: shared key OR logged-in user
  const incomingKey = req.headers.get('x-legacy-shared-key') || '';
  const expectedKey = Deno.env.get('LEGACY_SHARED_API_KEY') || '';
  const base44 = createClientFromRequest(req);

  let callerIsAuthed = false;
  if (incomingKey && incomingKey === expectedKey) {
    callerIsAuthed = true;
  } else {
    try {
      const user = await base44.auth.me();
      if (user) callerIsAuthed = true;
    } catch (_) {}
  }

  if (!callerIsAuthed) {
    return Response.json({ success: false, error: 'Unauthorized: invalid shared key' }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const {
    agent_id,
    zip_codes = [],
    counties = [],
    towns = [],
    state = 'NJ',
    min_score = 0,
  } = body;

  // Load all operator territory profiles
  const allProfiles = await base44.asServiceRole.entities.OperatorTerritoryProfile.list('-created_date', 200);

  // Score and filter
  const results = allProfiles
    .map(profile => {
      const { score, matchedFields } = scoreOperator(profile, zip_codes, counties, towns);
      return {
        operator_id: profile.operator_id,
        company_name: profile.company_name,
        service_counties: profile.service_counties,
        service_towns: profile.service_towns,
        service_zip_codes: profile.service_zip_codes,
        max_agent_partnerships: profile.max_agent_partnerships,
        current_agent_partnerships: profile.current_agent_partnerships,
        status: profile.status,
        match_score: score,
        matched_fields: matchedFields,
      };
    })
    .filter(r => r.match_score > min_score)
    .sort((a, b) => b.match_score - a.match_score);

  return Response.json({
    success: true,
    operators: results,
    total_evaluated: allProfiles.length,
    total_matched: results.length,
    territory_requested: { zip_codes, counties, towns, state },
    match_logic: 'ZIP (50pts/match, max 100) → County (30pts/match, max 60) → Town (10pts/match, max 30) → Available status (+10)',
    houszu_sync_status: 'Pending — scoring currently uses Legacy Lane OperatorTerritoryProfile only.',
  });
});