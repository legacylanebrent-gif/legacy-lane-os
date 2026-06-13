import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { operatorId } = await req.json();

        if (!operatorId) {
            return Response.json({ error: 'operatorId is required' }, { status: 400 });
        }

        // Use service role to bypass User entity RLS for guest visitors
        const operator = await base44.asServiceRole.entities.User.get(operatorId);
        
        if (!operator) {
            return Response.json({ operator: null }, { status: 200 });
        }

        return Response.json({ operator });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});