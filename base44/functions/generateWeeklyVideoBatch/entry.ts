/**
 * WEEKLY VIDEO INTELLIGENCE ENGINE
 *
 * Called manually by admin OR by weekly automation (Monday morning).
 *
 * Steps:
 *  1. Pull prior week's SaleItemPricing records (items with SERP/Lens research)
 *  2. Enrich with ItemKnowledge data where available
 *  3. Score each item (uniqueness, value, visual, collector, resale, keyword, research depth)
 *  4. Auto-select top items (5-15)
 *  5. Generate AI research summary per item
 *  6. Create WeeklyVideoBatch + WeeklyVideoItem records
 *  7. Return batch ID
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import OpenAI from 'npm:openai';

function getWeekRange(offsetWeeks = 1) {
  const now = new Date();
  // Go back offsetWeeks weeks
  const end = new Date(now);
  end.setDate(end.getDate() - (offsetWeeks - 1) * 7);
  // Round to last Monday
  const dayOfWeek = end.getDay();
  const diffToMonday = (dayOfWeek + 6) % 7;
  const monday = new Date(end);
  monday.setDate(end.getDate() - diffToMonday - 7);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 0);
  return { start: monday, end: sunday };
}

function scoreItem(pricing, knowledge) {
  // Uniqueness: has brand + era + style + pattern = rare item
  const hasRareAttributes = [knowledge?.brand, knowledge?.era, knowledge?.style, knowledge?.pattern]
    .filter(Boolean).length;
  const uniquenessScore = Math.min(100, hasRareAttributes * 20 + (knowledge?.occurrence_count < 10 ? 20 : 0));

  // Value: based on avg market price
  const avgPrice = pricing.price_avg || knowledge?.average_value || 0;
  const valueScore = avgPrice >= 500 ? 100 : avgPrice >= 200 ? 80 : avgPrice >= 100 ? 60 : avgPrice >= 50 ? 40 : avgPrice >= 20 ? 20 : 5;

  // Visual: has image + high price range spread
  const hasImage = pricing.image_url ? 50 : 0;
  const priceSpread = pricing.price_max && pricing.price_min ? pricing.price_max - pricing.price_min : 0;
  const visualScore = Math.min(100, hasImage + (priceSpread > 100 ? 30 : priceSpread > 50 ? 15 : 0) + (pricing.top_matches?.length >= 5 ? 20 : 0));

  // Collector interest: brand recognition + knowledge demand
  const hasBrand = knowledge?.brand ? 30 : 0;
  const demandScore = Math.min(40, (knowledge?.demand_score || 0) * 0.4);
  const hasCollectorNotes = knowledge?.collector_notes ? 20 : 0;
  const collectorScore = Math.min(100, hasBrand + demandScore + hasCollectorNotes + (knowledge?.era ? 10 : 0));

  // Resale: high price with SERP confirmed matches
  const serpMatches = (pricing.top_matches || []).length;
  const resaleScore = Math.min(100, (serpMatches >= 5 ? 40 : serpMatches * 8) + (avgPrice >= 100 ? 40 : avgPrice * 0.4) + (pricing.price_avg ? 20 : 0));

  // Keyword: knowledge SEO ready
  const keywordScore = Math.min(100,
    (knowledge?.seo_title ? 30 : 0) +
    (knowledge?.category ? 20 : 0) +
    (knowledge?.brand ? 20 : 0) +
    (knowledge?.era ? 15 : 0) +
    (knowledge?.style ? 15 : 0)
  );

  // Research depth: how much data we have
  const researchScore = Math.min(100,
    ((pricing.top_matches?.length || 0) * 8) +
    (knowledge?.historical_context ? 20 : 0) +
    (knowledge?.ai_description ? 20 : 0) +
    (knowledge?.collector_notes ? 10 : 0)
  );

  // Weighted total
  const total = Math.round(
    uniquenessScore * 0.20 +
    valueScore * 0.20 +
    visualScore * 0.15 +
    collectorScore * 0.15 +
    researchScore * 0.15 +
    keywordScore * 0.10 +
    resaleScore * 0.05
  );

  return { uniquenessScore, valueScore, visualScore, collectorScore, resaleScore, keywordScore, researchScore, total };
}

async function generateItemResearch(openai, pricing, knowledge, scores) {
  const itemName = pricing.item_title || pricing.knowledge_graph_title || 'Unknown Item';
  const avgPrice = pricing.price_avg || knowledge?.average_value || 0;
  const priceRange = pricing.price_min && pricing.price_max
    ? `$${pricing.price_min} – $${pricing.price_max}`
    : avgPrice ? `~$${avgPrice}` : 'Unknown';

  const matchSummary = (pricing.top_matches || []).slice(0, 5)
    .map(m => `${m.title} (${m.price || 'no price'} on ${m.source || 'unknown'})`).join('; ');

  const prompt = `You are a collectibles expert creating video content for an estate sale YouTube channel.

Item: ${itemName}
Brand: ${knowledge?.brand || 'Unknown'}
Era: ${knowledge?.era || 'Unknown'}
Category: ${knowledge?.category || 'Unknown'}
Style: ${knowledge?.style || 'Unknown'}
Market Price Range: ${priceRange}
SERP Matches: ${matchSummary || 'None found'}
Historical Context: ${knowledge?.historical_context || 'None'}
Collector Notes: ${knowledge?.collector_notes || 'None'}

Generate a JSON response with:
{
  "research_summary": "2-3 sentence summary of what this item is and why it's interesting for a YouTube video",
  "history_summary": "1-2 sentences of historical context or origin story",
  "value_summary": "1-2 sentences explaining the value range and what drives it",
  "buy_or_pass": "strong_buy | buy | watch | pass (choose one based on value and collector interest)",
  "buy_or_pass_reason": "1 sentence explaining the recommendation",
  "video_segment_script": "30-45 second spoken script for this item's segment in a YouTube video. Start with a hook, explain what it is, give the value range, end with buy/pass recommendation.",
  "youtube_hook": "One punchy 1-sentence hook for this specific item"
}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.5,
    max_tokens: 600,
  });

  try {
    return JSON.parse(completion.choices[0].message.content);
  } catch {
    return {
      research_summary: `${itemName} found at estate sale with market value ${priceRange}.`,
      history_summary: knowledge?.historical_context || '',
      value_summary: `Market research shows a price range of ${priceRange}.`,
      buy_or_pass: 'watch',
      buy_or_pass_reason: 'Moderate collector interest with available market data.',
      video_segment_script: `Up next — ${itemName}. We found this at an estate sale and looked it up. Market value shows ${priceRange}. Here's what you need to know...`,
      youtube_hook: `This ${itemName} could be worth more than you think.`,
    };
  }
}

async function generateBatchScript(openai, batchTitle, selectedItems) {
  const itemSummaries = selectedItems.slice(0, 15).map((item, i) =>
    `${i + 1}. ${item.title} — ${item.ai_research_summary || ''} Value: $${item.average_market_value || 0}`
  ).join('\n');

  const topItem = selectedItems.sort((a, b) => b.total_video_score - a.total_video_score)[0];
  const highestValue = selectedItems.sort((a, b) => (b.average_market_value || 0) - (a.average_market_value || 0))[0];

  const prompt = `You are a YouTube scriptwriter for a popular estate sale channel called EstateSalen Weekly Finds Report.

Write a complete video script for this week's video.

Title: ${batchTitle}
Items (${selectedItems.length} total):
${itemSummaries}

Best item: ${topItem?.title}
Highest value item: ${highestValue?.title} (~$${highestValue?.average_market_value || 0})

Return JSON with:
{
  "video_title_options": ["Title Option 1", "Title Option 2", "Title Option 3"],
  "thumbnail_text_options": ["WORTH HOW MUCH?", "ESTATE SALE FINDS", "BUY OR PASS?", "HIDDEN VALUE"],
  "hook": "Opening 15-second hook script",
  "intro": "30-second intro script",
  "value_recap": "60-second value recap segment at the end",
  "best_buy_of_week": "30-second best buy of the week segment",
  "most_surprising": "30-second most surprising find segment",
  "collector_tip": "20-second collector tip",
  "cta": "30-second call to action outro",
  "youtube_description": "Full YouTube description (300-400 words) with timestamps placeholder",
  "youtube_chapters": "YouTube chapter timestamps (use 00:00 format, estimate timing)",
  "youtube_tags": ["tag1", "tag2", "tag3"],
  "pinned_comment": "Pinned comment text for YouTube",
  "blog_intro": "150-word intro paragraph for the companion blog post",
  "instagram_caption": "Instagram caption with hashtags",
  "tiktok_caption": "TikTok caption with hashtags",
  "facebook_caption": "Facebook caption"
}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.6,
    max_tokens: 2500,
  });

  try {
    return JSON.parse(completion.choices[0].message.content);
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Auth: admin only
    let user = null;
    try {
      user = await base44.auth.me();
    } catch { /* automation */ }

    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const forceWeek = body?.week_start_date; // override: specific week
    const generateScript = body?.generate_script !== false; // default true
    const maxItems = body?.max_items || 15;

    const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });

    // Determine week range
    const { start: weekStart, end: weekEnd } = getWeekRange(1);
    const startISO = forceWeek || weekStart.toISOString().split('T')[0];
    const endISO = weekEnd.toISOString().split('T')[0];

    // Check if batch already exists for this week
    const existingBatch = await base44.asServiceRole.entities.WeeklyVideoBatch.filter({
      week_start_date: startISO,
    });
    if (existingBatch.length > 0 && !body?.force_regenerate) {
      return Response.json({
        message: 'Batch already exists for this week',
        batch_id: existingBatch[0].id,
        status: existingBatch[0].status,
      });
    }

    console.log(`[WeeklyVideo] Generating batch for week: ${startISO} → ${endISO}`);

    // Pull all SaleItemPricing records from the past 2 weeks (to ensure coverage)
    const allPricings = await base44.asServiceRole.entities.SaleItemPricing.list('-created_date', 500);

    // Filter to items with actual price data and titles
    const validPricings = allPricings.filter(p =>
      (p.item_title || p.knowledge_graph_title) &&
      (p.price_avg || p.price_min || p.price_max) &&
      p.image_url
    );

    console.log(`[WeeklyVideo] ${validPricings.length} valid pricing records found`);

    if (validPricings.length === 0) {
      return Response.json({ message: 'No priced items found for this week', candidates: 0 });
    }

    // Enrich with ItemKnowledge data
    const enrichedItems = [];
    for (const pricing of validPricings.slice(0, 200)) {
      const title = pricing.item_title || pricing.knowledge_graph_title || '';
      const normalizedTitle = title.toLowerCase().trim();

      let knowledge = null;
      if (normalizedTitle) {
        const knowledgeRecords = await base44.asServiceRole.entities.ItemKnowledge.filter({
          normalized_name: normalizedTitle,
        }).catch(() => []);
        knowledge = knowledgeRecords[0] || null;
      }

      const scores = scoreItem(pricing, knowledge);
      enrichedItems.push({ pricing, knowledge, scores });
    }

    // Sort by total score descending
    enrichedItems.sort((a, b) => b.scores.total - a.scores.total);

    const candidateCount = enrichedItems.length;

    // Auto-select items
    let selectedItems = enrichedItems.filter(i => i.scores.total >= 30);
    let qualityFlag = null;

    if (selectedItems.length < 5) {
      selectedItems = enrichedItems.slice(0, Math.min(5, enrichedItems.length));
      qualityFlag = 'Low Quality Week — limited high-scoring items available';
    } else if (selectedItems.length > maxItems) {
      selectedItems = selectedItems.slice(0, maxItems);
      if (enrichedItems.filter(i => i.scores.total >= 30).length > 15) {
        qualityFlag = 'Split Recommended — 15+ strong items available this week';
      }
    }

    const selectedCount = selectedItems.length;
    const weekLabel = `Week of ${new Date(startISO + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
    const batchTitle = `EstateSalen Weekly Finds — ${weekLabel}`;

    // Create the batch record
    const batchData = {
      week_start_date: startISO,
      week_end_date: endISO,
      title: batchTitle,
      status: 'items_selected',
      candidate_item_count: candidateCount,
      selected_item_count: selectedCount,
      quality_flag: qualityFlag || '',
      video_theme: 'Weekly Estate Sale Finds Report',
      video_angle: 'What We Found and What It Might Be Worth',
      created_by: user?.id || 'automation',
    };

    let batch;
    if (existingBatch.length > 0 && body?.force_regenerate) {
      await base44.asServiceRole.entities.WeeklyVideoBatch.update(existingBatch[0].id, batchData);
      batch = { id: existingBatch[0].id };
    } else {
      batch = await base44.asServiceRole.entities.WeeklyVideoBatch.create(batchData);
    }

    const batchId = batch.id;

    // Generate research for each selected item + create WeeklyVideoItem records
    const videoItems = [];
    for (let i = 0; i < selectedItems.length; i++) {
      const { pricing, knowledge, scores } = selectedItems[i];
      const itemTitle = pricing.item_title || pricing.knowledge_graph_title || 'Unknown Item';

      // Generate AI research
      const research = await generateItemResearch(openai, pricing, knowledge, scores).catch(err => {
        console.error(`Research error for "${itemTitle}":`, err.message);
        return { research_summary: '', history_summary: '', value_summary: '', buy_or_pass: 'watch', buy_or_pass_reason: '', video_segment_script: '', youtube_hook: '' };
      });

      const itemRecord = {
        weekly_video_batch_id: batchId,
        source_sale_id: pricing.sale_id || '',
        title: itemTitle,
        description: knowledge?.ai_description || '',
        category: knowledge?.category || '',
        brand: knowledge?.brand || '',
        style: knowledge?.style || '',
        era: knowledge?.era || '',
        material: knowledge?.material || '',
        image_url: pricing.image_url || '',
        suggested_price: pricing.user_price || null,
        value_low: pricing.price_min || null,
        value_high: pricing.price_max || null,
        average_market_value: pricing.price_avg || knowledge?.average_value || null,
        highest_market_value: pricing.price_max || knowledge?.highest_value || null,
        lowest_market_value: pricing.price_min || knowledge?.lowest_value || null,
        serpapi_sources: pricing.top_matches || [],
        uniqueness_score: scores.uniquenessScore,
        value_score: scores.valueScore,
        visual_score: scores.visualScore,
        collector_interest_score: scores.collectorScore,
        resale_score: scores.resaleScore,
        keyword_score: scores.keywordScore,
        research_depth_score: scores.researchScore,
        total_video_score: scores.total,
        ai_research_summary: research.research_summary || '',
        ai_history_summary: research.history_summary || '',
        ai_value_summary: research.value_summary || '',
        ai_buy_or_pass_recommendation: research.buy_or_pass || 'watch',
        ai_video_segment_script: research.video_segment_script || '',
        admin_selected: true,
        display_order: i + 1,
        item_knowledge_id: knowledge?.id || '',
      };

      const created = await base44.asServiceRole.entities.WeeklyVideoItem.create(itemRecord);
      videoItems.push({ ...itemRecord, id: created.id, title: itemTitle });

      // Throttle AI calls
      if (i < selectedItems.length - 1) await new Promise(r => setTimeout(r, 400));
    }

    // Generate full video script + YouTube package (optional, can be triggered separately)
    let scriptData = null;
    if (generateScript && videoItems.length >= 3) {
      console.log(`[WeeklyVideo] Generating script for ${videoItems.length} items...`);
      scriptData = await generateBatchScript(openai, batchTitle, videoItems).catch(err => {
        console.error('Script generation error:', err.message);
        return null;
      });

      if (scriptData) {
        const fullScript = [
          '=== HOOK ===', scriptData.hook || '',
          '\n=== INTRO ===', scriptData.intro || '',
          '\n=== ITEM SEGMENTS ===',
          ...videoItems.map((item, i) => `\n[ITEM ${i + 1}: ${item.title}]\n${item.ai_video_segment_script}`),
          '\n=== VALUE RECAP ===', scriptData.value_recap || '',
          '\n=== BEST BUY OF THE WEEK ===', scriptData.best_buy_of_week || '',
          '\n=== MOST SURPRISING ===', scriptData.most_surprising || '',
          '\n=== COLLECTOR TIP ===', scriptData.collector_tip || '',
          '\n=== CALL TO ACTION ===', scriptData.cta || '',
        ].join('\n');

        await base44.asServiceRole.entities.WeeklyVideoBatch.update(batchId, {
          generated_video_title: scriptData.video_title_options?.[0] || batchTitle,
          generated_video_description: scriptData.youtube_description || '',
          generated_video_script: fullScript,
          generated_youtube_chapters: scriptData.youtube_chapters || '',
          generated_thumbnail_text: (scriptData.thumbnail_text_options || []).join(' | '),
          generated_youtube_tags: scriptData.youtube_tags || [],
          generated_social_captions: {
            instagram: scriptData.instagram_caption || '',
            tiktok: scriptData.tiktok_caption || '',
            facebook: scriptData.facebook_caption || '',
          },
          generated_blog_post: scriptData.blog_intro || '',
          status: 'script_generated',
        });
      }
    }

    // Notify admin
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: 'admin@estatesalen.com',
      subject: `🎬 Weekly Video Package Ready — ${weekLabel}`,
      body: `Your weekly video intelligence batch is ready for review.\n\nBatch: ${batchTitle}\nItems Selected: ${selectedCount}\nCandidates Analyzed: ${candidateCount}\n${qualityFlag ? '\n⚠️ ' + qualityFlag + '\n' : ''}\nReview at: https://estatesalen.com/WeeklyVideoIntelligence`,
    }).catch(() => {});

    return Response.json({
      success: true,
      batch_id: batchId,
      batch_title: batchTitle,
      candidates_analyzed: candidateCount,
      items_selected: selectedCount,
      quality_flag: qualityFlag,
      script_generated: !!scriptData,
    });

  } catch (error) {
    console.error('generateWeeklyVideoBatch error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});