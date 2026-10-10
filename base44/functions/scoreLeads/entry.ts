import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { enqueueActivity, resolveMasterUserID } from '../../shared/identityActivityOutbox.ts';

// ─────────────────────────────────────────────
// scoreLeads
// Scores leads for quality, routing, and prioritization.
//
// Two modes:
//   1. Entity automation (Lead create) — scores just the new lead
//      Payload: { event: { type, entity_name, entity_id }, data: { ...lead } }
//   2. Admin manual trigger — scores all unscored leads (bulk)
//      Payload: { action: 'bulk' } (requires admin auth)
// ─────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    // ── Entity automation mode: score a single lead ──
    const leadData = body?.data;
    const entityId = body?.event?.entity_id;

    if (leadData && entityId) {
      const score = calculateLeadScore(leadData);
      await base44.asServiceRole.entities.Lead.update(entityId, { score });

      // Phase 7D.1A: direct CIO track RETIRED — canonical outbox enqueue
      try {
        const masterUserID = await resolveMasterUserID(base44, { email: leadData.contact_email, userId: leadData.routed_to });
        await enqueueActivity(base44, {
          masterUserID,
          event_type: "lead_scored",
          identity_context: { ...(leadData.contact_email ? { email: String(leadData.contact_email).trim().toLowerCase() } : {}) },
          product_context: { product_id: "estatesalen" },
          payload: { score, lead_id: entityId, source: leadData.source },
        });
      } catch (e) {
        console.error('[scoreLeads] canonical enqueue failed:', e.message);
      }

      return Response.json({ success: true, lead_id: entityId, score });
    }

    // ── Admin bulk mode: score all unscored leads ──
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required for bulk scoring' }, { status: 403 });
    }

    const allLeads = await base44.asServiceRole.entities.Lead.filter({}, '-created_date', 500);
    const leads = allLeads.filter(l => !l.score || l.score === 0);

    if (leads.length === 0) {
      return Response.json({ scored: 0, message: 'No unscored leads found' });
    }

    let updated = 0;
    for (let i = 0; i < leads.length; i++) {
      const score = calculateLeadScore(leads[i]);
      await base44.asServiceRole.entities.Lead.update(leads[i].id, { score });
      updated++;
      if (i % 5 === 4) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    return Response.json({ scored: updated });
  } catch (error) {
    console.error('scoreLeads error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function calculateLeadScore(lead) {
  let score = 50;

  if (lead.estimated_value) {
    if (lead.estimated_value > 500000) score += 15;
    else if (lead.estimated_value > 300000) score += 10;
    else if (lead.estimated_value > 100000) score += 5;
  }

  if (lead.propstream_equity) {
    if (lead.propstream_equity > 200000) score += 15;
    else if (lead.propstream_equity > 100000) score += 10;
    else if (lead.propstream_equity > 50000) score += 5;
  }

  const distressedOwnerTypes = ['Distressed', 'Foreclosure', 'Pre-Foreclosure', 'Inherited'];
  if (lead.propstream_owner_type && distressedOwnerTypes.some(t => lead.propstream_owner_type.includes(t))) {
    score += 10;
  }

  const highPrioritySituations = ['probate', 'foreclosure', 'downsizing'];
  if (lead.situation && highPrioritySituations.includes(lead.situation)) {
    score += 10;
  }

  if (lead.contact_email && lead.contact_phone) score += 5;
  else if (lead.contact_email || lead.contact_phone) score += 2;

  return Math.min(score, 100);
}