import { createClientFromRequest } from 'npm:@base44/sdk@0.8.32';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { image_url, categories } = await req.json();

    if (!image_url) {
      return Response.json({ error: 'image_url is required' }, { status: 400 });
    }

    if (!categories || !Array.isArray(categories) || categories.length === 0) {
      return Response.json({ error: 'categories array is required' }, { status: 400 });
    }

    // Chapter 6 P2 — SENSITIVE-MATERIAL GUARD: the vision check runs FIRST. If the
    // image appears to contain potentially sensitive material (documents, IDs,
    // financial/medical information, private photos, credentials), the AI must NOT
    // proceed as though it were ordinary merchandise, must not describe/transcribe/
    // extract any of the sensitive content, and returns a STOP/REVIEW signal instead.
    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `You are reviewing an image for an estate-sale inventory. FIRST check for potentially sensitive material: financial statements, tax records, bank or credit card information, checkbooks, Social Security cards, passports, driver licenses, medical records, prescription medication, legal documents, private correspondence, account credentials, or mail containing sensitive information.

If the image appears to contain ANY of these, respond with sensitive=true, an EMPTY category and an EMPTY searchQuery, and do NOT describe, name, transcribe, or extract any of the sensitive content.

Only if the image appears to be ordinary sale merchandise, respond with sensitive=false and identify what category it belongs to from this list: ${categories.join(', ')}, plus a specific search query to find similar items (include brand, style, era, or type if visible).

Return ONLY valid JSON with this exact format: {"sensitive": true|false, "category": "ExactCategoryName or empty if sensitive", "searchQuery": "specific search terms or empty if sensitive"}.`,
      file_urls: [image_url],
      response_json_schema: {
        type: 'object',
        properties: {
          sensitive: { type: 'boolean', description: 'True when the image appears to contain potentially sensitive material that must be reviewed before cataloging or publishing.' },
          category: { type: 'string', description: 'Category from the list; empty when sensitive' },
          searchQuery: { type: 'string', description: 'Specific search query; empty when sensitive' },
        },
        required: ['sensitive', 'category', 'searchQuery'],
      },
      model: 'gpt_5_mini',
    });

    console.log('Image analysis result:', response);

    if (response.sensitive === true) {
      console.log('Sensitive-material guard triggered for image analysis.');
    }

    return Response.json({
      sensitive: response.sensitive === true,
      category: response.sensitive === true ? '' : response.category,
      searchQuery: response.sensitive === true ? '' : response.searchQuery,
    });
  } catch (error) {
    console.error('Image analysis error:', error);
    return Response.json({
      error: error.message || 'Failed to analyze image',
      details: error.toString()
    }, { status: 500 });
  }
});