import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import OpenAI from 'npm:openai';

function toSlug(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').trim().replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
}

async function writeArticle(openai, suggestion, items) {
  const itemExamples = items.slice(0, 10).map(i => {
    const parts = [i.item_name, i.brand_name, i.style, i.estimated_age, i.condition_summary];
    const price = i.sold_price ? `sold $${i.sold_price}` : (i.value_low ? `est. $${i.value_low}–$${i.value_high}` : '');
    return parts.filter(Boolean).join(', ') + (price ? ` (${price})` : '');
  }).join('\n');

  const locationStr = [suggestion.company_city, suggestion.company_state].filter(Boolean).join(', ');

  const prompt = `You are an expert estate sale content writer for EstateSalen.com.

Write a comprehensive, SEO-optimized blog post.

TITLE: ${suggestion.title}
TARGET KEYWORD: ${suggestion.target_keyword}
ANGLE: ${suggestion.angle}
WORD COUNT TARGET: ${suggestion.word_count_target || 1500} words

COMPANY FEATURED: ${suggestion.company_name} — estate sale administered in ${locationStr}
COMPANY PROFILE: ${suggestion.company_profile_url}

REAL INVENTORY EXAMPLES TO REFERENCE:
${itemExamples || 'Various estate sale items'}

Write a complete blog post in markdown. Requirements:
1. Use the exact title as H1
2. Include a compelling intro (2-3 paragraphs)
3. Use H2 and H3 subheadings throughout
4. Cover: what buyers look for, how to identify, value ranges, condition factors, where to find, tips
5. Naturally reference the real items from the inventory above as examples — mention they were part of an estate sale administered by ${suggestion.company_name} in ${locationStr}
6. Include a section near the end: "Items Like These Available at ${suggestion.company_name}" which links to their company profile at ${suggestion.company_profile_url}
7. Include a contact CTA: "Have questions about a specific item? Contact ${suggestion.company_name} through their EstateSalen.com profile: ${suggestion.company_profile_url}"
8. End with a strong conclusion and CTA to browse estate sales on EstateSalen.com
9. Write in an authoritative, helpful tone — not salesy
10. Aim for exactly ${suggestion.word_count_target || 1500} words
11. Do NOT include the slug or meta data in the output — only the markdown article body
12. Do NOT reference specific estate sale names or dates — the sales will be completed and unavailable`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.5,
    max_tokens: 3500,
  });

  return completion.choices[0].message.content || '';
}

async function generateBlogMeta(openai, title, targetKeyword, articleSnippet) {
  const prompt = `Generate SEO meta data for this blog post.

TITLE: ${title}
TARGET KEYWORD: ${targetKeyword}
ARTICLE SNIPPET: ${articleSnippet.slice(0, 400)}

Return JSON only:
{
  "seo_title": "",
  "meta_description": "",
  "h1": ""
}

Rules:
- seo_title: max 60 chars, include target keyword naturally
- meta_description: max 155 chars, include keyword, compelling CTA
- h1: same as or close variant of the blog title`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 200,
  });

  try { return JSON.parse(completion.choices[0].message.content); }
  catch { return { seo_title: title.slice(0, 60), meta_description: `${title} — Learn more on EstateSalen.com.`, h1: title }; }
}

function buildBlogSchema(title, slug, metaDesc, publishedAt, imageUrl) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description: metaDesc,
    url: `https://estatesalen.com${slug}`,
    datePublished: publishedAt,
    dateModified: publishedAt,
    ...(imageUrl ? { image: imageUrl } : {}),
    publisher: { '@type': 'Organization', name: 'EstateSalen.com', url: 'https://estatesalen.com' },
    author: { '@type': 'Organization', name: 'EstateSalen.com' },
  };
}

