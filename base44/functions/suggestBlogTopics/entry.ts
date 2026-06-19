import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import OpenAI from 'npm:openai';

function toSlug(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').trim().replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
}

function extractKeywords(title) {
  const stopWords = new Set(['the','a','an','is','are','was','were','be','been','being','have','has','had','do','does','did','will','would','shall','should','may','might','must','can','could','in','on','at','to','for','of','with','by','from','and','or','but','not','no','nor','so','yet','both','either','neither','each','every','all','any','few','more','most','other','some','such','only','own','same','than','too','very','just','about','how','what','when','where','why','who','which','this','that','these','those','it','its','if','as','up','out','also']);
  return title.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));
}

function computeOverlap(kwA, kwB) {
  if (!kwA.length || !kwB.length) return 0;
  const setA = new Set(kwA);
  const setB = new Set(kwB);
  let overlap = 0;
  for (const w of setA) { if (setB.has(w)) overlap++; }
  return Math.round((overlap / Math.min(setA.size, setB.size)) * 100);
}

// ─── Step 1: Analyze inventory and pick best blog topics ─────────────────────
async function selectBlogTopics(openai, sale, companyName, companyCity, items) {
  const itemSummary = items.slice(0, 40).map(i =>
    [i.item_name, i.brand_name, i.category_name, i.style, i.estimated_age].filter(Boolean).join(' | ')
  ).join('\n');

  const categories = [...new Set(items.map(i => i.category_name).filter(Boolean))];
  const brands = [...new Set(items.map(i => i.brand_name).filter(Boolean))].slice(0, 15);

  const prompt = `You are an SEO content strategist for EstateSalen.com, an estate sale marketplace.

Analyze this estate sale company's inventory and identify the 5-15 strongest SEO blog post opportunities.

COMPANY: ${companyName}
ESTATE SALE LOCATION: ${companyCity}${sale.property_address?.state ? ', ' + sale.property_address.state : ''}
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
- Generate 5-15 topics, ranked by SEO opportunity
- Titles should match real search queries (e.g. "How Much Is Vintage Pyrex Worth?", "How To Identify Waterford Crystal", "Estate Sale Jewelry Buying Guide")
- slug: URL-safe, no trailing slashes
- angle: the editorial angle (e.g. "value guide", "identification guide", "buying guide", "collector's guide", "trend analysis")
- target_keyword: the primary keyword phrase this post targets
- confidence_score: 0-100 (80+ = auto-publish, under 80 = save as draft)
- reasoning: 1-2 sentences on why this topic has SEO value
- related_brands: relevant brands from the inventory for this topic
- related_categories: relevant categories for this topic
- word_count_target: 1200-2500 based on topic depth needed`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.4,
    max_tokens: 1500,
  });

  try {
    return JSON.parse(completion.choices[0].message.content).topics || [];
  } catch {
    return [];
  }
}

// ─── Find the best item image for a topic ────────────────────────────────────
function findTopicImage(items, topic) {
  const matching = items.filter(i =>
    (topic.related_brands?.includes(i.brand_name)) ||
    (topic.related_categories?.includes(i.category_name)) ||
    (topic.title && i.item_name && topic.title.toLowerCase().split(' ').some(w =>
      w.length > 3 && i.item_name.toLowerCase().includes(w)
    ))
  );
  for (const item of matching) { if (item.image_url) return item.image_url; }
  for (const item of items) { if (item.image_url) return item.image_url; }
  return null;
}

