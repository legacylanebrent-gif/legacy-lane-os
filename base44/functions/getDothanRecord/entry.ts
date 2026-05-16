import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    // Search for "Dothan Estate Sales"
    const records = await base44.asServiceRole.entities.FutureEstateOperator.filter({
      company_name: { $regex: 'Dothan', $options: 'i' }
    });

    if (records.length === 0) {
      return Response.json({ error: 'No records found for "Dothan"' }, { status: 404 });
    }

    return Response.json({
      count: records.length,
      records: records
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});