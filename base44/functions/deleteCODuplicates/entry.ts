import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Fetching CO operators...');
    const operators = await base44.asServiceRole.entities.FutureEstateOperator.filter(
      { state: 'CO' },
      '-created_date',
      1000
    );
    
    console.log(`Total CO operators: ${operators.length}`);

    const phoneMap = new Map();
    const toDelete = [];
    
    for (const operator of operators) {
      const phone = operator.phone;
      
      if (!phone) continue;
      
      if (phoneMap.has(phone)) {
        toDelete.push(operator.id);
        console.log(`Duplicate: ${operator.company_name} (${phone}) - will delete`);
      } else {
        phoneMap.set(phone, operator);
      }
    }

    console.log(`Found ${toDelete.length} duplicates in CO`);
    
    let deleted = 0;
    const batchSize = 10;
    
    for (let i = 0; i < toDelete.length; i += batchSize) {
      const batch = toDelete.slice(i, i + batchSize);
      
      for (const id of batch) {
        try {
          await base44.asServiceRole.entities.FutureEstateOperator.delete(id);
          deleted++;
          console.log(`Deleted ${deleted}/${toDelete.length}`);
        } catch (error) {
          console.error(`Failed to delete ${id}:`, error.message);
        }
      }
      
      if (i + batchSize < toDelete.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return Response.json({
      success: true,
      state: 'CO',
      total_operators: operators.length,
      duplicates_deleted: deleted,
      remaining: operators.length - deleted
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});