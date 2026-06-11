import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Find notifications older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Get all notifications (service role for admin operation)
    const allNotifications = await base44.asServiceRole.entities.Notification.list('-created_date', 10000);
    
    const oldNotifications = allNotifications.filter(n => {
      const createdDate = new Date(n.created_date);
      return createdDate < thirtyDaysAgo;
    });
    
    if (oldNotifications.length === 0) {
      return Response.json({ archived: 0, message: 'No old notifications found' });
    }
    
    // Archive by marking as deleted (or we could add an 'archived' field)
    // For now, we'll just delete them since they're old and likely read
    let deleted = 0;
    for (const notification of oldNotifications) {
      try {
        await base44.asServiceRole.entities.Notification.delete(notification.id);
        deleted++;
      } catch (error) {
        console.error('Failed to delete notification:', notification.id, error.message);
      }
    }
    
    return Response.json({ 
      archived: deleted, 
      total_found: oldNotifications.length,
      cutoff_date: thirtyDaysAgo.toISOString()
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});