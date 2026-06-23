import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data } = body;

    // Only process new stories
    if (event.type !== 'create' || !data) {
      return Response.json({ processed: false, reason: 'not a create event' });
    }

    const { id, title, story_content, where_found, photos } = data;

    if (!title || !story_content) {
      return Response.json({ processed: false, reason: 'missing title or content' });
    }

    // Fetch existing published stories to find related stories
    const existingStories = await base44.asServiceRole.entities.CoolFindStory.filter(
      { status: 'published' },
      '-published_at',
      50
    );

    const existingTitles = existingStories.map(s => ({
      id: s.id,
      title: s.title,
      category: s.category,
      tags: s.tags || [],
      object_type: s.object_type || '',
      era: s.era || ''
    }));

    // Build the prompt for AI to generate all metadata
    const photoContext = photos && photos.length > 0
      ? `\n\nThe story includes ${photos.length} photo(s).`
      : '';

    const prompt = `You are an expert editor for a blog about amazing discoveries from estate sales, attic finds, garage sales, and cleanouts.

A user has submitted a story with minimal information. Your job is to analyze it and generate rich metadata to make it a compelling, discoverable blog post.

SUBMITTED INFORMATION:
Title: "${title}"
Basic Story: "${story_content.substring(0, 3000)}"
Where Found: "${where_found || 'Not specified'}"${photoContext}

AVAILABLE CATEGORIES (pick the single best fit):
- what_is_this: Mysterious items where the owner doesn't know what they found
- mystery_solved: An item that was initially mysterious but got identified
- hidden_treasures: Valuable items found in unexpected places
- rare_finds: Uncommon or hard-to-find items
- strange_discoveries: Bizarre or unusual finds
- forgotten_history: Items with historical significance that were forgotten
- vintage_collectibles: Collectible items from past decades
- family_heirlooms: Items passed down through generations with stories
- amazing_attic_finds: Discoveries made in attics
- behind_the_walls: Items found hidden in walls or structures
- incredible_garage_finds: Discoveries from garage sales or garages
- weird_things_found: Odd or peculiar items
- most_valuable_discoveries: High-value finds
- antique_mysteries: Old items with unknown origins or purposes
- nostalgic_finds: Items that evoke nostalgia
- lost_treasures: Items that were lost and rediscovered
- historical_artifacts: Items with clear historical significance

EXISTING PUBLISHED STORIES (for finding related stories):
${JSON.stringify(existingTitles.slice(0, 30))}

Generate a JSON object with:
1. category: the single best category key from the list above
2. excerpt: a compelling 1-2 sentence summary for blog cards and SEO (max 200 chars)
3. tags: 5-8 relevant tags for discovery and filtering (short phrases, lowercase)
4. era: the likely era or time period of the item (e.g. "Victorian", "Mid-Century Modern", "1920s", "Unknown")
5. object_type: the type of object (e.g. "Furniture", "Jewelry", "Document", "Photograph", "Tool", "Art", "Coin")
6. seo_title: an SEO-optimized page title (max 60 chars, include the key discovery term)
7. seo_description: an SEO meta description (max 160 chars)
8. seo_keywords: 5-10 SEO keywords for search engines
9. ai_enhanced_content: an enhanced, well-structured version of the story with better flow, an engaging opening hook, and clear paragraphs. Keep the original facts and tone but make it read like a polished blog post. Use markdown formatting. Do NOT invent facts that aren't in the original story — enhance the writing, not the content.
10. related_story_ids: array of up to 3 existing story IDs that are topically related (by category, tags, object_type, or era). Only include IDs from the existing stories list. Empty array if none are related.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          category: { type: 'string' },
          excerpt: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          era: { type: 'string' },
          object_type: { type: 'string' },
          seo_title: { type: 'string' },
          seo_description: { type: 'string' },
          seo_keywords: { type: 'array', items: { type: 'string' } },
          ai_enhanced_content: { type: 'string' },
          related_story_ids: { type: 'array', items: { type: 'string' } }
        },
        required: ['category', 'excerpt', 'tags', 'era', 'object_type', 'seo_title', 'seo_description', 'seo_keywords', 'ai_enhanced_content', 'related_story_ids']
      }
    });

    // Validate the category is one of the allowed values
    const validCategories = [
      'what_is_this', 'mystery_solved', 'hidden_treasures', 'rare_finds',
      'strange_discoveries', 'forgotten_history', 'vintage_collectibles',
      'family_heirlooms', 'amazing_attic_finds', 'behind_the_walls',
      'incredible_garage_finds', 'weird_things_found', 'most_valuable_discoveries',
      'antique_mysteries', 'nostalgic_finds', 'lost_treasures', 'historical_artifacts'
    ];
    const category = validCategories.includes(result.category) ? result.category : 'rare_finds';

    // Update the story with AI-generated metadata
    await base44.asServiceRole.entities.CoolFindStory.update(id, {
      category,
      excerpt: result.excerpt,
      tags: result.tags || [],
      era: result.era,
      object_type: result.object_type,
      seo_title: result.seo_title,
      seo_description: result.seo_description,
      seo_keywords: result.seo_keywords || [],
      ai_enhanced_content: result.ai_enhanced_content,
      related_story_ids: result.related_story_ids || [],
      ai_metadata_status: 'generated'
    });

    return Response.json({
      processed: true,
      category,
      tags: result.tags,
      era: result.era,
      object_type: result.object_type,
      related_count: (result.related_story_ids || []).length
    });

  } catch (error) {
    console.error('generateCoolFindMetadata error:', error);

    // Mark the story as failed so admins know
    try {
      const base44 = createClientFromRequest(req);
      const body = await req.json().catch(() => ({}));
      const { data } = body;
      if (data?.id) {
        await base44.asServiceRole.entities.CoolFindStory.update(data.id, {
          ai_metadata_status: 'failed'
        });
      }
    } catch (_) {}

    return Response.json({ error: error.message }, { status: 500 });
  }
});