import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import OpenAI from 'npm:openai';

const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });

const DEFAULT_BRAND_STYLE = 'Legacy Lane OS branded, polished, modern, trustworthy, estate sale business growth, cream/gold/black color palette, professional SaaS marketing style, clean typography, no text overlay';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });

  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { social_post_id, image_prompt, brand_style } = await req.json();
  if (!social_post_id) return Response.json({ error: 'social_post_id required' }, { status: 400 });

  const style = brand_style || DEFAULT_BRAND_STYLE;
  const fullPrompt = image_prompt
    ? `${image_prompt}. Style: ${style}.`
    : `Professional social media marketing image for Legacy Lane OS estate sale platform. ${style}.`;

  const now = new Date().toISOString();

  // Mark as generating
  await base44.asServiceRole.entities.SocialPostDraft.update(social_post_id, { image_status: 'generating', updated_at: now });

  let imageUrl;
  try {
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: fullPrompt.slice(0, 900),
      n: 1,
      size: '1024x1024',
      quality: 'standard',
    });
    imageUrl = response.data[0].url;
  } catch (err) {
    await base44.asServiceRole.entities.SocialPostDraft.update(social_post_id, { image_status: 'failed', updated_at: new Date().toISOString() });
    return Response.json({ error: 'Image generation failed: ' + err.message }, { status: 500 });
  }

  // Upload to permanent storage
  let finalUrl = imageUrl;
  try {
    const imgRes = await fetch(imageUrl);
    const blob = await imgRes.blob();
    const uploaded = await base44.asServiceRole.integrations.Core.UploadFile({ file: blob });
    finalUrl = uploaded.file_url || imageUrl;
  } catch (_) {
    // Fall back to OpenAI temp URL if upload fails
    finalUrl = imageUrl;
  }

  await base44.asServiceRole.entities.SocialPostDraft.update(social_post_id, {
    image_url: finalUrl,
    image_status: 'generated',
    updated_at: new Date().toISOString(),
  });

  return Response.json({ success: true, social_post_id, image_url: finalUrl });
});