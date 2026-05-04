import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * notifyTopOperatorsForAgentTerritory
 *
 * Called when an agent requests coverage in a territory.
 * Scores all available Legacy Lane operators using:
 *   1. ZIP code match (highest priority)
 *   2. County match
 *   3. Houszu territory fallback (towns)
 *
 * Notifies the top 3 operators via in-app notification + email.
 *
 * Input (POST body):
 *   - agent_id        (string)
 *   - agent_name      (string)
 *   - zip_codes       (string[])   — ZIP codes the agent wants covered
 *   - counties        (string[])   — County names
 *   - towns           (string[])   — Optional town/city names
 *   - state           (string)     — e.g. "NJ"
 *   - top_n           (number)     — How many operators to notify (default: 3)
 *
 * Auth: LEGACY_SHARED_API_KEY header (x-legacy-shared-key)
 *       OR authenticated operator/admin user
 */

function scoreOperator(profile, requestZips, requestCounties, requestTowns) {
  let score = 0;
  const reasons = [];

  const profileZips    = (profile.service_zip_codes || []).map(z => z.trim().toLowerCase());
  const profileCounties = (profile.service_counties  || []).map(c => c.trim().toLowerCase());
  const profileTowns   = (profile.service_towns      || []).map(t => t.trim().toLowerCase());

  const normZips    = (requestZips     || []).map(z => z.trim().toLowerCase());
  const normCounties = (requestCounties || []).map(c => c.trim().toLowerCase());
  const normTowns   = (requestTowns    || []).map(t => t.trim().toLowerCase());

  // --- Tier 1: ZIP code match (50 pts each, max 100) ---
  const zipMatches = normZips.filter(z => profileZips.includes(z));
  if (zipMatches.length > 0) {
    const pts = Math.min(zipMatches.length * 50, 100);
    score += pts;
    reasons.push(`ZIP match (${zipMatches.join(', ')}): +${pts}`);
  }

  // --- Tier 2: County match (30 pts each, max 60) ---
  const countyMatches = normCounties.filter(c => profileCounties.includes(c));
  if (countyMatches.length > 0) {
    const pts = Math.min(countyMatches.length * 30, 60);
    score += pts;
    reasons.push(`County match (${countyMatches.join(', ')}): +${pts}`);
  }

  // --- Tier 3: Town/city match (10 pts each, max 30) ---
  const townMatches = normTowns.filter(t => profileTowns.includes(t));
  if (townMatches.length > 0) {
    const pts = Math.min(townMatches.length * 10, 30);
    score += pts;
    reasons.push(`Town match (${townMatches.join(', ')}): +${pts}`);
  }

  // --- Availability bonus (10 pts) ---
  if (profile.status === 'available') {
    score += 10;
    reasons.push('Available status: +10');
  }

  return { score: Math.min(score, 100), reasons };
}

Deno.serve(async (req) => {
  if (req.method === 'GET') {
    return Response.json({ status: 'ok', endpoint: 'notifyTopOperatorsForAgentTerritory' });
  }

  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
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
      if (user && (user.role === 'admin' || user.primary_account_type === 'real_estate_agent')) {
        callerIsAuthed = true;
      }
    } catch (_) {}
  }

  if (!callerIsAuthed) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const {
    agent_id,
    agent_name = 'An agent',
    zip_codes = [],
    counties = [],
    towns = [],
    state = 'NJ',
    top_n = 3,
  } = body;

  if (!agent_id || (zip_codes.length === 0 && counties.length === 0)) {
    return Response.json({ error: 'agent_id and at least one of zip_codes or counties required' }, { status: 400 });
  }

  // 1. Load all available operator territory profiles
  const allProfiles = await base44.asServiceRole.entities.OperatorTerritoryProfile.filter({ status: 'available' });

  if (!allProfiles || allProfiles.length === 0) {
    return Response.json({ success: true, message: 'No available operators found', notified: [] });
  }

  // 2. Score each operator
  const scored = allProfiles
    .map(profile => {
      const { score, reasons } = scoreOperator(profile, zip_codes, counties, towns);
      return { profile, score, reasons };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, top_n);

  if (scored.length === 0) {
    return Response.json({
      success: true,
      message: 'No operators matched the requested territory',
      territory_requested: { zip_codes, counties, towns, state },
      notified: [],
    });
  }

  // 3. Build a human-readable territory description for notifications
  const territoryDesc = [
    zip_codes.length   ? `ZIPs: ${zip_codes.join(', ')}`     : null,
    counties.length    ? `Counties: ${counties.join(', ')}`   : null,
    towns.length       ? `Towns: ${towns.join(', ')}`         : null,
  ].filter(Boolean).join(' | ');

  // 4. Notify each top operator
  const notified = [];
  for (const { profile, score, reasons } of scored) {
    const operatorId = profile.operator_id;

    // 4a. In-app notification
    try {
      await base44.asServiceRole.entities.Notification.create({
        user_id: operatorId,
        type: 'territory_match',
        title: '🏡 New Agent Territory Request — You\'re a Top Match!',
        message: `${agent_name} is requesting operator coverage for ${territoryDesc}. Your match score: ${score}/100. Log in to review and respond.`,
        link_to_page: 'AgentPartnerships',
        read: false,
      });
    } catch (err) {
      console.warn(`[notifyTopOperators] In-app notification failed for ${operatorId}:`, err.message);
    }

    // 4b. Email notification
    try {
      const users = await base44.asServiceRole.entities.User.filter({ id: operatorId });
      const operatorUser = users[0];
      if (operatorUser?.email) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: operatorUser.email,
          from_name: 'Legacy Lane',
          subject: `New Agent Territory Request — You\'re a Top Match (Score: ${score}/100)`,
          body: `Hi ${operatorUser.full_name || 'there'},\n\n` +
            `A real estate agent (${agent_name}) has requested operator coverage in your area:\n\n` +
            `  Territory: ${territoryDesc}\n` +
            `  Your match score: ${score}/100\n` +
            `  Match reasons: ${reasons.join('; ')}\n\n` +
            `Log in to Legacy Lane OS to review the agent's request and respond:\n` +
            `https://app.legacylane.com/AgentPartnerships\n\n` +
            `---\n` +
            `Legacy Lane OS | Referral Exchange\n` +
            `This is an automated match notification. Do not reply to this email.`,
        });
      }
    } catch (err) {
      console.warn(`[notifyTopOperators] Email failed for ${operatorId}:`, err.message);
    }

    notified.push({
      operator_id: operatorId,
      company_name: profile.company_name,
      score,
      reasons,
    });
  }

  // 5. Log the match event for audit trail
  console.log(`[notifyTopOperators] Agent ${agent_id} territory request. Notified ${notified.length} operators:`,
    notified.map(n => `${n.company_name} (${n.score})`).join(', '));

  return Response.json({
    success: true,
    agent_id,
    territory_requested: { zip_codes, counties, towns, state },
    operators_evaluated: allProfiles.length,
    notified,
    match_logic: 'ZIP code (50pts) → County (30pts) → Town (10pts) → Available status (10pts)',
    houszu_territory_sync: 'Not yet active — scoring uses Legacy Lane OperatorTerritoryProfile records only. Houszu territory sync is pending API alignment.',
  });
});