function appendInternalLinks(article, suggestion) {
  let links = '\n\n---\n\n## Related Resources\n\n';
  links += `- [**${suggestion.company_name}** — View their EstateSalen.com profile](${suggestion.company_profile_url})\n`;

  if (suggestion.related_brands?.length) {
    suggestion.related_brands.slice(0, 4).forEach(brand => {
      links += `- [${brand} at Estate Sales](/brands/${toSlug(brand)})\n`;
    });
  }

  if (suggestion.related_categories?.length) {
    suggestion.related_categories.slice(0, 4).forEach(cat => {
      links += `- [${cat} Estate Sale Guide](/categories/${toSlug(cat)})\n`;
    });
  }

  links += `\n[Find estate sales near you](/estate-sales/finder)\n`;
  return article + links;
}

// ─── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized — admin only' }, { status: 403 });
    }

    const body = await req.json();
    const { suggestion_ids } = body;

    if (!suggestion_ids || !suggestion_ids.length) {
      return Response.json({ error: 'No suggestion_ids provided' }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });
    const results = [];

    for (const sid of suggestion_ids) {
      try {
        const suggestions = await base44.asServiceRole.entities.BlogTopicSuggestion.filter({ id: sid });
        const suggestion = suggestions[0];
        if (!suggestion) {
          results.push({ id: sid, status: 'not_found' });
          continue;
        }

        // Skip already created
        if (suggestion.status === 'created') {
          results.push({ id: sid, status: 'already_created', title: suggestion.title });
          continue;
        }

        // Check slug not already taken
        const existingPages = await base44.asServiceRole.entities.SEOPage.filter({ slug: suggestion.slug });
        if (existingPages.length > 0) {
          await base44.asServiceRole.entities.BlogTopicSuggestion.update(sid, {
            status: 'dismissed',
            duplicate_of_title: 'Slug already exists',
          });
          results.push({ id: sid, status: 'slug_conflict', title: suggestion.title });
          continue;
        }

        // Fetch items for this sale
        const items = await base44.asServiceRole.entities.SEOItemProfile.filter({ sale_id: suggestion.sale_id });
        const relevantItems = items.filter(i =>
          suggestion.related_brands?.includes(i.brand_name) ||
          suggestion.related_categories?.includes(i.category_name)
        ).slice(0, 15);
        const fallbackItems = relevantItems.length > 0 ? relevantItems : items.slice(0, 10);

        // Generate article
        const rawArticle = await writeArticle(openai, suggestion, fallbackItems);
        const meta = await generateBlogMeta(openai, suggestion.title, suggestion.target_keyword, rawArticle);
        const fullArticle = appendInternalLinks(rawArticle, suggestion);

        const publishedAt = new Date().toISOString();
        const isHighConfidence = (suggestion.confidence_score || 0) >= 80;
        const pageStatus = isHighConfidence ? 'published' : 'draft';

        const schema = buildBlogSchema(meta.seo_title || suggestion.title, suggestion.slug, meta.meta_description || '', publishedAt, suggestion.image_url);

        await base44.asServiceRole.entities.SEOPage.create({
          page_type: 'blog',
          entity_id: suggestion.sale_id,
          slug: suggestion.slug,
          title: meta.seo_title || suggestion.title,
          meta_description: meta.meta_description || '',
          h1: meta.h1 || suggestion.title,
          intro_content: suggestion.reasoning || '',
          main_content: fullArticle,
          image_url: suggestion.image_url || '',
          faq_json: [],
          schema_json: schema,
          canonical_url: `https://estatesalen.com${suggestion.slug}`,
          status: pageStatus,
          indexed_status: 'not_submitted',
          published_at: isHighConfidence ? publishedAt : null,
        });

        await base44.asServiceRole.entities.BlogTopicSuggestion.update(sid, { status: 'created' });

        results.push({
          id: sid,
          title: suggestion.title,
          slug: suggestion.slug,
          status: pageStatus,
          word_count: fullArticle.split(/\s+/).length,
        });
      } catch (err) {
        results.push({ id: sid, status: 'error', error: err.message });
      }
    }

    return Response.json({
      message: `Processed ${suggestion_ids.length} suggestions — ${results.filter(r => r.status === 'published' || r.status === 'draft').length} created`,
      results,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});