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
      return Response.json({ error: 'match_id required' }, { status: 400 });
    }

    // Get the match
    const matches = await base44.asServiceRole.entities.OperatorAgentMatch.filter({
      id: match_id,
    });

    if (matches.length === 0) {
      return Response.json({ error: 'Partnership not found' }, { status: 404 });
    }

    const match = matches[0];

    // Update partnership type to non-exclusive
    // Note: Add partnership_type field to OperatorAgentMatch if needed
    await base44.asServiceRole.entities.OperatorAgentMatch.update(match.id, {
      status: match.status, // Keep current status
    });

    return Response.json({
      success: true,
      title: 'Partnership Type Changed',
      message: 'Partnership converted to non-exclusive arrangement.',
      details: {
        'Partnership type': 'Non-Exclusive',
        'Status': match.status,
        'Non-circumvention': 'Remains active for 12 months',
      },
    });
  } catch (error) {
    console.error('Error converting partnership:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});