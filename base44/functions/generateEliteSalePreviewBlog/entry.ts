import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import OpenAI from 'npm:openai';

function toSlug(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').trim().replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
}

function formatDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function formatTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${m} ${ampm}`;
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

// ─── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Calculate the date 2 days from now
    const now = new Date();
    const twoDaysFromNow = new Date(now);
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
    const targetDateStr = twoDaysFromNow.toISOString().split('T')[0]; // YYYY-MM-DD

    console.log(`Checking for elite-tier sales starting on ${targetDateStr}`);

    // Get all upcoming/active sales
    const allSales = await base44.asServiceRole.entities.EstateSale.filter(
      { status: { $in: ['upcoming', 'active'] } },
      '-created_date',
      200
    );

    const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });
    const results = [];

    for (const sale of allSales) {
      // Check if any sale date falls exactly 2 days from now
      const matchingDate = (sale.sale_dates || []).find(d => d.date === targetDateStr);
      if (!matchingDate) continue;

      // Must have an operator
      const operatorId = sale.operator_id;
      if (!operatorId) continue;

      // Check if operator is elite tier (premium or enterprise in Subscription entity)
      let isElite = false;
      try {
        const subs = await base44.asServiceRole.entities.Subscription.filter(
          { user_id: operatorId, status: 'active', tier: { $in: ['premium', 'enterprise'] } },
          '-created_date',
          1
        );
        isElite = subs.length > 0;
      } catch { continue; }

      if (!isElite) continue;

      const companyName = sale.operator_name || 'Estate Sale Company';
      const city = sale.property_address?.city || '';
      const state = sale.property_address?.state || '';
      const locationStr = [city, state].filter(Boolean).join(', ');
      const companyProfileUrl = `https://estatesalen.com/company/${operatorId}`;
      const saleLink = sale.seo_slug
        ? `https://estatesalen.com${sale.seo_slug}`
        : companyProfileUrl;

      // Get items for this sale
      const items = await base44.asServiceRole.entities.SEOItemProfile.filter({ sale_id: sale.id });
      const featuredItems = items.slice(0, 20);

      const dateDisplay = formatDate(targetDateStr);
      const timeDisplay = formatTime(matchingDate.start_time);
      const endTimeDisplay = formatTime(matchingDate.end_time);

      const itemList = featuredItems.map((i, idx) => {
        const price = i.sold_price ? ` ($${i.sold_price})` : (i.value_low ? ` (est. $${i.value_low}–$${i.value_high})` : '');
        return `${idx + 1}. **${i.item_name}**${i.brand_name ? ` — ${i.brand_name}` : ''}${price}\n   ${i.ai_description ? i.ai_description.slice(0, 200) : ''}`;
      }).join('\n\n');

      const slug = `/blog/${toSlug(`${companyName}-estate-sale-preview-${city}`)}`;

      // Check if this preview blog already exists
      const existingPages = await base44.asServiceRole.entities.SEOPage.filter({ slug });
      if (existingPages.length > 0) {
        results.push({ sale_id: sale.id, sale_title: sale.title, status: 'skipped_exists', slug });
        continue;
      }

      // Find a hero image
      const heroItem = featuredItems.find(i => i.image_url) || items.find(i => i.image_url);
      const heroImageUrl = heroItem?.image_url || null;

      const prompt = `You are an expert estate sale content writer for EstateSalen.com.

Write an exciting, SEO-optimized blog post previewing an upcoming elite estate sale.

COMPANY: ${companyName}
LOCATION: ${locationStr}
SALE DATE: ${dateDisplay}${timeDisplay ? ` from ${timeDisplay}` : ''}${endTimeDisplay ? ` to ${endTimeDisplay}` : ''}
COMPANY PROFILE: ${companyProfileUrl}
SALE LINK: ${saleLink}

FEATURED ITEMS (${featuredItems.length} items):
${itemList}

REQUIREMENTS:
1. Title: "Upcoming Estate Sale Preview: ${companyName} in ${locationStr} — ${dateDisplay}"
2. Open with an exciting intro about this upcoming estate sale administered by ${companyName}
3. Feature all ${featuredItems.length} items prominently with descriptions
4. Group items by category where possible
5. Mention the sale date, time, and location clearly
6. Include a section "Why Shop at ${companyName} Sales"
7. Include a CTA: "Mark your calendar for ${dateDisplay} and visit ${saleLink} for full details"
8. Include: "Have questions about any item? Contact ${companyName} through their EstateSalen.com profile: ${companyProfileUrl}"
9. Write in an enthusiastic, high-end tone fitting for an elite-tier sale
10. Target 1000-1500 words
11. Output in markdown only — no slug, no metadata
12. Do NOT use generic phrases like "don't miss out" — be specific and authentic`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.6,
        max_tokens: 3500,
      });

      const articleBody = completion.choices[0].message.content || '';

      // Generate meta
      const metaPrompt = `Generate SEO meta for this sale preview blog:
TITLE: ${`Upcoming Estate Sale Preview: ${companyName} in ${locationStr} — ${dateDisplay}`}
ARTICLE: ${articleBody.slice(0, 500)}

Return JSON: { "seo_title": "", "meta_description": "", "h1": "" }
- seo_title: max 60 chars, include "${companyName}" and "estate sale"
- meta_description: max 155 chars, compelling CTA
- h1: close variant of title`;

      const metaCompletion = await openai.chat.completions.create({
        model: 'gpt-4o',
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: metaPrompt }],
        temperature: 0.3,
        max_tokens: 200,
      });

      let meta = { seo_title: '', meta_description: '', h1: '' };
      try {
        meta = JSON.parse(metaCompletion.choices[0].message.content);
      } catch { /* fallback below */ }

      const publishedAt = new Date().toISOString();
      const pageTitle = meta.seo_title || `Upcoming Estate Sale Preview: ${companyName} — ${dateDisplay}`;

      await base44.asServiceRole.entities.SEOPage.create({
        page_type: 'blog',
        entity_id: sale.id,
        slug,
        title: pageTitle,
        meta_description: meta.meta_description || `Preview the upcoming ${companyName} estate sale in ${locationStr} featuring ${featuredItems.length} incredible items.`,
        h1: meta.h1 || `${companyName} Estate Sale Preview — ${dateDisplay}`,
        intro_content: `${companyName} is hosting an elite estate sale in ${locationStr} on ${dateDisplay}. Preview the featured items below.`,
        main_content: articleBody,
        image_url: heroImageUrl || '',
        faq_json: [],
        schema_json: buildBlogSchema(pageTitle, slug, meta.meta_description || '', publishedAt, heroImageUrl),
        canonical_url: `https://estatesalen.com${slug}`,
        status: 'published',
        indexed_status: 'not_submitted',
        published_at: publishedAt,
      });

      results.push({
        sale_id: sale.id,
        sale_title: sale.title,
        company_name: companyName,
        location: locationStr,
        date: targetDateStr,
        slug,
        items_featured: featuredItems.length,
        status: 'published',
        word_count: articleBody.split(/\s+/).length,
      });
    }

    return Response.json({
      message: `Generated ${results.filter(r => r.status === 'published').length} elite sale preview blogs for ${targetDateStr}`,
      target_date: targetDateStr,
      sales_scanned: allSales.length,
      previews_created: results.filter(r => r.status === 'published').length,
      skipped: results.filter(r => r.status === 'skipped_exists').length,
      results,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});