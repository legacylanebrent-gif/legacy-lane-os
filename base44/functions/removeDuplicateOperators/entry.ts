import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Fetching all Estate Sale Company Owners...');
    const allOperators = await base44.asServiceRole.entities.FutureEstateOperator.list('-created_date', 5000);
    
    console.log(`Total Estate Sale Company Owners: ${allOperators.length}`);

    // Group by phone number
    const phoneMap = new Map();
    const duplicates = [];
    
    for (const Estate Sale Company Owner of allOperators) {
      const phone = Estate Sale Company Owner.phone;
      
      if (!phone) continue; // Skip Estate Sale Company Owners without phone numbers
      
      if (phoneMap.has(phone)) {
        // This is a duplicate - mark for deletion
        duplicates.push(Estate Sale Company Owner.id);
        console.log(`Duplicate found: ${Estate Sale Company Owner.company_name} (${phone})`);
      } else {
        // First occurrence - keep it
        phoneMap.set(phone, Estate Sale Company Owner);
      }
    }

    console.log(`Found ${duplicates.length} duplicates to remove`);
    
    return Response.json({
      success: true,
      total_operators: allOperators.length,
      duplicates_found: duplicates.length,
      duplicate_ids: duplicates,
      message: 'Due to rate limits, deletion must be done manually or in smaller batches'
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});