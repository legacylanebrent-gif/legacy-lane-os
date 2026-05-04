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
        const scoreColor = score >= 80 ? '#16a34a' : score >= 50 ? '#f97316' : '#64748b';
        const emailHtml = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
<tr><td style="background:linear-gradient(135deg,#1e293b 0%,#334155 100%);padding:28px 32px;text-align:center;">
  <div style="font-family:Georgia,serif;font-size:26px;font-weight:bold;color:#ffffff;letter-spacing:1px;">Legacy Lane</div>
  <div style="font-size:12px;color:#f97316;margin-top:4px;letter-spacing:2px;text-transform:uppercase;">OS Platform &nbsp;·&nbsp; Referral Exchange</div>
</td></tr>
<tr><td style="padding:36px 32px;">
  <h2 style="margin:0 0 8px 0;font-size:22px;color:#1e293b;font-family:Georgia,serif;">You're a Top Territory Match</h2>
  <p style="margin:0 0 24px 0;font-size:15px;color:#475569;line-height:1.7;">Hi ${operatorUser.full_name || 'there'},<br/><br/>A real estate agent has requested operator coverage in your service area and you ranked as a top match.</p>

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:24px;">
    <tr><td style="padding:8px 16px;font-size:13px;color:#64748b;font-weight:600;width:40%;">Agent</td><td style="padding:8px 16px;font-size:14px;color:#1e293b;">${agent_name}</td></tr>
    <tr style="background:#fff;"><td style="padding:8px 16px;font-size:13px;color:#64748b;font-weight:600;">Territory Requested</td><td style="padding:8px 16px;font-size:14px;color:#1e293b;">${territoryDesc}</td></tr>
    <tr><td style="padding:8px 16px;font-size:13px;color:#64748b;font-weight:600;">Your Match Score</td><td style="padding:8px 16px;font-size:20px;font-weight:800;color:${scoreColor};">${score}<span style="font-size:13px;font-weight:600;color:#64748b;"> / 100</span></td></tr>
    <tr style="background:#fff;"><td style="padding:8px 16px;font-size:13px;color:#64748b;font-weight:600;vertical-align:top;">Match Reasons</td><td style="padding:8px 16px;font-size:13px;color:#475569;">${reasons.join('<br/>')}</td></tr>
  </table>

  <div style="text-align:center;margin:28px 0;">
    <a href="https://app.legacylane.com/AgentPartnerships" style="display:inline-block;background:#f97316;color:#ffffff;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:700;text-decoration:none;">Review Agent Request</a>
  </div>
</td></tr>
<tr><td style="background:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;text-align:center;">
  <p style="margin:0 0 6px 0;font-size:13px;color:#64748b;">Legacy Lane OS &nbsp;|&nbsp; Referral Exchange Platform</p>
  <p style="margin:0;font-size:12px;color:#94a3b8;">This is an automated match notification. Please do not reply directly to this email.</p>
</td></tr>
</table></td></tr></table>
</body></html>`;

        await base44.asServiceRole.integrations.Core.SendEmail({
          to: operatorUser.email,
          from_name: 'Legacy Lane OS',
          subject: `You're a Top Match — New Agent Territory Request (Score: ${score}/100)`,
          body: emailHtml,
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