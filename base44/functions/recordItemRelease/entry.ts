import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { releasedCount, remainingCount } from '../../shared/posPayment.ts';

// ─────────────────────────────────────────────
// recordItemRelease — Chapter 21 P1 RELEASE / PARTIAL PICKUP record.
// The ONE sanctioned write path for releasing SOLD merchandise (backend write
// layer, not a UI guard):
//   - Only SOLD merchandise can be released (UNKNOWN/PROCESSING payment never
//     releases — the Item is not sold until money is confirmed).
//   - HIGH_VALUE releases require the operator/seller/admin (custody doctrine).
//   - Each release entry preserves WHO released, WHEN, TO WHOM (buyer or the
//     named authorized collector), and WHAT left (quantity + component note).
//   - PARTIAL releases never close custody: pickup_completed_at is set only
//     when the remaining count reaches zero. Multiple trips preserved.
//   - HIGH_VALUE releases also append the RELEASED custody_events entry.
// ─────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { item_id, quantity_released, released_to, component_note, notes } = body;
    if (!item_id) return Response.json({ error: 'item_id is required' }, { status: 400 });

    const items = await base44.asServiceRole.entities.Item.filter({ id: item_id });
    const item = items[0];
    if (!item) return Response.json({ error: 'Item not found' }, { status: 404 });

    // P0-8 — only SOLD merchandise can be released. An item whose payment is
    // UNKNOWN/PROCESSING is not sold; a hold is not a sale; available is not paid.
    // Chapter 22: client-retained merchandise awaiting FAMILY pickup reuses
    // this same release path (released_to = the named family collector, who
    // gains NO broader client authority).
    const disposition = item.post_sale_disposition || {};
    const retainedRelease = disposition.outcome === 'CLIENT_RETAINS' && !disposition.resolved_at;
    if (item.status !== 'sold' && !retainedRelease) {
      return Response.json({ error: `Only SOLD merchandise (or client-retained merchandise awaiting family pickup) can be released. This item is ${item.status} — payment must be confirmed before release.` }, { status: 409 });
    }

    // HIGH_VALUE custody: operator/seller/admin only.
    const isPrivileged = user.role === 'admin' || item.operator_id === user.id || item.seller_id === user.id;
    if (item.inventory_level === 'HIGH_VALUE' && !isPrivileged) {
      return Response.json({ error: 'High-Value merchandise may only be released by the operator (or an admin).' }, { status: 403 });
    }

    const remaining = remainingCount(item);
    if (remaining <= 0) {
      return Response.json({ error: 'Nothing remains to release on this item.' }, { status: 409 });
    }
    const qty = Number(quantity_released) || remaining;
    if (!Number.isInteger(qty) || qty < 1 || qty > remaining) {
      return Response.json({ error: `Release quantity must be between 1 and ${remaining} (remaining).` }, { status: 400 });
    }

    const now = new Date().toISOString();
    const releaseEntry = {
      release_id: crypto.randomUUID(),
      released_at: now,
      released_by: user.id,
      released_by_name: user.full_name || '',
      released_to: released_to || item.buyer_name || '',
      quantity: qty,
      component_note: component_note || null,
      notes: notes || null,
    };

    const newRemaining = remaining - qty;
    const updateData = {
      releases: [...(item.releases || []), releaseEntry],
    };
    if (newRemaining === 0) {
      updateData.pickup_completed_at = now;
    }
    if (newRemaining === 0 && retainedRelease) {
      updateData.post_sale_disposition = { ...disposition, resolved_at: now, resolution_note: `Released to ${released_to || disposition.collector_name || 'the family collector'}.` };
    }
    if (item.inventory_level === 'HIGH_VALUE') {
      updateData.custody_events = [...(item.custody_events || []), {
        event: 'RELEASED',
        note: `Released ${qty === 1 ? '1 unit' : `${qty} units`}${released_to ? ` to ${released_to}` : ''}${newRemaining > 0 ? ` — ${newRemaining} remaining` : ' — fully released'}.`,
        by: user.id,
        by_name: user.full_name || '',
        at: now,
      }];
    }

    await base44.asServiceRole.entities.Item.update(item.id, updateData);

    console.log(`[recordItemRelease] ${item.id}: ${qty} released by ${user.id}${newRemaining > 0 ? `, ${newRemaining} remaining` : ', fully released'}`);

    return Response.json({
      success: true,
      item_id: item.id,
      released: qty,
      remaining: newRemaining,
      fully_released: newRemaining === 0,
      release: releaseEntry,
    });
  } catch (error) {
    console.error('recordItemRelease error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});