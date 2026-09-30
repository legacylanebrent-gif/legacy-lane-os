import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Fetching NJ operators...');
    const operators = await base44.asServiceRole.entities.FutureEstateOperator.filter(
      { state: 'NJ' },
      '-created_date',
      1000
    );
    
    console.log(`Total NJ operators: ${operators.length}`);

    // Group by normalized phone number
    const phoneMap = {};
    for (const operator of operators) {
      const phone = operator.phone ? operator.phone.replace(/\D/g, '') : null;
      if (!phone || phone.length < 7) continue; // skip no-phone companies entirely
      if (!phoneMap[phone]) phoneMap[phone] = [];
      phoneMap[phone].push(operator);
    }

    // Keep the richest record (most populated fields), delete the rest
    const toDelete = [];
    for (const group of Object.values(phoneMap)) {
      if (group.length <= 1) continue;
      group.sort((a, b) => {
        const scoreA = Object.values(a).filter(v => v !== null && v !== undefined && v !== '').length;
        const scoreB = Object.values(b).filter(v => v !== null && v !== undefined && v !== '').length;
        return scoreB - scoreA; // richest first
      });
      for (let i = 1; i < group.length; i++) {
        toDelete.push(group[i].id);
        console.log(`Duplicate: ${group[i].company_name} (${group[i].phone}) - will delete (keeping richer record)`);
      }
    }

    console.log(`Found ${toDelete.length} duplicates in NJ`);
    
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
      state: 'NJ',
      total_operators: operators.length,
      duplicates_deleted: deleted,
      remaining: operators.length - deleted
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});