import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const now = new Date();

    // Find items that are still available and active in inventory
    const allItems = await base44.asServiceRole.entities.Item.filter({
      status: 'available',
      inventory_display_status: 'active',
    }, '-created_date', 2000);

    // Filter to items created at least 14 days ago that need reminding
    const itemsToRemind = allItems.filter(item => {
      const created = new Date(item.created_date);
      const cutoff = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      if (created > cutoff) return false;

      // Skip if already reminded within the last 7 days
      if (item.inventory_reminder_sent_at) {
        const lastReminder = new Date(item.inventory_reminder_sent_at);
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (lastReminder > oneWeekAgo) return false;
      }

      return true;
    });

    if (itemsToRemind.length === 0) {
      return Response.json({ reminded: 0, message: 'No items need reminders' });
    }

    // Group items by seller_id
    const bySeller = {};
    for (const item of itemsToRemind) {
      if (!bySeller[item.seller_id]) bySeller[item.seller_id] = [];
      bySeller[item.seller_id].push(item);
    }

    // Get all users in one batch
    const allUsers = await base44.asServiceRole.entities.User.list('-created_date', 5000);
    const userMap = {};
    for (const u of allUsers) {
      userMap[u.id] = u;
    }

    // Process each seller
    const results = [];
    for (const [sellerId, sellerItems] of Object.entries(bySeller)) {
      const sellerData = userMap[sellerId];
      if (!sellerData || !sellerData.email) continue;

      const itemList = sellerItems.map(i => `\u2022 ${i.title} (${i.category || 'no category'}) \u2014 $${((i.price || 0) / 100).toFixed(2)}`).join('\n');
      const itemIds = sellerItems.map(i => i.id);
      const itemCount = sellerItems.length;

      // Create in-app notification
      await base44.asServiceRole.entities.Notification.create({
        user_id: sellerId,
        type: 'reminder',
        title: `Inventory Check: ${itemCount} item(s) listed 14+ days ago`,
        message: `You have ${itemCount} item(s) that have been in your inventory for over 14 days. Review their status \u2014 mark as sold elsewhere or renew for another 14 days.\n\n${itemList}`,
        link_to_page: 'Inventory',
        read: false,
      });

      // Send email notification
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: sellerData.email,
        subject: `Inventory Check: ${itemCount} item(s) listed 14+ days ago on EstateSalen`,
        body: `Hi ${sellerData.full_name || 'there'},

It's been 14 days since you listed ${itemCount} item(s) on EstateSalen. Here's a quick summary:

${itemList}

Please take a moment to update their status:

\u2022 If sold elsewhere \u2014 mark the item as "Sold" from your Inventory page
\u2022 If still available \u2014 renew the item for another 14 days

Keeping your inventory up to date helps buyers find what's actually available and avoids confusion.

\u27a1\ufe0f Review your inventory: https://estatesalen.com/Inventory

\u2014 The EstateSalen Team`
      });

      // Mark all these items as reminded
      for (const itemId of itemIds) {
        const item = sellerItems.find(i => i.id === itemId);
        await base44.asServiceRole.entities.Item.update(itemId, {
          inventory_reminder_sent_at: now.toISOString(),
          inventory_reminder_count: (item?.inventory_reminder_count || 0) + 1,
        });
      }

      results.push({ sellerId, email: sellerData.email, itemCount });
    }

    return Response.json({
      reminded: itemsToRemind.length,
      sellers: results.length,
      results,
    });
  } catch (error) {
    console.error('sendInventoryReminders error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});