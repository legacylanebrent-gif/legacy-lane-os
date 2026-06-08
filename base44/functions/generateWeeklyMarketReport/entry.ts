import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const SYSTEM_PROMPT = `You are a market analyst and content writer for EstateSalen.com's Weekly Market Report — a content series covering what's selling at estate sales, what's valuable, and what's trending.

RULES:
1. Frame all values as market ranges, not guarantees. Use language like "typically sells for," "recent sales suggest," "can range from."
2. Tone: engaging, informative, slightly conversational — like a knowledgeable friend who loves antiques and estate sales.
3. Do not invent specific sale records unless they are general knowledge. Frame examples as illustrative.
4. Every report should encourage readers to attend estate sales, watch for specific items, and connect with EstateSalen.`;

const REPORT_TYPE_PROMPTS = {
  most_valuable_items: 'most valuable and high-demand items found at estate sales this week',
  unusual_estate_sale_finds: 'unusual, surprising, or unexpectedly valuable items found at estate sales',
  vintage_items_of_the_week: 'featured vintage items — their history, identification, and current market value',
  furniture_value_report: 'furniture values at estate sales — what styles are hot, what to look for, what to avoid',
  collectibles_report: 'collectibles market — categories, brands, and items trending in demand',
  jewelry_and_silver_report: 'jewelry, silver, and precious metals at estate sales — values, identification, and buying tips',
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { week_start, week_end, report_type, save_to_db } = await req.json();

    if (!week_start || !report_type) {
      return Response.json({ error: 'week_start and report_type are required' }, { status: 400 });
    }

    const reportDesc = REPORT_TYPE_PROMPTS[report_type] || report_type;
    const slug = `weekly-${report_type.replace(/_/g, '-')}-${week_start}`;

    const prompt = `Create a Weekly Market Report for EstateSalen.com.

Week: ${week_start} to ${week_end || 'current week'}
Report type: ${report_type}
Topic focus: ${reportDesc}

Return a JSON object with these exact keys:
{
  "report_title": "Engaging title for this week's report (include week or date context)",
  "report_slug": "${slug}",
  "seo_title": "SEO title (55-60 chars)",
  "seo_description": "Meta description (150-160 chars)",
  "article_content": "600-900 word HTML article covering this week's ${reportDesc}. Structure: intro → 3-5 featured items or categories with <h2> headings → each section covers: what it is, how to identify it, what it's worth (range), why it matters now → closing paragraph with CTA to find estate sales on EstateSalen. Use <p>, <h2>, <h3>, <ul>, <li> tags.",
  "selected_items_json": [
    {
      "item_name": "...",
      "category": "...",
      "value_range": "...",
      "why_notable": "..."
    }
  ],
  "schema_json": {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "...",
    "description": "..."
  }
}

Featured items: 4-6 items relevant to the report type. Value ranges should be realistic based on general knowledge of the antiques/collectibles market. Label all ranges as estimates.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      system_prompt: SYSTEM_PROMPT,
      response_json_schema: {
        type: 'object',
        properties: {
          report_title: { type: 'string' },
          report_slug: { type: 'string' },
          seo_title: { type: 'string' },
          seo_description: { type: 'string' },
          article_content: { type: 'string' },
          selected_items_json: { type: 'array', items: { type: 'object' } },
          schema_json: { type: 'object' },
        },
      },
    });

    if (save_to_db && result.report_title) {
      await base44.asServiceRole.entities.WeeklyMarketReport.create({
        report_title: result.report_title,
        report_slug: result.report_slug || slug,
        week_start,
        week_end: week_end || week_start,
        report_type,
        selected_items_json: result.selected_items_json || [],
        article_content: result.article_content,
        seo_title: result.seo_title,
        seo_description: result.seo_description,
        schema_json: result.schema_json || {},
        status: 'draft',
      });
    }

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});