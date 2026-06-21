import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function escapeHtml(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

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

      const itemCount = sellerItems.length;
      const itemIds = sellerItems.map(i => i.id);

      // Build plain text item list for body fallback
      const plainItemList = sellerItems.map(i =>
        `- ${i.title} (${i.category || 'no category'}) \u2014 $${(i.price || 0).toLocaleString()}`
      ).join('\n');

      // Build HTML item list
      const htmlItemList = sellerItems.map(i =>
        `<li><strong>${escapeHtml(i.title)}</strong> (${escapeHtml(i.category || 'no category')}) \u2014 $${(i.price || 0).toLocaleString()}</li>`
      ).join('');

      // Create in-app notification
      await base44.asServiceRole.entities.Notification.create({
        user_id: sellerId,
        type: 'reminder',
        title: `Inventory Check: ${itemCount} item(s) listed 14+ days ago`,
        message: `You have ${itemCount} item(s) that have been in your inventory for over 14 days. Review their status \u2014 mark as sold elsewhere or renew for another 14 days.\n\n${plainItemList}`,
        link_to_page: 'Inventory',
        read: false,
      });

      // Send email notification with HTML formatting
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: sellerData.email,
        subject: `Inventory Check: ${itemCount} item(s) listed 14+ days ago on EstateSalen`,
        body: `Hi ${sellerData.full_name || 'there'},\n\nIt's been 14 days since you listed ${itemCount} item(s) on EstateSalen. Here's a quick summary:\n\n${plainItemList}\n\nPlease take a moment to update their status:\n- Sold elsewhere? Mark the item as "Sold" from your Inventory page.\n- Still available? Renew the item for another 14 days.\n\nKeeping your inventory up to date helps buyers find what's actually available and avoids confusion.\n\nReview your inventory: https://estatesalen.com/Inventory\n\n\u2014 The EstateSalen Team`,
        html: `<p>Hi ${escapeHtml(sellerData.full_name || 'there')},</p>
<p>It's been <strong>14 days</strong> since you listed ${itemCount} item(s) on EstateSalen. Here's a quick summary:</p>
<ul style="padding-left:20px;margin:16px 0;">${htmlItemList}</ul>
<p><strong>Please take a moment to update their status:</strong></p>
<ul style="padding-left:20px;margin:16px 0;">
  <li><strong>Sold elsewhere?</strong> \u2014 Mark the item as "Sold" from your Inventory page.</li>
  <li><strong>Still available?</strong> \u2014 Renew the item for another 14 days.</li>
</ul>
<p>Keeping your inventory up to date helps buyers find what's actually available and avoids confusion.</p>
<p style="margin-top:24px;"><a href="https://estatesalen.com/Inventory" style="display:inline-block;background:#f97316;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:600;">Review Your Inventory</a></p>
<p style="margin-top:32px;color:#64748b;font-size:14px;">\u2014 The EstateSalen Team</p>`
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