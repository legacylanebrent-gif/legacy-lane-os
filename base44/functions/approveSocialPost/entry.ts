import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });

  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { social_post_id } = await req.json();
  if (!social_post_id) return Response.json({ error: 'social_post_id required' }, { status: 400 });

  await base44.asServiceRole.entities.SocialPostDraft.update(social_post_id, {
    approval_status: 'approved',
    updated_at: new Date().toISOString(),
  });

  return Response.json({ success: true, social_post_id, approval_status: 'approved' });
});