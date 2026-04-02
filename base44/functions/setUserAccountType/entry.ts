import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify admin access
    const currentUser = await base44.auth.me();
    if (!currentUser || !['super_admin', 'platform_ops'].includes(currentUser.primary_account_type)) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { user_email, primary_account_type } = await req.json();

    if (!user_email || !primary_account_type) {
      return Response.json({ 
        error: 'Missing required fields: user_email and primary_account_type' 
      }, { status: 400 });
    }

    // Update the user
    const users = await base44.asServiceRole.entities.User.filter({ email: user_email });
    
    if (users.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const user = users[0];
    await base44.asServiceRole.entities.User.update(user.id, {
      primary_account_type: primary_account_type
    });

    return Response.json({ 
      success: true,
      message: `User ${user_email} updated with account type: ${primary_account_type}`
    });

  } catch (error) {
    console.error('Error updating user:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});