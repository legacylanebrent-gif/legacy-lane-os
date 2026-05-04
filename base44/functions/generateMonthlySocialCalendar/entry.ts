import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import OpenAI from 'npm:openai';

const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });

const CONTENT_CATEGORIES = [
  'Legacy Lane OS feature education',
  'Operator business growth',
  'Estate sale lead generation',
  'Referral program education',
  'AI automation benefits',
  'Territory opportunity',
  'Seller pain points solved',
  'Real estate agent partnership',
  'Behind-the-scenes platform value',
  'Monthly subscription ROI',
];

const SYSTEM_PROMPT = `You are the Legacy Lane OS Social Media Strategist AI. You create professional, benefits-driven social media content for Legacy Lane OS — a SaaS platform for estate sale operators.

BRAND VOICE: Professional, trustworthy, growth-focused, practical. Not hype. Not exaggerated claims.

COMPLIANCE RULES:
- Do NOT guarantee referral income to operators.
- Do NOT imply Legacy Lane or Houszu receives real estate commission directly.
- Use cautious language: "potential referral opportunities", "eligible to participate in referral programs", "subject to written agreements and applicable licensing requirements."
- Do not claim tax advantages or legal benefits.

PLATFORM GUIDELINES:
- Facebook: Community tone, longer captions, include stories and questions.
- Instagram: Visual, punchy, 1-3 sentence captions, heavy hashtags.
- LinkedIn: Professional, data-driven, thought leadership tone.

You must return ONLY valid JSON: { "calendar_title": "", "posts": [...] }
Each post object: { "post_date": "YYYY-MM-DD", "post_time": "HH:MM", "platform": "", "topic": "", "feature_or_benefit": "", "target_audience": "", "caption": "", "hashtags": "", "call_to_action": "", "image_prompt": "" }`;

Deno.serve(async (req) => {
  if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });

  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { month, year, platforms, posts_per_week, target_audience, campaign_theme, include_images } = await req.json();
  if (!month || !year) return Response.json({ error: 'month and year are required' }, { status: 400 });

  const pl = platforms?.length ? platforms : ['Facebook', 'Instagram', 'LinkedIn'];
  const ppw = posts_per_week || 5;
  const audience = target_audience || 'Estate sale operators, real estate agents, and estate liquidation business owners';
  const theme = campaign_theme || 'Legacy Lane OS platform features and business growth benefits';

  // Compute posting dates for the month
  const daysInMonth = new Date(year, new Date(`${month} 1, ${year}`).getMonth() + 1, 0).getDate();
  const monthNum = new Date(`${month} 1, ${year}`).getMonth() + 1;
  const totalPosts = Math.ceil((ppw / 7) * daysInMonth);

  const userPrompt = `Create a complete ${month} ${year} social media content calendar for Legacy Lane OS.

MONTH: ${month} ${year} (${daysInMonth} days, month number ${monthNum})
PLATFORMS: ${pl.join(', ')}
POSTS PER WEEK: ${ppw}
TOTAL POSTS: approximately ${totalPosts}
TARGET AUDIENCE: ${audience}
CAMPAIGN THEME: ${theme}
CONTENT CATEGORIES TO ROTATE: ${CONTENT_CATEGORIES.join(' | ')}
INCLUDE IMAGE PROMPTS: ${include_images !== false ? 'Yes — create detailed, branded image prompts for each post' : 'No'}

Distribute posts evenly across platforms and days. Rotate through all content categories.
Each caption must be complete and ready to publish — not a template.
Image prompts must be specific, branded, and visually descriptive.
Use dates in format YYYY-MM-DD (e.g. ${year}-${String(monthNum).padStart(2,'0')}-01).

Return JSON only.`;

  let aiResult;
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: userPrompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 8000,
    });
    aiResult = JSON.parse(completion.choices[0].message.content);
  } catch (err) {
    return Response.json({ error: 'AI error: ' + err.message }, { status: 500 });
  }

  const now = new Date().toISOString();

  // Create calendar record
  const calendar = await base44.asServiceRole.entities.SocialContentCalendar.create({
    title: aiResult.calendar_title || `Legacy Lane OS — ${month} ${year} Social Calendar`,
    month, year: parseInt(year), campaign_theme: theme,
    target_audience: audience, platforms: pl,
    posts_per_week: ppw, total_posts: (aiResult.posts || []).length,
    status: 'draft', created_by: user.email, created_at: now, updated_at: now,
  });

  // Save all posts
  const savedPosts = [];
  for (const post of (aiResult.posts || [])) {
    const rec = await base44.asServiceRole.entities.SocialPostDraft.create({
      calendar_id: calendar.id,
      post_date: post.post_date,
      post_time: post.post_time || '10:00',
      platform: post.platform,
      topic: post.topic || '',
      feature_or_benefit: post.feature_or_benefit || '',
      target_audience: post.target_audience || audience,
      caption: post.caption || '',
      hashtags: post.hashtags || '',
      call_to_action: post.call_to_action || '',
      image_prompt: post.image_prompt || '',
      image_status: 'not_generated',
      approval_status: 'draft',
      scheduling_status: 'not_scheduled',
      publishing_status: 'not_published',
      created_by: user.email, created_at: now, updated_at: now,
    });
    savedPosts.push(rec);
  }

  return Response.json({ success: true, calendar_id: calendar.id, calendar_title: calendar.title, total_posts: savedPosts.length });
});