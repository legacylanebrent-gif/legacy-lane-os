import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Syncs Item status changes across Inventory and Marketplace channels
 * Called via entity automation when Item status changes
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data, old_data } = await req.json();

    const itemId = event.entity_id;
    const newStatus = data.status;
    const oldStatus = old_data?.status;

    // Only sync if status actually changed
    if (newStatus === oldStatus) {
      return Response.json({ synced: false, reason: 'Status did not change' });
    }

    // Map Item status to channel-specific statuses
    const statusMap = {
      available: { inventory: 'active', marketplace: 'active' },
      pending: { inventory: 'inactive', marketplace: 'inactive' },
      sold: { inventory: 'inactive', marketplace: 'inactive' },
      reserved: { inventory: 'inactive', marketplace: 'inactive' },
    };

    const channelStatuses = statusMap[newStatus] || {};

    // If item is on marketplace, update the linked MarketplaceItem
    if (data.marketplace_item_id) {
      const marketplaceStatus = newStatus === 'available' ? 'ACTIVE' : 'SOLD';

      try {
        await base44.asServiceRole.entities.MarketplaceItem.update(
          data.marketplace_item_id,
          {
            status: marketplaceStatus,
          },
        );
      } catch (err) {
        console.error('Error updating marketplace item:', err.message);
      }
    }

    // Update display statuses
    const updates = {
      last_synced_at: new Date().toISOString(),
    };

    if (data.sales_channels?.includes('inventory')) {
      updates.inventory_display_status = channelStatuses.inventory;
    }

    if (data.sales_channels?.includes('marketplace')) {
      updates.marketplace_display_status = channelStatuses.marketplace;
    }

    if (Object.keys(updates).length > 1) {
      await base44.asServiceRole.entities.Item.update(itemId, updates);
    }

    return Response.json({
      synced: true,
      itemId,
      oldStatus,
      newStatus,
      updates,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});