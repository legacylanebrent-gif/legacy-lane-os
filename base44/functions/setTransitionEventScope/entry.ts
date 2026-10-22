import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { dispositionProtectionReason, validateDecisionAuthority } from '../../shared/transitionGuards.ts';

// ─────────────────────────────────────────────
// setTransitionEventScope — Chapter 22 P0-6..P0-9.
// The ONE sanctioned write path for the structural item scope of a
// donation / cleanout load, and for the buyout award:
//   - Donation/Cleanout must be canonically linked to the sale (sale_id) —
//     street address is descriptive, never relational identity.
//   - Event-level client authorization (SaleClientDecision) is required.
//   - PROTECTED merchandise (sold/paid, specialist custody, client-retained,
//     resolved, sensitive/controlled without its own authority) is
//     structurally REJECTED from the included list and surfaced — free-text
//     exclusions may supplement but never replace this.
//   - Buyout awards write EstateSale.transition.buyout_award with included/
//     excluded items and the client-approval decision reference.
// ─────────────────────────────────────────────

const OUTCOME_FOR = { donation: 'DONATE', cleanout: 'CLEANOUT' };

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { event_type } = body;
    if (!['donation', 'cleanout', 'buyout'].includes(event_type)) {
      return Response.json({ error: 'event_type must be donation, cleanout, or buyout' }, { status: 400 });
    }

    if (event_type === 'buyout') {
      const { sale_id, buyer_name, offer_amount, conditions_note, decision_id, included_item_ids = [], excluded_item_ids = [] } = body;
      if (!sale_id) return Response.json({ error: 'sale_id is required' }, { status: 400 });
      if (!decision_id) {
        return Response.json({ error: 'Buyout requires client approval — record the client decision first and reference it.' }, { status: 409 });
      }
      const sales = await base44.asServiceRole.entities.EstateSale.filter({ id: sale_id });
      const sale = Array.isArray(sales) ? sales[0] : sales?.items?.[0];
      if (!sale) return Response.json({ error: 'Sale not found' }, { status: 404 });
      if (user.role !== 'admin' && sale.operator_id !== user.id) {
        return Response.json({ error: 'Only the operator (or an admin) may record a buyout award.' }, { status: 403 });
      }
      const decisions = await base44.asServiceRole.entities.SaleClientDecision.filter({ id: decision_id });
      const decision = Array.isArray(decisions) ? decisions[0] : decisions?.items?.[0];
      const check = validateDecisionAuthority(decision, sale_id);
      if (check.error) return Response.json({ error: `Buyout requires client approval — ${check.error}` }, { status: 409 });

      const result = await guardAndApplyItems(base44, sale_id, included_item_ids, excluded_item_ids, decision_id, check.lastHistory, 'BUYOUT', null);
      if (result.rejected.length && result.applied.length === 0) {
        return Response.json({ error: 'No eligible merchandise — protected items cannot enter the buyout.', rejected: result.rejected }, { status: 409 });
      }
      const now = new Date().toISOString();
      const transition = { ...(sale.transition || {}) };
      transition.buyout_award = {
        buyer_name: buyer_name || null,
        offer_amount: Number(offer_amount) || null,
        conditions_note: conditions_note || null,
        decision_id,
        authorized_by_name: check.lastHistory.authorized_by_name || '',
        authorized_at: check.lastHistory.decided_at || now,
        included_item_ids: result.applied,
        excluded_item_ids: result.excluded,
        transferred_at: transition.buyout_award?.transferred_at || null,
      };
      await base44.asServiceRole.entities.EstateSale.update(sale_id, { transition });
      return Response.json({ success: true, buyout_award: transition.buyout_award, rejected: result.rejected, excluded: result.excluded });
    }

    // donation / cleanout
    const { event_id, decision_id, included_item_ids = [], excluded_item_ids = [] } = body;
    if (!event_id) return Response.json({ error: 'event_id is required' }, { status: 400 });
    const entity = event_type === 'donation' ? 'Donation' : 'Cleanout';
    const events = await base44.asServiceRole.entities[entity].filter({ id: event_id });
    const event = Array.isArray(events) ? events[0] : events?.items?.[0];
    if (!event) return Response.json({ error: `${entity} not found` }, { status: 404 });
    if (user.role !== 'admin' && event.operator_id !== user.id) {
      return Response.json({ error: `Only the operator (or an admin) may manage this ${event_type}'s scope.` }, { status: 403 });
    }
    if (!event.sale_id) {
      return Response.json({ error: `This ${event_type} is not canonically linked to a sale — link it to the sale (sale_id) before setting item scope.` }, { status: 409 });
    }
    if (!decision_id) {
      return Response.json({ error: `A ${event_type} load requires client authority — record the client decision first and reference it.` }, { status: 409 });
    }
    const decisions = await base44.asServiceRole.entities.SaleClientDecision.filter({ id: decision_id });
    const decision = Array.isArray(decisions) ? decisions[0] : decisions?.items?.[0];
    const check = validateDecisionAuthority(decision, event.sale_id);
    if (check.error) return Response.json({ error: check.error }, { status: 409 });

    const outcome = OUTCOME_FOR[event_type];
    const result = await guardAndApplyItems(base44, event.sale_id, included_item_ids, excluded_item_ids, decision_id, check.lastHistory, outcome, event_id);
    if (result.rejected.length && result.applied.length === 0) {
      return Response.json({ error: `No eligible merchandise — protected items cannot enter this ${event_type}.`, rejected: result.rejected }, { status: 409 });
    }

    const update = {
      authorization_decision_id: decision_id,
      included_item_ids: result.applied,
      excluded_item_ids: result.excluded,
    };
    await base44.asServiceRole.entities[entity].update(event_id, update);
    console.log(`[setTransitionEventScope] ${event_type} ${event_id}: ${result.applied.length} included, ${result.excluded.length} excluded, ${result.rejected.length} rejected`);
    return Response.json({ success: true, event_type, event_id, included: result.applied, excluded: result.excluded, rejected: result.rejected });
  } catch (error) {
    console.error('setTransitionEventScope error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function guardAndApplyItems(base44, sale_id, includedIds, excludedIds, decision_id, lastHistory, outcome, event_id) {
  const rejected = [];
  const applied = [];
  const now = new Date().toISOString();
  const ids = [...new Set([...(includedIds || [])])];

  const res = await base44.asServiceRole.entities.Item.filter({ estate_sale_id: sale_id });
  const saleItems = Array.isArray(res) ? res : res?.items || [];
  const byId = {};
  for (const it of saleItems) byId[it.id] = it;

  for (const id of ids) {
    const item = byId[id];
    if (!item) {
      rejected.push({ item_id: id, reason: 'Item not found on this sale.' });
      continue;
    }
    const protection = dispositionProtectionReason(item);
    if (protection) {
      rejected.push({ item_id: item.id, title: item.title, reason: protection });
      continue;
    }
    // Sensitive/controlled merchandise needs its OWN item-level authorized
    // disposition before entering any removal scope — a broad event-level
    // decision never sweeps it out of the property.
    if (item.display_attention === 'CONTROLLED_DISPLAY' && !(item.post_sale_disposition || {}).decision_id) {
      rejected.push({ item_id: item.id, title: item.title, reason: 'CONTROLLED/sensitive merchandise requires its own item-level client-authorized disposition before entering a removal scope.' });
      continue;
    }
    const existing = item.post_sale_disposition || {};
    // ROUTING CONFLICT: merchandise already routed to a different outcome
    // (e.g. DONATE entering a CLEANOUT scope) must be changed through its
    // authorized decision path — a removal scope never silently re-routes it.
    if (existing.outcome && existing.outcome !== outcome) {
      rejected.push({ item_id: item.id, title: item.title, reason: `Already routed to ${existing.outcome} — record the change through the authorized client-decision path first.` });
      continue;
    }
    const block = {
      outcome,
      decision_id: existing.decision_id || decision_id,
      authorized_by_name: existing.authorized_by_name || lastHistory.authorized_by_name || '',
      authorized_at: existing.authorized_at || lastHistory.decided_at || now,
      responsible_note: existing.responsible_note || null,
      collector_name: existing.collector_name || null,
      pickup_deadline: existing.pickup_deadline || null,
      next_action_note: existing.next_action_note || null,
      ...(outcome === 'DONATE' ? { donation_id: event_id } : {}),
      ...(outcome === 'CLEANOUT' ? { cleanout_id: event_id } : {}),
      resolved_at: null,
      resolution_note: null,
      set_at: now,
      set_by_name: lastHistory.authorized_by_name || '',
    };
    await base44.asServiceRole.entities.Item.update(item.id, { post_sale_disposition: block });
    applied.push(item.id);
  }
  const excluded = [...new Set([...(excludedIds || [])])].filter((id) => !applied.includes(id));
  return { applied, excluded, rejected };
}