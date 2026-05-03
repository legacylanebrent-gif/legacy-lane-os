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

    // Evaluate metrics
    // Get referral deals for this partnership
    const deals = await base44.asServiceRole.entities.ReferralDealAgreement.filter({
      agent_id: match.agent_id,
      operator_id: user.id,
    });

    const referralActivity = deals.length;
    
    // Calculate average response time (days between deal creation and acceptance)
    let avgResponseTime = 0;
    if (deals.length > 0) {
      const responseTimes = deals
        .filter(d => d.acceptance_timestamp && d.created_date)
        .map(d => {
          const created = new Date(d.created_date);
          const accepted = new Date(d.acceptance_timestamp);
          return (accepted - created) / (1000 * 60 * 60 * 24);
        });
      avgResponseTime = responseTimes.length > 0
        ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length * 10) / 10
        : 0;
    }

    // Determine outcome
    let outcome = 'continue';
    if (referralActivity === 0) {
      outcome = 'terminate';
    } else if (avgResponseTime > 7) {
      outcome = 'downgrade';
    }

    // Update status to under_review with outcome
    await base44.asServiceRole.entities.OperatorAgentMatch.update(match.id, {
      status: 'under_review',
    });

    return Response.json({
      success: true,
      title: 'Partnership Review Submitted',
      message: 'Partnership performance has been evaluated.',
      details: {
        'Referral activity': `${referralActivity} deals`,
        'Avg response time': `${avgResponseTime} days`,
        'Recommended outcome': outcome,
        'Review status': 'under_review',
      },
    });
  } catch (error) {
    console.error('Error requesting review:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});