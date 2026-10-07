import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const companyName = (body.company_name || user.company_name || user.full_name || 'our team').toString().slice(0, 120);
    const city = (body.city || user.city || '').toString().slice(0, 80);
    const state = (body.state || user.state || '').toString().slice(0, 40);
    const specialty = (body.specialty || user.specialty || user.company_type || 'estate sales').toString().slice(0, 120);
    const used = Array.isArray(body.used) ? body.used.filter(t => typeof t === 'string').slice(0, 40).join(' | ').slice(0, 2000) : '';

    const prompt = `You are a social media content coach for estate sale companies. Generate 6 short, ready-to-post social media captions for a company.

Company: "${companyName}"${city ? `\nLocation: ${city}${state ? ', ' + state : ''}` : ''}${specialty ? `\nSpecialty: ${specialty}` : ''}

Rules:
- Tones should be fun, warm, and engaging — the kind of post neighbors actually reply to. NOT corporate or salesy.
- Absolutely NO specific sale announcements (no dates, addresses, prices, or "this weekend at" posts). This company already posts sale promos elsewhere.
- 3 posts in category "promote" (build the business brand: credibility, behind-the-scenes, team pride, testimonials, expertise, before/after flavor without a specific sale).
- 3 posts in category "discussion" (conversation starters: polls, questions, "coolest thing you ever found", local antique/treasure talk, nostalgia about the town).
- Each post is 1-3 sentences, natural voice, no hashtag walls (at most 1-2 light hashtags, or none).
- Where it fits naturally, include the company name "${companyName}" — otherwise write so it works as-is.
${used ? `\nThese ideas were already given (avoid repeating them): ${used}` : ''}

Return exactly 6 posts.`;

    const res = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          posts: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                category: { type: 'string', enum: ['promote', 'discussion'] },
                text: { type: 'string' },
                why: { type: 'string' }
              },
              required: ['category', 'text']
            }
          }
        },
        required: ['posts']
      }
    });

    const posts = (res && res.posts) || [];
    return Response.json({ posts });
  } catch (error) {
    console.error('generateOperatorPostIdeas error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}