import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * generateTerritoryFBPosts
 *
 * Scans all active TerritoryFBPage records, finds EstateSales starting
 * within `days_before_sale` days in matching ZIP codes/cities, then:
 *   1. Generates an individual AI post per sale
 *   2. Generates one combined digest post per territory (if 2+ sales)
 *
 * Can be triggered manually (admin) or by a scheduled automation.
 * Accepts optional { territory_id } to regenerate for a specific territory only.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { territory_id } = body;

    // Load territory pages
    const pages = territory_id
      ? await base44.asServiceRole.entities.TerritoryFBPage.filter({ id: territory_id, is_active: true })
      : await base44.asServiceRole.entities.TerritoryFBPage.filter({ is_active: true });

    if (!pages.length) {
      return Response.json({ message: 'No active territory pages found', generated: 0 });
    }

    // Load upcoming/active sales
    const allSales = await base44.asServiceRole.entities.EstateSale.filter({
      status: 'upcoming'
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const results = [];

    for (const page of pages) {
      const daysAhead = page.days_before_sale ?? 2;
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + daysAhead);
      const targetDateStr = targetDate.toISOString().split('T')[0];

      // Match sales to this territory by ZIP or city
      const territorySales = allSales.filter(sale => {
        const saleCity = sale.property_address?.city?.toLowerCase().trim();
        const saleZip = sale.property_address?.zip?.trim();
        const firstDate = sale.sale_dates?.[0]?.date;

        if (!firstDate) return false;
        if (firstDate !== targetDateStr) return false;

        const cityMatch = (page.cities_covered || [])
          .some(c => c.toLowerCase().trim() === saleCity);
        const zipMatch = (page.zip_codes_covered || [])
          .some(z => z.trim() === saleZip);

        return cityMatch || zipMatch;
      });

      if (!territorySales.length) {
        results.push({ territory: page.territory_name, skipped: true, reason: 'No matching sales on target date' });
        continue;
      }

      const siteBase = 'https://estatesalen.com';
      const pageResults = [];

      // 1. Individual sale posts
      for (const sale of territorySales) {
        // Check if we already generated a post for this sale + territory today
        const existing = await base44.asServiceRole.entities.TerritoryFBPost.filter({
          territory_fb_page_id: page.id,
          estate_sale_id: sale.id,
          post_type: 'individual_sale',
          generation_date: today.toISOString().split('T')[0]
        });
        if (existing.length > 0) {
          pageResults.push({ sale_id: sale.id, skipped: true, reason: 'Already generated today' });
          continue;
        }

        const saleLink = `${siteBase}/EstateSaleDetail?id=${sale.id}`;
        const cityState = `${sale.property_address?.city || ''}, ${sale.property_address?.state || ''}`;
        const dateStr = sale.sale_dates?.map(d => d.date).join(' & ') || targetDateStr;
        const categories = (sale.categories || []).slice(0, 5).join(', ') || 'antiques, furniture, collectibles';

        const captionPrompt = `Write a brief, engaging Facebook post (under 200 words) for an estate sale page called "${page.territory_name}".
The post is about an upcoming estate sale in ${cityState} on ${dateStr}.
Sale title: "${sale.title}".
Featured item categories: ${categories}.
${sale.special_notes ? `Special notes: ${sale.special_notes}` : ''}

Requirements:
- Conversational, friendly tone — like a local neighbor sharing a tip
- Mention the city and date naturally
- Include 2-3 relevant emojis
- End with a clear CTA: "Click to see full details & sign up for alerts 👉 ${saleLink}"
- Do NOT use hashtags in the body; add 3 relevant hashtags at the very end on their own line
- Keep it exciting but not over-hyped`;

        const aiResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: captionPrompt
        });

        const caption = typeof aiResult === 'string' ? aiResult : aiResult?.text || aiResult?.content || JSON.stringify(aiResult);

        // Generate image
        const imagePrompt = `A warm, inviting photo-realistic scene of an estate sale in ${cityState}. Show a nicely arranged home interior with vintage furniture, antiques, and collectibles laid out for a sale. Bright, natural lighting. Welcoming atmosphere. No text overlays. Style: lifestyle photography.`;

        let imageUrl = null;
        try {
          const imgResult = await base44.asServiceRole.integrations.Core.GenerateImage({ prompt: imagePrompt });
          imageUrl = imgResult?.url || null;
        } catch (imgErr) {
          console.log('Image generation failed for sale', sale.id, imgErr.message);
        }

        const scheduledFor = new Date(targetDate);
        const [postHour, postMin] = (page.post_time || '09:00').split(':').map(Number);
        scheduledFor.setHours(postHour, postMin, 0, 0);

        await base44.asServiceRole.entities.TerritoryFBPost.create({
          territory_fb_page_id: page.id,
          territory_name: page.territory_name,
          post_type: 'individual_sale',
          estate_sale_id: sale.id,
          estate_sale_title: sale.title,
          sale_start_date: targetDateStr,
          sale_city: sale.property_address?.city || '',
          sale_state: sale.property_address?.state || '',
          ai_caption: caption,
          ai_image_url: imageUrl,
          estate_sale_link: saleLink,
          approval_status: 'pending_review',
          publish_status: 'draft',
          scheduled_for: scheduledFor.toISOString(),
          generation_date: today.toISOString().split('T')[0]
        });

        pageResults.push({ sale_id: sale.id, title: sale.title, type: 'individual_sale', created: true });
      }

      // 2. Combined digest post (only if 2+ sales)
      if (territorySales.length >= 2) {
        const existingDigest = await base44.asServiceRole.entities.TerritoryFBPost.filter({
          territory_fb_page_id: page.id,
          post_type: 'combined_digest',
          generation_date: today.toISOString().split('T')[0]
        });

        if (existingDigest.length === 0) {
          const saleList = territorySales.map((s, i) => {
            const link = `${siteBase}/EstateSaleDetail?id=${s.id}`;
            const city = s.property_address?.city || '';
            const cats = (s.categories || []).slice(0, 3).join(', ') || 'antiques & more';
            return `${i + 1}. "${s.title}" in ${city} — ${cats} → ${link}`;
          }).join('\n');

          const digestPrompt = `Write a combined Facebook post (under 250 words) for the estate sale community page "${page.territory_name}".
There are ${territorySales.length} estate sales happening in the territory on ${targetDateStr}.

Sales:
${saleList}

Requirements:
- Kick off with excitement: "This ${targetDate.toLocaleDateString('en-US', { weekday: 'long' })} is PACKED for estate sale fans in ${page.county}!"
- List each sale with a brief one-liner and its link naturally embedded
- Conversational, community feel — like a local event roundup newsletter
- Use 3-4 relevant emojis
- End with: "Follow this page to never miss a local sale. Sign up for free alerts at https://estatesalen.com 🏷️"
- Add 4 relevant hashtags on their own line at the end`;

          const digestAI = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: digestPrompt
          });

          const digestCaption = typeof digestAI === 'string' ? digestAI : digestAI?.text || digestAI?.content || JSON.stringify(digestAI);

          const digestImagePrompt = `A vibrant collage-style flat lay of estate sale treasures: vintage furniture, antique clocks, art, jewelry, books, and collectibles arranged beautifully. Bright, warm natural lighting. Lifestyle photography style. No text. Clean background.`;

          let digestImage = null;
          try {
            const imgRes = await base44.asServiceRole.integrations.Core.GenerateImage({ prompt: digestImagePrompt });
            digestImage = imgRes?.url || null;
          } catch (e) {
            console.log('Digest image failed', e.message);
          }

          const digestScheduled = new Date(targetDate);
          const [h, m] = (page.post_time || '09:00').split(':').map(Number);
          digestScheduled.setHours(h, m + 15, 0, 0); // Offset 15 min after individual posts

          await base44.asServiceRole.entities.TerritoryFBPost.create({
            territory_fb_page_id: page.id,
            territory_name: page.territory_name,
            post_type: 'combined_digest',
            sales_included: territorySales.map(s => s.id),
            sale_start_date: targetDateStr,
            ai_caption: digestCaption,
            ai_image_url: digestImage,
            estate_sale_link: `${siteBase}/EstateSaleFinder`,
            approval_status: 'pending_review',
            publish_status: 'draft',
            scheduled_for: digestScheduled.toISOString(),
            generation_date: today.toISOString().split('T')[0]
          });

          pageResults.push({ type: 'combined_digest', sales_count: territorySales.length, created: true });
        } else {
          pageResults.push({ type: 'combined_digest', skipped: true, reason: 'Already generated today' });
        }
      }

      results.push({ territory: page.territory_name, posts: pageResults });
    }

    return Response.json({ success: true, results });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});