import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import OpenAI from 'npm:openai';

function toSlug(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').trim().replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
}

// ─── Step 1: Analyze inventory and pick best blog topics ─────────────────────
async function selectBlogTopics(openai, sale, items) {
  const itemSummary = items.slice(0, 40).map(i =>
    [i.item_name, i.brand_name, i.category_name, i.style, i.estimated_age].filter(Boolean).join(' | ')
  ).join('\n');

  const categories = [...new Set(items.map(i => i.category_name).filter(Boolean))];
  const brands = [...new Set(items.map(i => i.brand_name).filter(Boolean))].slice(0, 15);

  const prompt = `You are an SEO content strategist for EstateSalen.com, an estate sale marketplace.

Analyze this estate sale inventory and identify the 3-10 strongest SEO blog post opportunities.

SALE: ${sale.title}
LOCATION: ${sale.property_address?.city || ''}, ${sale.property_address?.state || ''}
CATEGORIES: ${categories.join(', ')}
BRANDS: ${brands.join(', ')}
ITEMS (sample):
${itemSummary}

Return JSON only:
{
  "topics": [
    {
      "title": "",
      "slug": "",
      "angle": "",
      "target_keyword": "",
      "confidence_score": 0,
      "reasoning": "",
      "related_brands": [],
      "related_categories": [],
      "word_count_target": 0
    }
  ]
}

Rules:
- Generate 3-10 topics, ranked by SEO opportunity
- Titles should match real search queries (e.g. "How Much Is Vintage Pyrex Worth?", "How To Identify Waterford Crystal", "Estate Sale Jewelry Buying Guide")
- slug: URL-safe, no trailing slashes
- angle: the editorial angle (e.g. "value guide", "identification guide", "buying guide", "collector's guide", "trend analysis")
- target_keyword: the primary keyword phrase this post targets
- confidence_score: 0-100 (80+ = auto-publish, under 80 = save as draft). Base on: search demand likelihood, inventory specificity, content uniqueness potential.
- reasoning: 1-2 sentences on why this topic has SEO value
- related_brands: relevant brands from the inventory for this topic
- related_categories: relevant categories for this topic
- word_count_target: 1200-2500 based on topic depth needed`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.4,
    max_tokens: 1200,
  });

  try {
    const parsed = JSON.parse(completion.choices[0].message.content);
    return parsed.topics || [];
  } catch {
    return [];
  }
}

// ─── Step 2: Write the full blog article ─────────────────────────────────────
async function writeArticle(openai, topic, sale, relevantItems, soldExamples) {
  const itemExamples = relevantItems.slice(0, 10).map(i => {
    const parts = [i.item_name, i.brand_name, i.style, i.estimated_age, i.condition_summary];
    const price = i.sold_price ? `sold $${i.sold_price}` : (i.value_low ? `est. $${i.value_low}–$${i.value_high}` : '');
    return parts.filter(Boolean).join(', ') + (price ? ` (${price})` : '');
  }).join('\n');

  const saleCity = sale.property_address?.city || '';
  const saleState = sale.property_address?.state || '';
  const saleLink = sale.seo_slug ? `https://estatesalen.com${sale.seo_slug}` : `https://estatesalen.com/sales/${sale.id}`;

  const prompt = `You are an expert estate sale content writer for EstateSalen.com.

Write a comprehensive, SEO-optimized blog post.

TITLE: ${topic.title}
TARGET KEYWORD: ${topic.target_keyword}
ANGLE: ${topic.angle}
WORD COUNT TARGET: ${topic.word_count_target || 1500} words

REAL INVENTORY EXAMPLES TO REFERENCE:
${itemExamples || 'Various estate sale items'}

SALE TO LINK TO:
"${sale.title}" in ${saleCity}${saleState ? ', ' + saleState : ''} — ${saleLink}

Write a complete blog post in markdown. Requirements:
1. Use the exact title as H1
2. Include a compelling intro (2-3 paragraphs)
3. Use H2 and H3 subheadings throughout
4. Cover: what buyers look for, how to identify, value ranges, condition factors, where to find, tips
5. Naturally reference the real items from the inventory above as examples
6. Include a section linking to the estate sale: "See These Items at ${sale.title}"
7. End with a strong conclusion and CTA to browse estate sales
8. Write in an authoritative, helpful tone — not salesy
9. Aim for exactly ${topic.word_count_target || 1500} words
10. Do NOT include the slug or meta data in the output — only the markdown article body`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.5,
    max_tokens: 3500,
  });

  return completion.choices[0].message.content || '';
}

// ─── Step 3: Generate meta data for the post ─────────────────────────────────
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

// ─── Build schema ─────────────────────────────────────────────────────────────
function buildBlogSchema(title, slug, metaDesc, publishedAt) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description: metaDesc,
    url: `https://estatesalen.com${slug}`,
    datePublished: publishedAt,
    dateModified: publishedAt,
    publisher: { '@type': 'Organization', name: 'EstateSalen.com', url: 'https://estatesalen.com' },
    author: { '@type': 'Organization', name: 'EstateSalen.com' },
  };
}

