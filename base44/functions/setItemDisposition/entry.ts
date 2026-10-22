import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { DISPOSITION_OUTCOMES, CONSEQUENTIAL_OUTCOMES, dispositionProtectionReason, validateDecisionAuthority } from '../../shared/transitionGuards.ts';

// ─────────────────────────────────────────────
// setItemDisposition — Chapter 22 P0-3/P0-5.
// The ONE sanctioned write path for an Item's post-sale disposition:
//   - Operator/seller/admin only (EMPLOYEE AUTHORITY ≠ CLIENT AUTHORITY).
//   - PROTECTED merchandise (sold/paid/awaiting pickup, specialist custody,
//     client-retained) is structurally blocked.
//   - Consequential outcomes (DONATE, DISPOSE, BUYOUT, CLEANOUT,
//     CLIENT_RETAINS, SPECIALIST) require a canonical client-authorized
//     SaleClientDecision — an unapproved request is never authorization.
//   - RESELL and DECISION_REQUIRED are honest routing states and need no
//     decision (DECISION_REQUIRED is the honest "needs instruction" flag).
// ─────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { item_id, outcome, decision_id, responsible_note, collector_name, pickup_deadline, next_action_note } = body;
    if (!item_id) return Response.json({ error: 'item_id is required' }, { status: 400 });
    if (!DISPOSITION_OUTCOMES.includes(outcome)) {
      return Response.json({ error: `outcome must be one of: ${DISPOSITION_OUTCOMES.join(', ')}` }, { status: 400 });
    }

    const items = await base44.asServiceRole.entities.Item.filter({ id: item_id });
    const item = items[0];
    if (!item) return Response.json({ error: 'Item not found' }, { status: 404 });

    const isPrivileged = user.role === 'admin' || item.operator_id === user.id || item.seller_id === user.id;
    if (!isPrivileged) {
      return Response.json({ error: 'Only the operator (or an admin) may set a post-sale disposition.' }, { status: 403 });
    }

    // P0-4 protected-merchandise guard.
    const protection = dispositionProtectionReason(item);
    if (protection) return Response.json({ error: protection }, { status: 409 });

    // P0-5 client authorization for consequential outcomes.
    let authorized = {};
    if (CONSEQUENTIAL_OUTCOMES.includes(outcome)) {
      if (!decision_id) {
        return Response.json({ error: `Outcome ${outcome} requires client authority — record the client decision first and reference it.` }, { status: 409 });
      }
      const decisions = await base44.asServiceRole.entities.SaleClientDecision.filter({ id: decision_id });
      const check = validateDecisionAuthority(decisions[0], item.estate_sale_id);
      if (check.error) return Response.json({ error: check.error }, { status: 409 });
      authorized = {
        decision_id,
        authorized_by_name: check.lastHistory.authorized_by_name || '',
        authorized_at: check.lastHistory.decided_at || new Date().toISOString(),
      };
    }

    const now = new Date().toISOString();
    const block = {
      outcome,
      ...authorized,
      responsible_note: responsible_note || null,
      collector_name: collector_name || null,
      pickup_deadline: pickup_deadline || null,
      next_action_note: next_action_note || null,
      resolved_at: null,
      resolution_note: null,
      set_at: now,
      set_by_name: user.full_name || '',
    };
    await base44.asServiceRole.entities.Item.update(item.id, { post_sale_disposition: block });

    console.log(`[setItemDisposition] ${item.id}: ${outcome}${decision_id ? ` (decision ${decision_id})` : ''} by ${user.id}`);
    return Response.json({ success: true, item_id: item.id, disposition: block });
  } catch (error) {
    console.error('setItemDisposition error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});