// ─── Cross-reference against existing blog posts ─────────────────────────────
async function crossReferenceExisting(base44, topics) {
  // Fetch all existing blog titles and slugs
  const existingPosts = await base44.asServiceRole.entities.SEOPage.filter(
    { page_type: 'blog' },
    '-created_date',
    500
  );

  const existingSlugs = new Set(existingPosts.map(p => p.slug));

  return topics.map(topic => {
    const slug = `/blog/${toSlug(topic.slug || topic.title)}`;

    // Check exact slug match
    if (existingSlugs.has(slug)) {
      return { ...topic, slug, duplicate_of_title: 'Exact slug match exists', duplicate_similarity_pct: 100 };
    }

    // Check title keyword overlap with existing posts
    const topicKw = extractKeywords(topic.title);
    let bestMatch = null;
    let bestPct = 0;

    for (const existing of existingPosts) {
      const existingTitle = existing.title || existing.h1 || '';
      if (!existingTitle) continue;
      const existingKw = extractKeywords(existingTitle);
      const pct = computeOverlap(topicKw, existingKw);
      if (pct > bestPct) {
        bestPct = pct;
        bestMatch = existingTitle;
      }
    }

    return {
      ...topic,
      slug,
      duplicate_of_title: bestPct >= 40 ? bestMatch : null,
      duplicate_similarity_pct: bestPct,
    };
  });
}

// ─── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized — admin only' }, { status: 403 });
    }

    const allSales = await base44.asServiceRole.entities.EstateSale.filter(
      { status: { $in: ['upcoming', 'active'] } },
      '-created_date',
      50
    );

    if (!allSales.length) {
      return Response.json({ message: 'No active/upcoming sales found', suggestions_created: 0 });
    }

    const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });
    const batchId = `batch_${Date.now()}`;
    let totalCreated = 0;

    for (const sale of allSales) {
      try {
        const items = await base44.asServiceRole.entities.SEOItemProfile.filter({ sale_id: sale.id });
        if (items.length === 0) continue;

        const companyName = sale.operator_name || 'Estate Sale Company';
        const companyCity = sale.property_address?.city || '';
        const companyState = sale.property_address?.state || '';
        const operatorId = sale.operator_id || '';
        const companyProfileUrl = operatorId
          ? `https://estatesalen.com/company/${operatorId}`
          : 'https://estatesalen.com';

        // Look up operator's subscription tier
        let subscriptionTier = 'unknown';
        if (operatorId) {
          try {
            const subs = await base44.asServiceRole.entities.Subscription.filter(
              { user_id: operatorId, status: 'active' },
              '-created_date',
              1
            );
            if (subs.length > 0) {
              subscriptionTier = subs[0].tier || 'unknown';
            }
          } catch { /* ignore — tier lookup failure is non-critical */ }
        }

        const topics = await selectBlogTopics(openai, sale, companyName, companyCity, items);
        if (!topics.length) continue;

        // Cross-reference against existing blog posts
        const enriched = await crossReferenceExisting(base44, topics);

        // Save as suggestions
        for (const topic of enriched) {
          const imageUrl = findTopicImage(items, topic);

          await base44.asServiceRole.entities.BlogTopicSuggestion.create({
            sale_id: sale.id,
            company_name: companyName,
            company_city: companyCity,
            company_state: companyState,
            company_profile_url: companyProfileUrl,
            subscription_tier: subscriptionTier,
            title: topic.title,
            slug: topic.slug,
            angle: topic.angle || '',
            target_keyword: topic.target_keyword || '',
            confidence_score: topic.confidence_score || 0,
            reasoning: topic.reasoning || '',
            related_brands: topic.related_brands || [],
            related_categories: topic.related_categories || [],
            word_count_target: topic.word_count_target || 1500,
            image_url: imageUrl || '',
            duplicate_of_title: topic.duplicate_of_title || null,
            duplicate_similarity_pct: topic.duplicate_similarity_pct || 0,
            batch_id: batchId,
            status: 'pending',
          });
          totalCreated++;
        }
      } catch (err) {
        console.error(`Error processing sale ${sale.id}:`, err.message);
      }
    }

    return Response.json({
      message: `Generated ${totalCreated} blog topic suggestions across ${allSales.length} sales`,
      batch_id: batchId,
      suggestions_created: totalCreated,
      sales_scanned: allSales.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});