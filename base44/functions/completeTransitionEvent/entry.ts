import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ─────────────────────────────────────────────
// completeTransitionEvent — Chapter 22 P1.
// The ONE sanctioned completion path for donation / cleanout / buyout:
//   - DONATION: requires recorded acceptance (ACCEPTED/PARTIAL — directory
//     interest is never acceptance) and a recorded pickup before completion;
//     only the APPROVED load items resolve. An organization or employee
//     cannot convert an item into donated merely because it was picked up.
//   - CLEANOUT: a provider saying done is NEVER completion — operator
//     verification is required before the event resolves.
//   - BUYOUT: records the physical transfer and resolves the included items.
// Completion resolves ONLY the item load; excluded items keep their truth.
// ─────────────────────────────────────────────

const first = (r) => (Array.isArray(r) ? r[0] : r?.items?.[0]);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { event_type } = body;
    const now = new Date().toISOString();

    if (event_type === 'buyout') {
      const { sale_id } = body;
      if (!sale_id) return Response.json({ error: 'sale_id is required' }, { status: 400 });
      const sales = await base44.asServiceRole.entities.EstateSale.filter({ id: sale_id });
      const sale = first(sales);
      if (!sale) return Response.json({ error: 'Sale not found' }, { status: 404 });
      if (user.role !== 'admin' && sale.operator_id !== user.id) return Response.json({ error: 'Only the operator (or an admin).' }, { status: 403 });
      const award = sale.transition?.buyout_award;
      if (!award) return Response.json({ error: 'No buyout award recorded for this sale.' }, { status: 409 });
      const transition = { ...(sale.transition || {}) };
      transition.buyout_award = { ...award, transferred_at: now };
      await base44.asServiceRole.entities.EstateSale.update(sale_id, { transition });
      const resolved = await resolveItems(base44, sale_id, award.included_item_ids || [], `Buyout transfer completed${award.buyer_name ? ` — ${award.buyer_name}` : ''}.`);
      return Response.json({ success: true, transferred_at: now, resolved_items: resolved });
    }

    const { event_id } = body;
    if (!event_id) return Response.json({ error: 'event_id is required' }, { status: 400 });
    const entity = event_type === 'donation' ? 'Donation' : 'Cleanout';
    const events = await base44.asServiceRole.entities[entity].filter({ id: event_id });
    const event = first(events);
    if (!event) return Response.json({ error: `${entity} not found` }, { status: 404 });
    if (user.role !== 'admin' && event.operator_id !== user.id) {
      return Response.json({ error: `Only the operator (or an admin) may complete this ${event_type}.` }, { status: 403 });
    }

    if (event_type === 'donation') {
      const acceptance = event.acceptance_status || 'NOT_CHECKED';
      if (!['ACCEPTED', 'PARTIAL'].includes(acceptance)) {
        return Response.json({ error: `Donation acceptance is ${acceptance}. Record the organization's acceptance of THIS load (ACCEPTED/PARTIAL) before completion — directory interest is never acceptance.` }, { status: 409 });
      }
      const pickup_completed_at = body.pickup_completed_at || event.pickup_completed_at;
      if (!pickup_completed_at) {
        return Response.json({ error: 'Record the pickup (pickup_completed_at) before completing this donation.' }, { status: 409 });
      }
      const update = {
        status: 'completed',
        pickup_completed_at,
        receipt_note: body.receipt_note || event.receipt_note || null,
        performance_note: body.performance_note || event.performance_note || null,
      };
      if (body.receipt_uri) update.receipt_uri = body.receipt_uri;
      await base44.asServiceRole.entities.Donation.update(event_id, update);
      const resolved = await resolveItems(base44, event.sale_id, event.included_item_ids || [], `Donation completed — load picked up by ${event.awarded_vendor_name || 'the organization'}.`);
      return Response.json({ success: true, resolved_items: resolved });
    }

    // cleanout
    const { operator_verified, provider_completed_at, provider_reported_note, exceptions_note, performance_note } = body;
    if (operator_verified !== true) {
      return Response.json({ error: 'Provider-reported completion is not operator verification — verify the agreed scope was actually completed before recording completion.' }, { status: 409 });
    }
    const completion = {
      provider_completed_at: provider_completed_at || event.completion?.provider_completed_at || now,
      provider_reported_note: provider_reported_note || event.completion?.provider_reported_note || null,
      operator_verified: true,
      operator_verified_at: now,
      operator_verified_by_name: user.full_name || '',
      exceptions_note: exceptions_note || event.completion?.exceptions_note || null,
      performance_note: performance_note || event.completion?.performance_note || null,
    };
    await base44.asServiceRole.entities.Cleanout.update(event_id, { status: 'completed', confirmation_status: 'COMPLETED', completion });
    const resolved = await resolveItems(base44, event.sale_id, event.included_item_ids || [], `Cleanout completed and operator-verified by ${user.full_name || 'the operator'}.`);
    return Response.json({ success: true, completion, resolved_items: resolved });
  } catch (error) {
    console.error('completeTransitionEvent error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function resolveItems(base44, sale_id, ids, note) {
  if (!ids || !ids.length) return [];
  const res = await base44.asServiceRole.entities.Item.filter({ estate_sale_id: sale_id });
  const rows = (Array.isArray(res) ? res : res?.items || []).filter((i) => ids.includes(i.id));
  const now = new Date().toISOString();
  for (const item of rows) {
    const d = item.post_sale_disposition || {};
    await base44.asServiceRole.entities.Item.update(item.id, {
      post_sale_disposition: { ...d, resolved_at: now, resolution_note: note },
    });
  }
  return rows.map((i) => i.id);
}