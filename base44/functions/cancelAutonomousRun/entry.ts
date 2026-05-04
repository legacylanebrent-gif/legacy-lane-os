import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });

  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { run_id } = await req.json();
  if (!run_id) return Response.json({ error: 'run_id is required' }, { status: 400 });

  const now = new Date().toISOString();

  await base44.asServiceRole.entities.AutonomousAgentRun.update(run_id, {
    status: 'cancelled',
    updated_at: now,
  });

  // Cancel pending/approved actions
  const actions = await base44.asServiceRole.entities.AutonomousAgentAction.filter({ run_id });
  for (const a of actions) {
    if (['pending', 'approved'].includes(a.status)) {
      await base44.asServiceRole.entities.AutonomousAgentAction.update(a.id, { status: 'cancelled', updated_at: now });
    }
  }

  return Response.json({ success: true, run_id, cancelled_by: user.full_name || user.email });
});