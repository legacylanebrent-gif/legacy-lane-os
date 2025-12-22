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

    // Delete duplicates with delay to avoid rate limits
    let deleted = 0;
    
    for (const id of duplicates) {
      await base44.asServiceRole.entities.FutureEstateOperator.delete(id);
      deleted++;
      
      if (deleted % 100 === 0) {
        console.log(`Deleted ${deleted} of ${duplicates.length} duplicates`);
        // Small delay every 100 deletions
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(`Completed: Deleted ${deleted} duplicates`);

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