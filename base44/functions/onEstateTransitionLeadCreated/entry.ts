import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Entity automation handler — fires when a new EstateTransitionLead is created.
 * Orchestrates the full pipeline:
 * 1. Score the lead
 * 2. Route to providers
 * 3. Enter email sequence
 * 4. Log creation activity
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const { event, data } = payload;
    const lead = data;
    const lead_id = event?.entity_id || lead?.id;

    if (!lead_id || !lead) {
      return Response.json({ error: 'Invalid payload — missing lead_id or data' }, { status: 400 });
    }

    const results = { lead_id, steps: [] };

    // ── Step 1: Score the lead ──
    const scoreResult = await base44.asServiceRole.functions.invoke('scoreEstateTransitionLead', {
      lead,
      lead_id,
    });
    results.steps.push({ step: 'score', score: scoreResult?.score, level: scoreResult?.level });

    // ── Step 2: Route the lead ──
    const routeResult = await base44.asServiceRole.functions.invoke('routeEstateTransitionLead', {
      lead_id,
      state: lead.state,
      county: lead.county,
      zip_code: lead.zip_code,
      life_event_type: lead.life_event_type,
      needs_estate_sale: lead.needs_estate_sale,
      needs_realtor: lead.needs_realtor,
      needs_cleanout: lead.needs_cleanout,
      wants_cash_offer: lead.wants_cash_offer,
      has_real_estate: lead.has_real_estate,
      lead_level: scoreResult?.level,
      email: lead.email,
    });
    results.steps.push({ step: 'route', routed_to: routeResult?.routed_to?.length || 0, no_match: routeResult?.no_match });

    // ── Step 3: Enter email sequence ──
    const emailResult = await base44.asServiceRole.functions.invoke('sendEstateTransitionEmailSequence', {
      lead_id,
      send_immediately: true, // send email 1 immediately, queue the rest
    });
    results.steps.push({ step: 'email_sequence', emails_queued: emailResult?.emails_queued });

    // ── Step 4: Log creation activity ──
    await base44.asServiceRole.entities.LeadActivityLog.create({
      lead_id,
      activity_type: 'lead_created',
      activity_notes: `Lead created. Score: ${scoreResult?.score || 0} (${scoreResult?.level || 'unknown'}). Routed to ${routeResult?.routed_to?.length || 0} provider(s). Email sequence started.`,
    });

    results.steps.push({ step: 'activity_logged' });

    return Response.json(results);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});