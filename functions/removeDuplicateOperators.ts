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

    // Process in smaller chunks to avoid timeout
    const chunkSize = 500;
    let totalDeleted = 0;
    
    for (let i = 0; i < duplicates.length; i += chunkSize) {
      const chunk = duplicates.slice(i, Math.min(i + chunkSize, duplicates.length));
      
      for (const id of chunk) {
        try {
          await base44.asServiceRole.entities.FutureEstateOperator.delete(id);
          totalDeleted++;
        } catch (error) {
          console.error(`Failed to delete ${id}: ${error.message}`);
        }
        
        if (totalDeleted % 50 === 0) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      console.log(`Progress: Deleted ${totalDeleted} of ${duplicates.length} duplicates`);
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