// ─── Append internal links to article ────────────────────────────────────────
function appendInternalLinks(article, topic, sale, relatedItems) {
  let links = '\n\n---\n\n## Related Resources\n\n';

  // Sale link
  const saleSlug = sale.seo_slug || `/sales/${sale.id}`;
  links += `- [**${sale.title}** — Browse this estate sale](${saleSlug})\n`;

  // Brand links
  if (topic.related_brands?.length) {
    topic.related_brands.slice(0, 4).forEach(brand => {
      links += `- [${brand} at Estate Sales](/brands/${toSlug(brand)})\n`;
    });
  }

  // Category links
  if (topic.related_categories?.length) {
    topic.related_categories.slice(0, 4).forEach(cat => {
      links += `- [${cat} Estate Sale Guide](/categories/${toSlug(cat)})\n`;
    });
  }

  // Item links
  relatedItems.filter(i => i.slug).slice(0, 4).forEach(item => {
    links += `- [${item.item_name || 'View Item'}](/items/${item.slug})\n`;
  });

  links += `\n[Find more estate sales near you](/estate-sales/finder)\n`;
  return article + links;
}

// ─── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Accept direct call { sale_id } or entity automation payload
    const saleId = body?.sale_id || body?.data?.id || body?.event?.entity_id;

    if (!saleId) return Response.json({ error: 'sale_id is required' }, { status: 400 });

    // Load the sale
    const sales = await base44.asServiceRole.entities.EstateSale.filter({ id: saleId });
    const sale = sales[0];
    if (!sale) return Response.json({ error: 'Sale not found' }, { status: 404 });

    // Only run for published sales
    if (!['upcoming', 'active'].includes(sale.status)) {
      return Response.json({ message: 'Sale is not published — skipping blog generation', status: sale.status });
    }

    // Load SEOItemProfiles for this sale
    const items = await base44.asServiceRole.entities.SEOItemProfile.filter({ sale_id: saleId });
    if (items.length === 0) {
      return Response.json({ message: 'No item profiles found for this sale — skipping', sale_id: saleId });
    }

    const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });

    // Step 1: Select blog topics
    const topics = await selectBlogTopics(openai, sale, items);
    if (!topics.length) return Response.json({ message: 'No blog topics identified', sale_id: saleId });

    const results = [];

    for (const topic of topics) {
      const slug = `/blog/${toSlug(topic.slug || topic.title)}`;

      // Skip if this exact slug already exists
      const existingPages = await base44.asServiceRole.entities.SEOPage.filter({ slug });
      if (existingPages.length > 0) {
        results.push({ slug, status: 'skipped_exists' });
        continue;
      }

      // Find relevant items for this topic
      const relevantItems = items.filter(i =>
        topic.related_brands?.includes(i.brand_name) ||
        topic.related_categories?.includes(i.category_name)
      ).slice(0, 15);
      const fallbackItems = relevantItems.length > 0 ? relevantItems : items.slice(0, 10);
      const soldExamples = fallbackItems.filter(i => i.sold_status === 'sold').slice(0, 5);

      // Step 2: Write article
      const rawArticle = await writeArticle(openai, topic, sale, fallbackItems, soldExamples);

      // Step 3: Meta data
      const meta = await generateBlogMeta(openai, topic.title, topic.target_keyword, rawArticle);

      // Append internal links
      const fullArticle = appendInternalLinks(rawArticle, topic, sale, fallbackItems);

      const publishedAt = new Date().toISOString();
      const isHighConfidence = (topic.confidence_score || 0) >= 80;
      const pageStatus = isHighConfidence ? 'published' : 'draft';

      const schema = buildBlogSchema(meta.seo_title || topic.title, slug, meta.meta_description || '', publishedAt);

      const pageData = {
        page_type: 'blog',
        entity_id: saleId,
        slug,
        title: meta.seo_title || topic.title,
        meta_description: meta.meta_description || '',
        h1: meta.h1 || topic.title,
        intro_content: topic.reasoning || '',
        main_content: fullArticle,
        faq_json: [],
        schema_json: schema,
        canonical_url: `https://estatesalen.com${slug}`,
        status: pageStatus,
        indexed_status: 'not_submitted',
        published_at: isHighConfidence ? publishedAt : null,
      };

      await base44.asServiceRole.entities.SEOPage.create(pageData);

      results.push({
        slug,
        title: topic.title,
        confidence_score: topic.confidence_score,
        status: pageStatus,
        word_count: fullArticle.split(/\s+/).length,
      });
    }

    return Response.json({
      message: 'Blog post generation complete',
      sale_id: saleId,
      sale_title: sale.title,
      topics_evaluated: topics.length,
      posts_created: results.filter(r => r.status !== 'skipped_exists').length,
      auto_published: results.filter(r => r.status === 'published').length,
      saved_as_draft: results.filter(r => r.status === 'draft').length,
      skipped: results.filter(r => r.status === 'skipped_exists').length,
      posts: results,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});