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

    // Use OpenAI's GPT-4 Vision for image analysis
    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `Look at this image and identify what category it belongs to from this list: ${categories.join(', ')}. Then provide a specific search query to find similar items (include brand, style, era, or type if visible). Return ONLY valid JSON with this exact format: {"category": "ExactCategoryName", "searchQuery": "specific search terms"}. Example: {"category": "Cameras & Photography", "searchQuery": "vintage medium format camera"}`,
      file_urls: [image_url],
      response_json_schema: {
        type: 'object',
        properties: {
          category: { type: 'string', description: 'Category from the list' },
          searchQuery: { type: 'string', description: 'Specific search query' },
        },
        required: ['category', 'searchQuery'],
      },
      model: 'gpt_5_mini',
    });

    console.log('Image analysis result:', response);

    return Response.json({
      category: response.category,
      searchQuery: response.searchQuery,
    });
  } catch (error) {
    console.error('Image analysis error:', error);
    return Response.json({ 
      error: error.message || 'Failed to analyze image',
      details: error.toString()
    }, { status: 500 });
  }
});