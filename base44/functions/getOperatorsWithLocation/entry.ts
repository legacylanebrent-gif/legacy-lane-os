import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allUsers = await base44.asServiceRole.entities.User.list();

    const operators = allUsers
      .filter(u =>
        (u.company_name || u.primary_account_type === 'estate_sale_operator' || u.role === 'Estate Sale Company Owner') &&
        u.id !== user.id
      )
      .map(u => ({
        id: u.id,
        company_name: u.company_name || u.full_name,
        full_name: u.full_name,
        city: u.city,
        state: u.state,
        location: u.location || null,
        primary_account_type: u.primary_account_type,
        role: u.role,
      }));

    return Response.json({ operators });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});