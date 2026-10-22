import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ─────────────────────────────────────────────
// approveTransitionCompletion — Chapter 22 P1.
// TRANSITION COMPLETE IS NOT A BUTTON THAT MAKES THE PROJECT FINISHED —
// it is a conclusion the system becomes willing to support after required
// obligations have endings. This backend gate re-derives the open-obligation
// set from canonical records and refuses completion while any REQUIRED
// obligation remains open. Human completion approval remains final: on
// success it records WHO approved and WHEN.
// ─────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { sale_id, approval_note } = body;
    if (!sale_id) return Response.json({ error: 'sale_id is required' }, { status: 400 });

    const sales = await base44.asServiceRole.entities.EstateSale.filter({ id: sale_id });
    const sale = sales[0];
    if (!sale) return Response.json({ error: 'Sale not found' }, { status: 404 });
    if (user.role !== 'admin' && sale.operator_id !== user.id) {
      return Response.json({ error: 'Only the operator (or an admin) may approve transition completion.' }, { status: 403 });
    }

    const [itemsRes, decisionsRes, issuesRes, equipRes, donationsRes, cleanoutsRes, attemptsRes] = await Promise.allSettled([
      base44.asServiceRole.entities.Item.filter({ estate_sale_id: sale_id }),
      base44.asServiceRole.entities.SaleClientDecision.filter({ sale_id }),
      base44.asServiceRole.entities.SaleIssue.filter({ sale_id }),
      base44.asServiceRole.entities.SaleEquipmentAssignment.filter({ sale_id }),
      base44.asServiceRole.entities.Donation.filter({ sale_id }),
      base44.asServiceRole.entities.Cleanout.filter({ sale_id }),
      base44.asServiceRole.entities.PaymentAttempt.filter({ sale_id }),
    ]);
    const arr = (r) => (r.status === 'fulfilled' ? (Array.isArray(r.value) ? r.value : r.value?.items || []) : []);
    const itemRows = arr(itemsRes);
    const decisions = arr(decisionsRes);
    const issues = arr(issuesRes);
    const equipment = arr(equipRes);
    const donations = arr(donationsRes);
    const cleanouts = arr(cleanoutsRes);
    const attempts = arr(attemptsRes);

    const transition = sale.transition || {};
    const standard = transition.completion_standard?.standard;
    const requiresDisposition = transition.completion_standard?.requires_item_disposition !== false;
    const blockers = [];

    // 1 — buyer pickups (Chapter 21 outstanding custody)
    const awaiting = itemRows.filter((i) => i.status === 'sold' && !i.pickup_completed_at && (i.fulfillment_options || ['pickup']).includes('pickup'));
    if (awaiting.length) blockers.push(`${awaiting.length} paid item(s) still awaiting buyer pickup — under company custody.`);

    // 2 — donation / cleanout loads without endings
    for (const d of donations) {
      if ((d.included_item_ids || []).length && !['completed', 'cancelled'].includes(d.status)) {
        blockers.push(`Donation "${d.title}" is not completed (status ${d.status}).`);
      }
    }
    for (const c of cleanouts) {
      if ((c.included_item_ids || []).length && !['completed', 'cancelled'].includes(c.status)) {
        blockers.push(`Cleanout "${c.title}" is not completed (status ${c.status}).`);
      }
    }

    // 3 — buyout awarded but not transferred
    const award = transition.buyout_award;
    if (award && !award.transferred_at) blockers.push('Buyout awarded but transfer not recorded.');

    // 4 — specialist custody open
    const offsite = itemRows.filter((i) => i.offsite_research?.status === 'OFFSITE');
    if (offsite.length) blockers.push(`${offsite.length} item(s) still in specialist custody (offsite).`);

    // 5 — remaining merchandise accountability (NOTHING IS LEFTOVER)
    if (requiresDisposition) {
      const unrouted = itemRows.filter((i) => i.status !== 'sold' && !(i.post_sale_disposition || {}).outcome && !(i.post_sale_disposition || {}).resolved_at);
      if (unrouted.length) blockers.push(`${unrouted.length} remaining item(s) have NO recorded disposition or reason.`);
      const decisionNeeded = itemRows.filter((i) => (i.post_sale_disposition || {}).outcome === 'DECISION_REQUIRED' && !(i.post_sale_disposition || {}).resolved_at);
      if (decisionNeeded.length) blockers.push(`${decisionNeeded.length} item(s) still need a client disposition decision.`);
      const pendingOutcomes = itemRows.filter((i) => {
        const o = (i.post_sale_disposition || {}).outcome;
        return ['DONATE', 'CLEANOUT', 'BUYOUT', 'DISPOSE'].includes(o) && !(i.post_sale_disposition || {}).resolved_at;
      });
      if (pendingOutcomes.length) blockers.push(`${pendingOutcomes.length} routed item(s) not yet physically resolved.`);
      if (['PROPERTY_CLEARED', 'ROOMS_CLEARED'].includes(standard)) {
        const retained = itemRows.filter((i) => (i.post_sale_disposition || {}).outcome === 'CLIENT_RETAINS' && !i.pickup_completed_at && !(i.post_sale_disposition || {}).resolved_at);
        if (retained.length) blockers.push(`${retained.length} client-retained item(s) still at the property — this completion standard requires them released.`);
      }
    }

    // 6 — required client decisions
    const openDecisions = decisions.filter((d) => ['merchandise', 'disposition'].includes(d.decision_type) && d.status === 'open');
    if (openDecisions.length) blockers.push(`${openDecisions.length} open merchandise/disposition client decision(s).`);

    // 7 — blocking issues
    const blockingIssues = issues.filter((i) => i.status === 'OPEN' && (i.blocking_areas || []).some((a) => ['pickup', 'cleanout_disposition', 'settlement'].includes(a)));
    if (blockingIssues.length) blockers.push(`${blockingIssues.length} open blocking issue(s) (pickup/disposition/settlement).`);

    // 8 — company equipment endings
    const pendingEquip = equipment.filter((a) => a.packed && a.entry_type === 'REUSABLE_EQUIPMENT' && (a.packout_state || 'PENDING') === 'PENDING');
    if (pendingEquip.length) blockers.push(`${pendingEquip.length} company equipment assignment(s) with no pack-out ending.`);

    // 9 — payment exceptions
    const unknownAttempts = attempts.filter((a) => a.status === 'UNKNOWN');
    if (unknownAttempts.length) blockers.push(`${unknownAttempts.length} payment attempt(s) with UNKNOWN result — resolve before completion.`);

    // 10 — completion standard + final walkthrough
    if (!standard) blockers.push('No completion standard recorded — define what finished means for this project before completing it.');
    if (standard && standard !== 'SALE_SERVICES_ONLY' && !transition.walkthrough?.completed_at) {
      blockers.push('Final walkthrough not completed (human room confirmations).');
    }

    if (blockers.length) {
      return Response.json({ ready: false, blockers }, { status: 409 });
    }

    const now = new Date().toISOString();
    const updated = {
      ...(sale.transition || {}),
      transition_completed_at: transition.transition_completed_at || now,
      completed_by: user.id,
      completed_by_name: user.full_name || '',
      approval_note: approval_note || transition.approval_note || null,
    };
    await base44.asServiceRole.entities.EstateSale.update(sale_id, { transition: updated });
    console.log(`[approveTransitionCompletion] ${sale_id} approved by ${user.id}`);
    return Response.json({ ready: true, success: true, transition: updated });
  } catch (error) {
    console.error('approveTransitionCompletion error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});