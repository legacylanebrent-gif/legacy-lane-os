import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Processes estate sale images that have no name/description yet,
// generates SEO-rich alt text via LLM vision, and writes back to the sale record.
// Runs nightly. Processes up to 20 sales per run to stay within limits.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Fetch upcoming/active/completed sales with images
    const sales = await base44.asServiceRole.entities.EstateSale.filter(
      { status: { $in: ['upcoming', 'active', 'draft'] } },
      '-updated_date',
      50
    );

    let salesProcessed = 0;
    let imagesEnriched = 0;
    const errors = [];

    for (const sale of sales) {
      if (!sale.images || sale.images.length === 0) continue;

      // Check if this sale has any images missing name or description
      const needsEnrichment = sale.images.some(
        img => typeof img === 'object' && (!img.name || !img.description)
      );

      // Also handle legacy string-URL images — convert them to objects
      const hasStringImages = sale.images.some(img => typeof img === 'string');

      if (!needsEnrichment && !hasStringImages) continue;
      if (salesProcessed >= 20) break; // cap per run

      const city = sale.property_address?.city || '';
      const state = sale.property_address?.state || '';
      const locationStr = city && state ? `${city}, ${state}` : (city || state || 'estate sale');
      const categories = (sale.categories || []).join(', ') || 'antiques, furniture, collectibles';

      // Build updated images array
      const updatedImages = [];
      let saleChanged = false;

      for (const img of sale.images) {
        // Normalize to object
        const imgObj = typeof img === 'string'
          ? { url: img, name: '', description: '', rotation: 0, categories: [] }
          : { ...img };

        // Skip if already has both name and description
        if (imgObj.name && imgObj.description) {
          updatedImages.push(imgObj);
          continue;
        }

        const imageUrl = imgObj.url;
        if (!imageUrl) {
          updatedImages.push(imgObj);
          continue;
        }

        try {
          // Use LLM with vision to generate SEO title + description for this image
          const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `You are an SEO expert for estate sales. 
Analyze this estate sale item image and generate:
1. A short, keyword-rich item NAME (5-10 words max) — be specific: brand, material, era, style if visible
2. A rich DESCRIPTION (40-70 words) optimized for Google Images search — include item type, era/style, material, condition cues, and why a buyer would want it. Mention "${locationStr}" estate sale context naturally.

The sale features: ${categories}
Sale title: "${sale.title}"
Location: ${locationStr}

Return JSON: { "name": "...", "description": "..." }`,
            image_url: imageUrl,
            response_json_schema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                description: { type: 'string' }
              },
              required: ['name', 'description']
            }
          });

          if (result?.name) {
            imgObj.name = result.name.trim();
            imgObj.description = result.description?.trim() || '';
            imagesEnriched++;
            saleChanged = true;
          }
        } catch (err) {
          errors.push(`Sale ${sale.id} img error: ${err.message}`);
        }

        updatedImages.push(imgObj);
      }

      if (saleChanged) {
        await base44.asServiceRole.entities.EstateSale.update(sale.id, {
          images: updatedImages
        });
        salesProcessed++;
      }
    }

    return Response.json({
      status: 'success',
      salesProcessed,
      imagesEnriched,
      errors: errors.slice(0, 10)
    });

  } catch (error) {
    console.error('generateSaleImageSEO error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});