import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Authenticate user
        const user = await base44.auth.me();
        if (!user || !['super_admin', 'platform_ops'].includes(user.primary_account_type || user.primary_role)) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        let updated = 0;
        let processed = 0;

        // Get all FutureEstateOperator records
        const operators = await base44.asServiceRole.entities.FutureEstateOperator.list('-created_date', 50000);
        
        for (const operator of operators) {
            processed++;
            let needsUpdate = false;
            const updates = {};

            // Check and clean all text fields
            const fields = ['company_name', 'city', 'state', 'phone', 'website', 'member_since', 
                          'package_type', 'facebook', 'twitter', 'instagram', 'youtube', 'pinterest'];
            
            for (const field of fields) {
                if (operator[field] && typeof operator[field] === 'string' && operator[field].includes('&amp;')) {
                    updates[field] = operator[field].replace(/&amp;/g, '&');
                    needsUpdate = true;
                }
            }

            if (needsUpdate) {
                await base44.asServiceRole.entities.FutureEstateOperator.update(operator.id, updates);
                updated++;
            }
        }

        return Response.json({
            success: true,
            processed,
            updated,
            message: `Processed ${processed} operators, updated ${updated} records`
        });

    } catch (error) {
        console.error('Error cleaning ampersands:', error);
        return Response.json({ 
            error: error.message,
            stack: error.stack 
        }, { status: 500 });
    }
});