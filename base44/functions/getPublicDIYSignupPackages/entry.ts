import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const packages = await base44.asServiceRole.entities.SubscriptionPackage.filter(
      { is_active: true, account_type: 'consignor' },
      'tier_level',
      20
    );

    return Response.json({ packages });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});