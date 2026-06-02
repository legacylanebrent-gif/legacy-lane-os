import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import OpenAI from 'npm:openai';

const WORD_TARGETS = {
  sale:     { min: 1000, max: 2000 },
  item:     { min: 500,  max: 900  },
  brand:    { min: 1200, max: 2000 },
  category: { min: 1200, max: 2000 },
  city:     { min: 1000, max: 1800 },
  county:   { min: 1000, max: 1800 },
  state:    { min: 1000, max: 1800 },
  company:  { min: 800,  max: 1500 },
  blog:     { min: 1200, max: 2500 },
  report:   { min: 1500, max: 3000 },
};

function buildSystemPrompt() {
  return `You are a professional SEO content writer specializing in estate sales, antiques, collectibles, and local real estate transitions.

CORE RULES:
- Write in natural, engaging language — never keyword-stuff.
- Mention city, county, and state naturally where relevant.
- Never claim an item is authentic, rare, or valuable unless explicitly confirmed in the provided data.
- When uncertain, use hedging phrases: "appears to be," "may be," "commonly associated with," "believed to date from," "consistent with the style of."
- All content must be factually grounded in the provided entity data.
- Do not fabricate prices, dates, or provenance.
- Write for both humans and search engines — clarity first.
- Use headers (H2, H3) naturally in main_content using markdown.
- FAQ answers should be 2–4 sentences each, genuinely useful to the reader.
- internal_links should be relative URL paths (e.g. /categories/furniture, /brands/pyrex) that would logically link from this page.
- schema_recommendation should be a valid JSON-LD object appropriate for the page type.

RETURN FORMAT: Valid JSON only. No markdown code fences. No extra text outside the JSON object.`;
}

function buildUserPrompt(page_type, entity_data, related_items, related_sales, related_company, related_location, sold_data) {
  const target = WORD_TARGETS[page_type] || { min: 800, max: 1500 };

  const sections = [
    `PAGE TYPE: ${page_type}`,
    `TARGET LENGTH: ${target.min}–${target.max} words for main_content`,
    '',
    `ENTITY DATA:\n${JSON.stringify(entity_data || {}, null, 2)}`,
  ];

  if (related_items?.length) {
    sections.push(`\nRELATED ITEMS (up to 20 shown):\n${JSON.stringify(related_items.slice(0, 20), null, 2)}`);
  }
  if (related_sales?.length) {
    sections.push(`\nRELATED SALES (up to 10 shown):\n${JSON.stringify(related_sales.slice(0, 10), null, 2)}`);
  }
  if (related_company) {
    sections.push(`\nRELATED COMPANY:\n${JSON.stringify(related_company, null, 2)}`);
  }
  if (related_location) {
    sections.push(`\nLOCATION CONTEXT:\n${JSON.stringify(related_location, null, 2)}`);
  }
  if (sold_data?.length) {
    sections.push(`\nSOLD DATA / PRICE HISTORY:\n${JSON.stringify(sold_data.slice(0, 30), null, 2)}`);
  }

  const typeInstructions = {
    sale: `Write an SEO-optimized page for this estate sale listing. Lead with location and sale highlights. Naturally weave in notable items, categories, dates, and the operating company. End with a section on how to attend and what to expect.`,
    item: `Write an SEO-optimized item profile. Describe the item using available data. Include style period, condition, value context, and collector interest where appropriate. Use hedging language when uncertain about authenticity or origin.`,
    brand: `Write an authoritative brand hub page. Cover brand history, what items appear at estate sales, value ranges commonly seen, and collector tips. Include a price guide section with estate sale context.`,
    category: `Write a comprehensive category hub page. Cover what types of items fall in this category, what to look for at estate sales, value ranges, notable brands in this category, and buying/selling guidance.`,
    city: `Write a local estate sale guide for this city/area. Cover the local estate sale market, what types of items are commonly found, featured companies operating here, and tips for shoppers in this region.`,
    county: `Write a local estate sale guide for this county. Cover the local market, types of items commonly found, featured companies, and shopper tips for this region.`,
    state: `Write a statewide estate sale guide. Cover the estate sale market in this state, regional highlights, notable cities, and tips for shoppers.`,
    company: `Write a professional company profile page. Cover the company's service area, specialties, experience, and what sellers and buyers can expect. Do not fabricate testimonials or specific reviews.`,
    blog: `Write an engaging, informative blog post based on the provided topic/data. Use subheadings, include practical tips, and cite any data points provided. Natural linking to related topics is encouraged.`,
    report: `Write a comprehensive estate sale market report for the given time period and geographic scope. Lead with a summary of key trends, include data analysis sections, and close with an outlook. Use markdown headers for each section.`,
  };

  sections.push(`\nCONTENT INSTRUCTIONS:\n${typeInstructions[page_type] || typeInstructions.blog}`);
  sections.push(`\nReturn ONLY a JSON object with these exact keys: seo_title, meta_description, h1, intro_content, main_content, faq (array of {question, answer}), keywords (array of strings), internal_links (array of relative URL strings), schema_recommendation (JSON-LD object).`);

  return sections.join('\n');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      page_type,
      entity_data,
      related_items,
      related_sales,
      related_company,
      related_location,
      sold_data,
    } = await req.json();

    if (!page_type) {
      return Response.json({ error: 'page_type is required' }, { status: 400 });
    }
    if (!entity_data) {
      return Response.json({ error: 'entity_data is required' }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });

    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(
      page_type,
      entity_data,
      related_items,
      related_sales,
      related_company,
      related_location,
      sold_data
    );

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.6,
      max_tokens: 4096,
    });

    const raw = completion.choices[0].message.content;
    let result;
    try {
      result = JSON.parse(raw);
    } catch {
      return Response.json({ error: 'AI returned invalid JSON', raw }, { status: 500 });
    }

    // Normalise keys — ensure all expected fields are present
    const output = {
      seo_title:           result.seo_title || '',
      meta_description:    result.meta_description || '',
      h1:                  result.h1 || '',
      intro_content:       result.intro_content || '',
      main_content:        result.main_content || '',
      faq:                 Array.isArray(result.faq) ? result.faq : [],
      keywords:            Array.isArray(result.keywords) ? result.keywords : [],
      internal_links:      Array.isArray(result.internal_links) ? result.internal_links : [],
      schema_recommendation: result.schema_recommendation || {},
    };

    return Response.json(output);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});