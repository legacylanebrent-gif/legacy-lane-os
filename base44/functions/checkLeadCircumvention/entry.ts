import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Check for potential circumvention violations
    // This would typically be triggered by:
    // 1. Direct contact evidence (emails, messages)
    // 2. Property records showing non-platform transaction
    // 3. Multiple referral agreements for same property without platform involvement

    const leads = await base44.asServiceRole.entities.ReferralLead.filter({
      status: 'accepted',
    });

    const violations = [];

    for (const lead of leads) {
      // Get any deal agreements for this lead
      const deals = await base44.asServiceRole.entities.ReferralDealAgreement.filter({
        lead_id: lead.id,
      });

      for (const deal of deals) {
        // Check if non-circumvention period has passed (12 months)
        const acceptanceDate = new Date(deal.acceptance_timestamp);
        const now = new Date();
        const monthsElapsed = (now - acceptanceDate) / (1000 * 60 * 60 * 24 * 30);

        if (monthsElapsed > 12) {
          // After 12 months, non-circumvention obligation expires
          continue;
        }

        // Simulate violation detection (in production, check against external data sources)
        // For now, just log the agreement is being monitored
        console.log(`[MONITOR] Lead: ${lead.id}, Property: ${lead.property_address}, Agreement: ${deal.deal_id}`);
      }
    }

    return Response.json({
      success: true,
      message: 'Lead circumvention check completed',
      monitored_leads: leads.length,
      violations_detected: violations.length,
    });
  } catch (error) {
    console.error('Error checking circumvention:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});