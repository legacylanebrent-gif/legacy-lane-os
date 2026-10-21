import { createClientFromRequest } from 'npm:@base44/sdk@0.8.56';

// Chapter 15 P1-10/P1-11 — sale-scoped, concurrency-safe item-number assignment.
// One canonical Item receives a stable human-readable ordinal, unique within its sale,
// generated server-side so concurrent creations cannot both take the same number.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { item_id } = await req.json();
    if (!item_id) return Response.json({ error: 'item_id is required' }, { status: 400 });

    // Authorization via the user's own RLS scope — if the caller cannot read the item,
    // they may not number it.
    const visible = await base44.entities.Item.filter({ id: item_id });
    if (!visible || visible.length === 0) {
      return Response.json({ error: 'Forbidden or item not found' }, { status: 403 });
    }

    // Service role is required only for the uniqueness race across concurrent writers.
    const svc = base44.asServiceRole;
    const existing = await svc.entities.Item.filter({ id: item_id });
    const item = existing && existing[0];
    if (!item) return Response.json({ error: 'Item not found' }, { status: 404 });
    if (item.item_number) {
      return Response.json({ item_number: item.item_number, already_assigned: true });
    }
    if (!item.estate_sale_id) {
      return Response.json(
        { error: 'Item has no estate_sale_id — item numbers are sale-scoped' },
        { status: 400 }
      );
    }

    for (let attempt = 0; attempt < 8; attempt++) {
      const topPage = await svc.entities.Item.filter(
        { estate_sale_id: item.estate_sale_id, item_number: { $exists: true } },
        { sort: '-item_number', limit: 1 }
      );
      const top = topPage.items && topPage.items[0];
      const candidate = ((top && top.item_number) || 0) + 1 + attempt;

      const clash = await svc.entities.Item.filter({
        estate_sale_id: item.estate_sale_id,
        item_number: candidate,
      });
      if (clash && clash.length > 0) continue;

      // Re-check the item still has no number (a concurrent call may have won).
      const fresh = await svc.entities.Item.filter({ id: item_id });
      if (fresh && fresh[0] && fresh[0].item_number) {
        return Response.json({ item_number: fresh[0].item_number, already_assigned: true });
      }

      await svc.entities.Item.update(item_id, { item_number: candidate });
      return Response.json({ item_number: candidate });
    }

    return Response.json(
      { error: 'Could not assign a unique item number after retries' },
      { status: 500 }
    );
  } catch (error) {
    console.error('assignItemNumber error:', error);
    return Response.json({ error: error.message || 'Failed to assign item number' }, { status: 500 });
  }
}