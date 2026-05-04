import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function parseTaskLines(text) {
  if (!text) return [];
  return text
    .split('\n')
    .map(line => line.replace(/^\d+[\.\)]\s*/, '').replace(/^[-•*]\s*/, '').trim())
    .filter(line => line.length > 10);
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

  let body;
  try { body = await req.json(); } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { report_id, actions_text, next_steps_text } = body;

  const actionLines = parseTaskLines(actions_text);
  const nextStepLines = parseTaskLines(next_steps_text);

  const allTasks = [
    ...actionLines.map(t => ({ title: t, category: 'Recommended Action', priority: 'high' })),
    ...nextStepLines.map(t => ({ title: t, category: 'Next Step', priority: 'medium' })),
  ];

  const now = new Date().toISOString();
  const created = [];

  for (const task of allTasks.slice(0, 30)) {
    const record = await base44.asServiceRole.entities.AdminTask.create({
      title: task.title.slice(0, 200),
      category: task.category,
      priority: task.priority,
      status: 'open',
      source: 'Admin AI Operator',
      related_report_id: report_id || '',
      created_by: user.email,
      created_at: now,
      updated_at: now,
    });
    created.push(record);
  }

  return Response.json({ success: true, tasks_created: created.length, tasks: created });
});