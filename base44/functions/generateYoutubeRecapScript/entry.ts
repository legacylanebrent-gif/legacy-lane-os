import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const SYSTEM_PROMPT = `You are a YouTube content strategist and scriptwriter for EstateSalen.com — a channel about estate sales, antiques, collectibles, and life transitions.

RULES:
1. Write in a warm, engaging, knowledgeable tone — like a friendly expert who loves estate sales.
2. Scripts should be conversational and natural for voice delivery.
3. YouTube titles should be click-worthy but honest — no bait-and-switch.
4. Frame all values as ranges, not guarantees.
5. Each video should drive viewers to visit EstateSalen.com to find estate sales near them.`;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { weekly_market_report_id } = await req.json();

    if (!weekly_market_report_id) {
      return Response.json({ error: 'weekly_market_report_id is required' }, { status: 400 });
    }

    // Fetch the report
    const reports = await base44.asServiceRole.entities.WeeklyMarketReport.filter({ id: weekly_market_report_id });
    const report = reports[0];
    if (!report) {
      return Response.json({ error: 'Weekly market report not found' }, { status: 404 });
    }

    const itemsSummary = report.selected_items_json?.length > 0
      ? report.selected_items_json.map(i => `- ${i.item_name}: ${i.value_range || 'value varies'} — ${i.why_notable || ''}`).join('\n')
      : 'Featured estate sale items from this week.';

    const prompt = `Create a complete YouTube video package for EstateSalen.com based on this weekly market report.

Report title: ${report.report_title}
Report type: ${report.report_type}
Week: ${report.week_start} to ${report.week_end || report.week_start}
Article summary: ${report.article_content?.replace(/<[^>]+>/g, '').slice(0, 800) || 'Estate sale market report.'}

Featured items:
${itemsSummary}

Return a JSON object with these exact keys:
{
  "video_title": "YouTube video title — engaging, 60-70 chars, includes estate sale + key topic",
  "video_description": "YouTube description (250-400 chars) — hook sentence, what viewers will learn, call to visit EstateSalen.com to find estate sales",
  "video_script": "Full spoken script (600-900 words). Structure: Hook (15 seconds) → Intro/What we're covering today (30 seconds) → Item segments (2-3 min each, cover: what it is, how to identify it, what it sells for, interesting story or context) → Outro with CTA (30 seconds: visit EstateSalen.com, subscribe, leave a comment). Write for natural speech — contractions, short sentences, conversational.",
  "video_chapters": "YouTube chapters format:\n0:00 Intro\n[timestamp] [Chapter title]\n...",
  "youtube_tags": ["tag1", "tag2", "tag3"],
  "thumbnail_text": "Short punchy text for video thumbnail (max 6 words, all caps or title case)",
  "blog_embed_content": "300-400 word HTML blog post that embeds this video. Include: intro paragraph, embedded video placeholder ([VIDEO_EMBED]), 2-3 paragraph summary of key items and values, CTA to find estate sales on EstateSalen.com. Use <p>, <h2>, <ul> tags."
}

Script rules:
- Start with a hook: "This week at estate sales across the country, we found something incredible..." or similar.
- Use timestamps like "[0:45]" in the script to mark chapter transitions.
- End with: "If you want to find estate sales near you, head to EstateSalen.com — the best place to find sales in your area. And if you're settling an estate and need help, we have free tools to connect you with local professionals."

YouTube tags: 10-15 tags. Mix: specific items, "estate sale finds", "antiques value", "what's it worth", "estate sale tips", etc.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      system_prompt: SYSTEM_PROMPT,
      response_json_schema: {
        type: 'object',
        properties: {
          video_title: { type: 'string' },
          video_description: { type: 'string' },
          video_script: { type: 'string' },
          video_chapters: { type: 'string' },
          youtube_tags: { type: 'array', items: { type: 'string' } },
          thumbnail_text: { type: 'string' },
          blog_embed_content: { type: 'string' },
        },
      },
    });

    // Save back to the WeeklyMarketReport record
    await base44.asServiceRole.entities.WeeklyMarketReport.update(weekly_market_report_id, {
      video_script: result.video_script,
      seo_title: result.video_title,
      seo_description: result.video_description,
    });

    // Also save to WeeklyVideoBatch if it exists
    const existingBatch = await base44.asServiceRole.entities.WeeklyVideoBatch.filter({
      week_start_date: report.week_start,
    });

    if (existingBatch.length > 0) {
      await base44.asServiceRole.entities.WeeklyVideoBatch.update(existingBatch[0].id, {
        generated_video_title: result.video_title,
        generated_video_description: result.video_description,
        generated_video_script: result.video_script,
        generated_youtube_chapters: result.video_chapters,
        generated_thumbnail_text: result.thumbnail_text,
        generated_blog_post: result.blog_embed_content,
        generated_youtube_tags: result.youtube_tags || [],
        status: 'script_generated',
      });
    }

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});