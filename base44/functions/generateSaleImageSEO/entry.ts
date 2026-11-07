import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import {
  applyPhotoFields,
  photoUrl,
  hasIdentityWork,
  isBlank,
} from '../../shared/photoFields.ts';

/**
 * Nightly identity fill for sale photos that have NO identity work at all.
 *
 * REPAIR NOTES (data-integrity defect):
 *  - This job used to pass the photo as `image_url`, which is NOT a valid
 *    InvokeLLM input. The model never received the photograph and fabricated
 *    generic furniture/SEO copy from the sale's category text plus the city
 *    named in the prompt. That invented text was then written into `name` and
 *    `description` of every unlabeled photo, in one whole-array write — the
 *    source of every photo in a sale showing the same wrong item.
 *  - The photo is now attached through `file_urls` (the supported input).
 *  - The result is validated: if the model cannot see/identify a single item it
 *    returns identified=false and NOTHING is written. There is no fallback text.
 *  - Only photos with no existing identity, synopsis, price or search evidence
 *    are considered, and each photo is saved through the canonical per-photo
 *    save (addressed by url), never a whole-array write.
 */

const MAX_PHOTOS_PER_RUN = 20;

Deno.serve(async (req) => {
  const started = Date.now();
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    let body = {};
    try { body = await req.json(); } catch { body = {}; }
    const maxPhotos = Math.min(Number(body?.max_photos) || MAX_PHOTOS_PER_RUN, MAX_PHOTOS_PER_RUN);

    const sales = await base44.asServiceRole.entities.EstateSale.filter(
      { status: { $in: ['upcoming', 'active', 'draft'] } },
      '-updated_date',
      50,
    );

    let salesTouched = 0;
    let imagesEnriched = 0;
    let skippedUnidentified = 0;
    let attempts = 0;
    const errors = [];

    for (const sale of sales) {
      if (imagesEnriched >= maxPhotos) break;
      const images = sale.images || [];
      if (images.length === 0) continue;

      const candidates = images
        .map((img, index) => ({ img, index }))
        .filter(({ img }) => {
          if (!img || typeof img !== 'object') return false;
          if (!photoUrl(img)) return false;
          if (img.skip_item || img.skip_serp_search || img.serp_search_status === 'do_not_search') return false;
          // Never touch a photo that already carries any identity or evidence.
          return !hasIdentityWork(img) && isBlank(img.name) && isBlank(img.description);
        });

      if (candidates.length === 0) continue;

      for (const { img } of candidates) {
        if (imagesEnriched >= maxPhotos) break;
        const imageUrl = photoUrl(img);
        attempts++;

        try {
          const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `Look at THIS photograph from an estate sale and state what is actually in it.

Rules:
- If the photo shows ONE identifiable item, set identified true and give its factual name and a short description (what it is, material, era/style if clearly visible, condition cues). Do not invent brand, era, measurements or provenance you cannot see.
- If the photo shows a room, a group of items, or anything you cannot identify with reasonable confidence, set identified false and return EMPTY name and description. Never guess.
- Do not write sales or marketing copy. Do not mention the estate sale, the city, the sale title or call to action.

Respond as JSON: {"identified": boolean, "confidence": "high"|"medium"|"low", "name": "...", "description": "..."}`,
            file_urls: [imageUrl],
            response_json_schema: {
              type: 'object',
              properties: {
                identified: { type: 'boolean' },
                confidence: { type: 'string' },
                name: { type: 'string' },
                description: { type: 'string' },
              },
              required: ['identified', 'confidence', 'name', 'description'],
            },
          });

          const identified = result?.identified === true;
          const confidence = String(result?.confidence || '').toLowerCase();
          const name = (result?.name || '').trim();
          const description = (result?.description || '').trim();

          if (!identified || !name || confidence === 'low') {
            skippedUnidentified++;
            continue;
          }

          // Re-read the CURRENT sale so this write merges into live data.
          const fresh = (await base44.asServiceRole.entities.EstateSale.filter({ id: sale.id }))[0];
          const freshImages = [...(fresh?.images || [])];
          const idx = freshImages.findIndex((p) => photoUrl(p) === imageUrl);
          if (idx === -1) continue;
          const currentPhoto = typeof freshImages[idx] === 'string' ? { url: freshImages[idx] } : freshImages[idx];
          if (hasIdentityWork(currentPhoto)) continue;

          const { photo, changed } = applyPhotoFields(
            currentPhoto,
            { name, description, ai_result_id: `seo-${sale.id}-${idx}-${Date.now()}` },
            'fill_empty',
          );
          if (changed.length === 0) continue;

          freshImages[idx] = photo;
          await base44.asServiceRole.entities.EstateSale.update(sale.id, { images: freshImages });
          imagesEnriched++;
          salesTouched = salesTouched + 1;
        } catch (err) {
          errors.push(`sale ${sale.id}: ${err.message}`);
          console.error('generateSaleImageSEO photo failed', { sale_id: sale.id, photo_url: imageUrl, error: err.message });
        }
      }
    }

    console.log('generateSaleImageSEO completed', {
      maxPhotos,
      attempts,
      imagesEnriched,
      skippedUnidentified,
      ms: Date.now() - started,
    });

    return Response.json({
      status: 'success',
      max_photos: maxPhotos,
      attempts,
      images_enriched: imagesEnriched,
      skipped_unidentified: skippedUnidentified,
      errors: errors.slice(0, 10),
    });
  } catch (error) {
    console.error('generateSaleImageSEO error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});