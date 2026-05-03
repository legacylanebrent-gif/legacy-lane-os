import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { match_id } = await req.json();
    if (!match_id) {
      return Response.json({ error: 'match_id is required' }, { status: 400 });
    }

    // Load the match record
    const matches = await base44.entities.OperatorAgentMatch.filter({ id: match_id, operator_id: user.id });
    if (!matches || matches.length === 0) {
      return Response.json({ error: 'Match not found' }, { status: 404 });
    }
    const match = matches[0];

    // Send request to Houszu
    const HOUSZU_API_URL = Deno.env.get('HOUSZU_API_URL') || 'https://api.houszu.com';
    const HOUSZU_API_KEY = Deno.env.get('HOUSZU_API_KEY') || '';

    let houszuSuccess = false;
    try {
      const houszuRes = await fetch(`${HOUSZU_API_URL}/api/requestAgentPartnership`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${HOUSZU_API_KEY}`,
        },
        body: JSON.stringify({
          operator_id: user.id,
          agent_id: match.agent_id,
          MasterAgentID: match.MasterAgentID,
        }),
      });
      houszuSuccess = houszuRes.ok;
    } catch (fetchErr) {
      console.warn('Houszu partnership request error:', fetchErr.message);
    }

    // Update local record status to pending (already pending, but confirm intent)
    await base44.entities.OperatorAgentMatch.update(match_id, { status: 'pending' });

    return Response.json({
      success: true,
      houszu_notified: houszuSuccess,
      match_id,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});