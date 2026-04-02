import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const currentUser = await base44.auth.me();
    
    if (!currentUser || !['super_admin', 'platform_ops'].includes(currentUser.primary_account_type)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all users
    const users = await base44.asServiceRole.entities.User.list('-created_date', 10000);
    
    let updatedCount = 0;
    const updates = [];

    for (const user of users) {
      // If user doesn't have primary_account_type or it's empty, set it to consumer
      if (!user.primary_account_type || user.primary_account_type === '') {
        updates.push(
          base44.asServiceRole.entities.User.update(user.id, {
            primary_account_type: 'consumer'
          })
        );
        updatedCount++;
      }
    }

    // Execute all updates in parallel
    await Promise.all(updates);

    return Response.json({
      success: true,
      message: `Updated ${updatedCount} users with default account type`,
      updatedCount
    });
  } catch (error) {
    console.error('Error setting default account type:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});