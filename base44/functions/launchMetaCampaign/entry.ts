import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const META_ACCESS_TOKEN = Deno.env.get('META_ACCESS_TOKEN');

async function metaUpdate(objectId, status) {
  const res = await fetch(`https://graph.facebook.com/v19.0/${objectId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, access_token: META_ACCESS_TOKEN }),
  });
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return Response.json({ error: 'Method Not Allowed' }, { status: 405 });

  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user || user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

  const settings = await base44.asServiceRole.entities.AdminAISettings.list('-created_date', 1);
  const s = settings[0] || {};

  if (!s.allow_meta_campaign_launch) {
    return Response.json({ error: 'Campaign launch is disabled in Admin Settings. Enable allow_meta_campaign_launch first.' }, { status: 403 });
  }

  if (!META_ACCESS_TOKEN) {
    return Response.json({ error: 'META_ACCESS_TOKEN secret is not configured.' }, { status: 500 });
  }

  const { campaign_draft_id, confirmed } = await req.json();
  if (!confirmed) return Response.json({ error: 'Launch requires explicit confirmation (confirmed: true).' }, { status: 400 });
  if (!campaign_draft_id) return Response.json({ error: 'campaign_draft_id required' }, { status: 400 });

  const drafts = await base44.asServiceRole.entities.FacebookAdCampaignDraft.list('-created_at', 200);
  const draft = drafts.find(d => d.id === campaign_draft_id);
  if (!draft) return Response.json({ error: 'Campaign draft not found' }, { status: 404 });

  if (draft.status !== 'approved' && draft.status !== 'paused_in_meta') {
    return Response.json({ error: `Campaign must be approved before launch. Current status: ${draft.status}` }, { status: 400 });
  }

  if (!draft.meta_campaign_id || !draft.meta_ad_set_id) {
    return Response.json({ error: 'Campaign has not been pushed to Meta yet. Run createMetaCampaignDraft first.' }, { status: 400 });
  }

  // Activate campaign
  const campaignResult = await metaUpdate(draft.meta_campaign_id, 'ACTIVE');
  if (campaignResult.error) return Response.json({ error: 'Failed to activate campaign: ' + campaignResult.error.message }, { status: 500 });

  // Activate ad set
  await metaUpdate(draft.meta_ad_set_id, 'ACTIVE');

  // Activate individual ads
  const adIds = draft.meta_ad_ids?.ids || [];
  for (const adId of adIds) {
    await metaUpdate(adId, 'ACTIVE');
  }

  const now = new Date().toISOString();
  await base44.asServiceRole.entities.FacebookAdCampaignDraft.update(campaign_draft_id, {
    status: 'launched',
    updated_at: now,
  });

  console.log(`[launchMetaCampaign] Campaign ${draft.meta_campaign_id} launched by ${user.email}`);
  return Response.json({ success: true, campaign_id: draft.meta_campaign_id, launched_at: now, launched_by: user.email });
});