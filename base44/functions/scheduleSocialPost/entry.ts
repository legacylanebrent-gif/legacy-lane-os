import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });

  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { social_post_id, platform, scheduled_date, scheduled_time } = await req.json();
  if (!social_post_id) return Response.json({ error: 'social_post_id required' }, { status: 400 });

  // Check admin settings
  const settings = await base44.asServiceRole.entities.AdminAISettings.list('-created_date', 1);
  const s = settings[0] || {};
  if (!s.allow_social_scheduling) {
    return Response.json({ error: 'Social scheduling is disabled in Admin AI Settings. Enable allow_social_scheduling to use this feature.' }, { status: 403 });
  }

  // Load post
  const posts = await base44.asServiceRole.entities.SocialPostDraft.filter({ id: social_post_id });
  const post = posts[0];
  if (!post) return Response.json({ error: 'Post not found' }, { status: 404 });
  if (post.approval_status !== 'approved') return Response.json({ error: 'Post must be approved before scheduling.' }, { status: 400 });

  const webhookUrl = Deno.env.get('MAKE_SOCIAL_SCHEDULER_WEBHOOK_URL');
  if (!webhookUrl) {
    await base44.asServiceRole.entities.SocialPostDraft.update(social_post_id, {
      scheduling_status: 'failed', updated_at: new Date().toISOString(),
    });
    return Response.json({ error: 'Social scheduler webhook is not configured. Set MAKE_SOCIAL_SCHEDULER_WEBHOOK_URL environment variable.' }, { status: 503 });
  }

  const payload = {
    platform: platform || post.platform,
    caption: post.caption,
    hashtags: post.hashtags,
    image_url: post.image_url || '',
    scheduled_date: scheduled_date || post.post_date,
    scheduled_time: scheduled_time || post.post_time || '10:00',
    post_id: social_post_id,
    call_to_action: post.call_to_action || '',
  };

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Webhook returned ${res.status}`);
  } catch (err) {
    await base44.asServiceRole.entities.SocialPostDraft.update(social_post_id, {
      scheduling_status: 'failed', updated_at: new Date().toISOString(),
    });
    return Response.json({ error: 'Webhook delivery failed: ' + err.message }, { status: 502 });
  }

  await base44.asServiceRole.entities.SocialPostDraft.update(social_post_id, {
    scheduling_status: 'scheduled',
    post_date: scheduled_date || post.post_date,
    post_time: scheduled_time || post.post_time,
    updated_at: new Date().toISOString(),
  });

  return Response.json({ success: true, social_post_id, scheduling_status: 'scheduled', payload_sent: payload });
});