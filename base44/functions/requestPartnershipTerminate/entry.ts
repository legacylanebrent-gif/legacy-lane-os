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

    // Check if within 14 days of creation
    const createdDate = new Date(match.created_date);
    const now = new Date();
    const daysSinceCreation = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));

    let newStatus = 'terminated';
    let title = 'Partnership Terminated';
    let message = 'Partnership has been immediately terminated.';

    if (daysSinceCreation > 14) {
      newStatus = 'under_review';
      title = 'Termination Request Submitted';
      message = 'Partnership termination request has been submitted for review (partners after 14-day window).';
    }

    // Update partnership status
    await base44.asServiceRole.entities.OperatorAgentMatch.update(match.id, {
      status: newStatus,
    });

    return Response.json({
      success: true,
      title,
      message,
      details: {
        'Days since creation': daysSinceCreation,
        'New status': newStatus,
        'Non-circumvention': 'Remains active (12 months)',
      },
    });
  } catch (error) {
    console.error('Error requesting termination:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});