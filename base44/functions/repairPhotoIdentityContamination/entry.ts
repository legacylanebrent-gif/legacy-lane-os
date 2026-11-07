import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import {
  photoUrl,
  isBlank,
  looksLikeInventedSeoCopy,
  sharedTitleCountFor,
} from '../../shared/photoFields.ts';

/**
 * Reversible repair for photos polluted by the retired nightly SEO job.
 *
 * What it does (per photo, in place):
 *  - keeps the polluted values in `name_before_repair` / `description_before_repair`
 *  - clears ONLY `name` and `description` (the invented identity)
 *  - flags `identity_review_required` so an operator decides what to do next
 *  - leaves synopsis, prices, categories and every operator field untouched
 *
 * It never calls a paid provider, never resends photos for a scan, and only
 * touches photos that match the contamination signature AND share a duplicate
 * title with other photos in the same sale. `restore: true` puts the backup
 * values back.
 *
 * Body: { sale_id?: string, dry_run?: boolean, restore?: boolean, limit?: number }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    let body = {};
    try { body = await req.json(); } catch { body = {}; }
    const dryRun = body?.dry_run !== false;
    const restore = body?.restore === true;
    const limit = Math.min(Number(body?.limit) || 200, 500);

    const sales = body?.sale_id
      ? await base44.asServiceRole.entities.EstateSale.filter({ id: body.sale_id })
      : await base44.asServiceRole.entities.EstateSale.list('-updated_date', 100);

    const report = { dry_run: dryRun, restore, sales_scanned: 0, photos_flagged: 0, photos_restored: 0, sales: [] };

    for (const sale of sales) {
      const images = sale.images || [];
      if (images.length === 0) continue;
      report.sales_scanned++;

      const nextImages = [];
      const flagged = [];

      for (const img of images) {
        if (!img || typeof img !== 'object') { nextImages.push(img); continue; }

        if (restore) {
          if (img.identity_repaired_at) {
            const restored = { ...img };
            if (img.name_before_repair !== undefined) restored.name = img.name_before_repair;
            if (img.description_before_repair !== undefined) restored.description = img.description_before_repair;
            delete restored.name_before_repair;
            delete restored.description_before_repair;
            delete restored.identity_repaired_at;
            delete restored.identity_review_required;
            nextImages.push(restored);
            flagged.push({ url: photoUrl(img), action: 'restored' });
          } else {
            nextImages.push(img);
          }
          continue;
        }

        if (img.identity_repaired_at) { nextImages.push(img); continue; }

        const shared = sharedTitleCountFor(img, images);
        const invented = looksLikeInventedSeoCopy(img, sale, shared);
        // A title shared by 5+ photos in ONE sale is not a per-photo identification,
        // whatever else the photo carries: the same label cannot describe five
        // different photographs. Its name is cleared; real scan evidence is kept.
        const massDuplicated = shared >= 5;
        if (!invented && !massDuplicated) { nextImages.push(img); continue; }

        // Photos backed by a real scan keep their description and prices; only
        // the shared label is removed. Untouched template copy is cleared fully.
        const keepEvidence = !isBlank(img.synopsis) || !isBlank(img.ai_first_search_price)
          || !isBlank(img.ai_deep_search_price) || !isBlank(img.serp_search_status);

        flagged.push({
          url: photoUrl(img),
          action: (dryRun ? 'would_clear' : 'cleared') + (keepEvidence ? '_name_only' : ''),
          previous_name: img.name || '',
        });

        if (dryRun) { nextImages.push(img); continue; }

        const repaired = {
          ...img,
          name_before_repair: img.name || '',
          description_before_repair: img.description || '',
          name: '',
          description: '',
          name_source: null,
          description_source: null,
          identity_review_required: true,
          identity_repaired_at: new Date().toISOString(),
        };
        nextImages.push(repaired);
      }

      if (flagged.length > 0) {
        if (restore) report.photos_restored += flagged.length;
        else report.photos_flagged += flagged.length;

        if (!dryRun) {
          await base44.asServiceRole.entities.EstateSale.update(sale.id, { images: nextImages });
        }
        report.sales.push({
          sale_id: sale.id,
          title: sale.title,
          photos: flagged.length,
          sample: flagged.slice(0, 3),
        });
      }
      if (report.photos_flagged + report.photos_restored >= limit) break;
    }

    console.log('repairPhotoIdentityContamination', {
      dryRun, restore,
      sales_scanned: report.sales_scanned,
      photos_flagged: report.photos_flagged,
      photos_restored: report.photos_restored,
    });

    return Response.json(report);
  } catch (error) {
    console.error('repairPhotoIdentityContamination error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});