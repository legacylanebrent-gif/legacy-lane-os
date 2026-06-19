import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import OpenAI from 'npm:openai';

function toSlug(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').trim().replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
}

// ─── Step 1: Analyze inventory and pick best blog topics ─────────────────────
async function selectBlogTopics(openai, sale, companyName, companyCity, items) {
  const itemSummary = items.slice(0, 40).map(i =>
    [i.item_name, i.brand_name, i.category_name, i.style, i.estimated_age].filter(Boolean).join(' | ')
  ).join('\n');

  const categories = [...new Set(items.map(i => i.category_name).filter(Boolean))];
  const brands = [...new Set(items.map(i => i.brand_name).filter(Boolean))].slice(0, 15);

  const prompt = `You are an SEO content strategist for EstateSalen.com, an estate sale marketplace.

Analyze this estate sale company's inventory and identify the 3-10 strongest SEO blog post opportunities.

COMPANY: ${companyName}
LOCATION: ${companyCity}${sale.property_address?.state ? ', ' + sale.property_address.state : ''}
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
async function writeArticle(openai, topic, companyName, companyCity, companyState, companyProfileUrl, relevantItems, soldExamples) {
  const itemExamples = relevantItems.slice(0, 10).map(i => {
    const parts = [i.item_name, i.brand_name, i.style, i.estimated_age, i.condition_summary];
    const price = i.sold_price ? `sold $${i.sold_price}` : (i.value_low ? `est. $${i.value_low}–$${i.value_high}` : '');
    return parts.filter(Boolean).join(', ') + (price ? ` (${price})` : '');
  }).join('\n');

  const locationStr = [companyCity, companyState].filter(Boolean).join(', ');

  const prompt = `You are an expert estate sale content writer for EstateSalen.com.

Write a comprehensive, SEO-optimized blog post.

TITLE: ${topic.title}
TARGET KEYWORD: ${topic.target_keyword}
ANGLE: ${topic.angle}
WORD COUNT TARGET: ${topic.word_count_target || 1500} words

COMPANY FEATURED: ${companyName} — based in ${locationStr}
COMPANY PROFILE: ${companyProfileUrl}

REAL INVENTORY EXAMPLES TO REFERENCE:
${itemExamples || 'Various estate sale items'}

Write a complete blog post in markdown. Requirements:
1. Use the exact title as H1
2. Include a compelling intro (2-3 paragraphs)
3. Use H2 and H3 subheadings throughout
4. Cover: what buyers look for, how to identify, value ranges, condition factors, where to find, tips
5. Naturally reference the real items from the inventory above as examples — mention they were part of an estate handled by ${companyName} in ${locationStr}
6. Include a section near the end: "Items Like These Available at ${companyName}" which links to their company profile at ${companyProfileUrl}
7. Include a contact CTA: "Have questions about a specific item? Contact ${companyName} through their EstateSalen.com profile: ${companyProfileUrl}"
8. End with a strong conclusion and CTA to browse estate sales on EstateSalen.com
9. Write in an authoritative, helpful tone — not salesy
10. Aim for exactly ${topic.word_count_target || 1500} words
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

// ─── Append internal links to article ────────────────────────────────────────
function appendInternalLinks(article, topic, companyName, companyProfileUrl, relatedItems) {
  let links = '\n\n---\n\n## Related Resources\n\n';

  // Company profile link
  links += `- [**${companyName}** — View their EstateSalen.com profile](${companyProfileUrl})\n`;

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

  links += `\n[Find estate sales near you](/estate-sales/finder)\n`;
  return article + links;
}

// ─── Find the best item image for a topic ────────────────────────────────────
function findTopicImage(items, topic) {
  // First: find items matching the topic's brands or categories
  const matching = items.filter(i =>
    (topic.related_brands?.includes(i.brand_name)) ||
    (topic.related_categories?.includes(i.category_name)) ||
    (topic.title && i.item_name && topic.title.toLowerCase().split(' ').some(w =>
      w.length > 3 && i.item_name.toLowerCase().includes(w)
    ))
  );

  // Return the first matching item with an image
  for (const item of matching) {
    if (item.image_url) return item.image_url;
  }

  // Fallback: first item with any image
  for (const item of items) {
    if (item.image_url) return item.image_url;
  }

  return null;
}

// ─── Process a single sale ────────────────────────────────────────────────────
async function processSale(base44, saleId) {
  const sales = await base44.asServiceRole.entities.EstateSale.filter({ id: saleId });
  const sale = sales[0];
  if (!sale) return { error: 'Sale not found', sale_id: saleId };

  if (!['upcoming', 'active'].includes(sale.status)) {
    return { message: 'Sale not published — skipping', sale_id: saleId, status: sale.status };
  }

  const items = await base44.asServiceRole.entities.SEOItemProfile.filter({ sale_id: saleId });
  if (items.length === 0) {
    return { message: 'No item profiles — skipping', sale_id: saleId };
  }

  // Get company/operator info
  const companyName = sale.operator_name || 'Estate Sale Company';
  const companyCity = sale.property_address?.city || '';
  const companyState = sale.property_address?.state || '';
  const companyProfileUrl = sale.operator_id
    ? `https://estatesalen.com/company/${sale.operator_id}`
    : `https://estatesalen.com`;

  const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });

  const topics = await selectBlogTopics(openai, sale, companyName, companyCity, items);
  if (!topics.length) return { message: 'No blog topics identified', sale_id: saleId };

  const results = [];

  for (const topic of topics) {
    const slug = `/blog/${toSlug(topic.slug || topic.title)}`;

    const existingPages = await base44.asServiceRole.entities.SEOPage.filter({ slug });
    if (existingPages.length > 0) {
      results.push({ slug, status: 'skipped_exists' });
      continue;
    }

    const relevantItems = items.filter(i =>
      topic.related_brands?.includes(i.brand_name) ||
      topic.related_categories?.includes(i.category_name)
    ).slice(0, 15);
    const fallbackItems = relevantItems.length > 0 ? relevantItems : items.slice(0, 10);
    const soldExamples = fallbackItems.filter(i => i.sold_status === 'sold').slice(0, 5);

    // Find the best image for this topic
    const topicImageUrl = findTopicImage(items, topic);

    const rawArticle = await writeArticle(openai, topic, companyName, companyCity, companyState, companyProfileUrl, fallbackItems, soldExamples);
    const meta = await generateBlogMeta(openai, topic.title, topic.target_keyword, rawArticle);
    const fullArticle = appendInternalLinks(rawArticle, topic, companyName, companyProfileUrl, fallbackItems);

    const publishedAt = new Date().toISOString();
    const isHighConfidence = (topic.confidence_score || 0) >= 80;
    const pageStatus = isHighConfidence ? 'published' : 'draft';

    const schema = buildBlogSchema(meta.seo_title || topic.title, slug, meta.meta_description || '', publishedAt, topicImageUrl);

    const pageData = {
      page_type: 'blog',
      entity_id: saleId,
      slug,
      title: meta.seo_title || topic.title,
      meta_description: meta.meta_description || '',
      h1: meta.h1 || topic.title,
      intro_content: topic.reasoning || '',
      main_content: fullArticle,
      image_url: topicImageUrl || '',
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
      image_url: topicImageUrl,
      word_count: fullArticle.split(/\s+/).length,
    });
  }

  return {
    sale_id: saleId,
    sale_title: sale.title,
    company_name: companyName,
    topics_evaluated: topics.length,
    posts_created: results.filter(r => r.status !== 'skipped_exists').length,
    auto_published: results.filter(r => r.status === 'published').length,
    saved_as_draft: results.filter(r => r.status === 'draft').length,
    skipped: results.filter(r => r.status === 'skipped_exists').length,
    posts: results,
  };
}

// ─── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const saleId = body?.sale_id || body?.data?.id || body?.event?.entity_id;

    // Batch mode: process all active/upcoming sales
    if (!saleId) {
      const allSales = await base44.asServiceRole.entities.EstateSale.filter(
        { status: { $in: ['upcoming', 'active'] } },
        '-created_date',
        50
      );

      const batchResults = [];
      for (const sale of allSales) {
        try {
          const result = await processSale(base44, sale.id);
          batchResults.push(result);
        } catch (err) {
          batchResults.push({ sale_id: sale.id, error: err.message });
        }
      }

      return Response.json({
        message: `Batch blog generation complete — processed ${allSales.length} sales`,
        sales_processed: allSales.length,
        results: batchResults,
      });
    }

    // Single sale mode
    const result = await processSale(base44, saleId);
    return Response.json({ message: 'Blog post generation complete', ...result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});