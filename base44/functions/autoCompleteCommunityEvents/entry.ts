import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const today = new Date().toISOString().split('T')[0];

    // Find all published community events whose end_date has passed
    const events = await base44.asServiceRole.entities.CommunityEvent.filter({ status: 'published' });
    const expired = (events || []).filter(e => e.end_date && e.end_date < today);

    let completed = 0;
    for (const evt of expired) {
      await base44.asServiceRole.entities.CommunityEvent.update(evt.id, {
        status: 'completed',
        completed_at: new Date().toISOString()
      });
      completed++;
    }

    return Response.json({ success: true, completed, checked: events?.length || 0 });
  } catch (error) {
    console.error('Error auto-completing community events:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});