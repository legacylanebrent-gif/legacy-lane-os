import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Fetching all operators...');
    const allOperators = await base44.asServiceRole.entities.FutureEstateOperator.list('-created_date', 5000);
    
    console.log(`Total operators: ${allOperators.length}`);

    // Group by phone number
    const phoneMap = new Map();
    const duplicates = [];
    
    for (const operator of allOperators) {
      const phone = operator.phone;
      
      if (!phone) continue; // Skip operators without phone numbers
      
      if (phoneMap.has(phone)) {
        // This is a duplicate - mark for deletion
        duplicates.push(operator.id);
        console.log(`Duplicate found: ${operator.company_name} (${phone})`);
      } else {
        // First occurrence - keep it
        phoneMap.set(phone, operator);
      }
    }

    console.log(`Found ${duplicates.length} duplicates to remove`);

    // Delete duplicates in batches
    let deleted = 0;
    const BATCH_SIZE = 50;
    
    for (let i = 0; i < duplicates.length; i += BATCH_SIZE) {
      const batch = duplicates.slice(i, i + BATCH_SIZE);
      
      for (const id of batch) {
        await base44.asServiceRole.entities.FutureEstateOperator.delete(id);
        deleted++;
      }
      
      console.log(`Deleted ${deleted} of ${duplicates.length} duplicates`);
    }

    return Response.json({
      success: true,
      total_operators: allOperators.length,
      duplicates_found: duplicates.length,
      duplicates_deleted: deleted,
      unique_operators_remaining: allOperators.length - deleted
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});