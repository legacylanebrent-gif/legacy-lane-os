import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import OpenAI from 'npm:openai';

const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return Response.json({ error: 'Method Not Allowed' }, { status: 405 });

  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user || user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

  const { creative_draft_id, image_prompt } = await req.json();
  if (!creative_draft_id) return Response.json({ error: 'creative_draft_id is required' }, { status: 400 });

  const brandedPrompt = `${image_prompt}. Style: Professional, modern, clean SaaS marketing aesthetic. Colors: cream, gold, dark navy. Legacy Lane OS brand. No text overlays. High quality, photorealistic or polished illustration style suitable for Facebook/Instagram ads.`;

  const imgResponse = await openai.images.generate({
    model: 'dall-e-3',
    prompt: brandedPrompt,
    n: 1,
    size: '1024x1024',
    quality: 'standard',
  });

  const tempUrl = imgResponse.data[0].url;

  // Upload to permanent storage
  const imgFetch = await fetch(tempUrl);
  const imgBlob = await imgFetch.blob();
  const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ file: imgBlob });

  const now = new Date().toISOString();
  await base44.asServiceRole.entities.FacebookAdCreativeDraft.update(creative_draft_id, {
    image_url: file_url,
    updated_at: now,
  });

  console.log(`[generateFacebookAdImage] Image generated for creative ${creative_draft_id}`);
  return Response.json({ success: true, image_url: file_url });
});