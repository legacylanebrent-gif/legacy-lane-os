import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { leads, assignToOperatorId = null, autoRoute = false } = body;

    if (!leads || leads.length === 0) {
      return Response.json({ error: 'No leads provided' }, { status: 400 });
    }

    const imported = [];
    const failed = [];

    for (const leadData of leads) {
      try {
        // Check for duplicate (by propstream_id)
        if (leadData.propstream_id) {
          const existing = await base44.entities.Lead.filter({
            propstream_id: leadData.propstream_id
          });
          if (existing.length > 0) {
            failed.push({
              lead: leadData.contact_name,
              reason: 'Duplicate - already imported'
            });
            continue;
          }
        }

        // Create lead
        const newLead = await base44.entities.Lead.create({
          ...leadData,
          routed_to: assignToOperatorId || null,
          source: 'propstream',
          created_date: new Date().toISOString()
        });

        imported.push(newLead);

        // Auto-route if enabled
        if (autoRoute && !assignToOperatorId) {
          const bestOperator = await findBestOperator(base44, leadData);
          if (bestOperator) {
            await base44.entities.Lead.update(newLead.id, {
              routed_to: bestOperator.id
            });
          }
        }
      } catch (error) {
        console.error(`Error importing lead ${leadData.contact_name}:`, error.message);
        failed.push({
          lead: leadData.contact_name,
          reason: error.message
        });
      }
    }

    return Response.json({
      status: 'success',
      imported: imported.length,
      failed: failed.length,
      leads: imported,
      failures: failed
    });

  } catch (error) {
    console.error('Error in importPropstreamLeads:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function findBestOperator(base44, leadData) {
  try {
    // Fetch all active operators
    const operators = await base44.asServiceRole.entities.User.filter({
      primary_account_type: 'estate_sale_operator'
    });

    if (operators.length === 0) return null;

    // Simple scoring: prefer operator in same state/region
    let bestOperator = operators[0];
    let bestScore = 0;

    for (const op of operators) {
      let score = Math.random() * 50; // Base random score

      // Territory match bonus
      if (op.service_territories?.includes(leadData.property_address?.split(',')[1]?.trim())) {
        score += 30;
      }

      if (score > bestScore) {
        bestScore = score;
        bestOperator = op;
      }
    }

    return bestOperator;
  } catch (error) {
    console.error('Error finding best operator:', error);
    return null;
  }
}