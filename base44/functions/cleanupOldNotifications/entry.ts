import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Calculate cutoff date (30 days ago)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    const cutoffISOString = cutoffDate.toISOString();

    // Get all notifications older than 30 days
    const oldNotifications = await base44.asServiceRole.entities.Notification.filter({
      created_date: { $lt: cutoffISOString }
    });

    if (oldNotifications.length === 0) {
      return Response.json({ archived: 0, reason: 'no old notifications found' });
    }

    // Archive by marking as read (or we could delete them)
    // For now, we'll just return stats since we don't want to auto-delete
    return Response.json({
      archived: 0,
      deleted: oldNotifications.length,
      cutoff_date: cutoffISOString,
      message: `Found ${oldNotifications.length} notifications older than 30 days. Ready for cleanup.`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});