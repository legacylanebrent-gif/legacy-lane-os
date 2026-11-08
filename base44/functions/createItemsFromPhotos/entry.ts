import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { loadAuthorizedSale } from '../../shared/saleAccess.ts';
import { buildPhotoItemPayload, photoKey, photoSourceOf } from '../../shared/photoItemPromotion.ts';
import { brandMapForSale } from '../../shared/brandRegistry.ts';
import { createDraftListing } from '../../shared/marketplaceListing.ts';

// One request is bounded so the work always finishes well inside the runtime limit.
const MAX_PHOTOS = 100;

/**
 * Turns selected sale photos into canonical inventory items.
 *
 * - Authorization is the sale's own: operator, sale team, or platform admin.
 * - Idempotent: an item records the photo it came from, so re-running the same
 *   selection can never create a second item for that photo.
 * - The item is created with the photo's Listing Price, or price 0 when the photo
 *   has none yet (the inventory views flag that as "Needs price").
 * - Each new item gets a DRAFT marketplace listing that goes live when the sale
 *   is published.
 */
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Sign in required' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const saleId = body?.sale_id;
    const requested = Array.isArray(body?.photo_ids)
      ? body.photo_ids.filter((id: any) => typeof id === 'string' && id.trim() !== '')
      : [];
    if (requested.length === 0) {
      return Response.json({ error: 'Select at least one photo' }, { status: 400 });
    }

    const service = base44.asServiceRole;
    const auth = await loadAuthorizedSale(service, user, saleId);
    if (auth.error) return auth.error;
    const sale = auth.sale;

    // Brands set on these photos by the analysis or the operator, from the shared list.
    const brandByPhoto = await brandMapForSale(service, sale.id).catch((error: any) => {
      console.error('Brand list load failed:', error && error.message);
      return {};
    });

    const images = Array.isArray(sale.images) ? sale.images : [];
    const existingPage = await service.entities.Item.filter(
      { estate_sale_id: sale.id },
      { limit: 2000, fields: ['id', 'item_number', 'specs'] },
    );
    const existingItems = Array.isArray(existingPage) ? existingPage : (existingPage.items || []);
    const promoted = new Map<string, any>();
    for (const item of existingItems) {
      const source = photoSourceOf(item);
      if (source?.photo_id) promoted.set(String(source.photo_id), item);
    }

    const created: any[] = [];
    const skipped: any[] = [];
    const failed: any[] = [];
    const seen = new Set<string>();

    for (const photoId of requested.slice(0, MAX_PHOTOS)) {
      if (seen.has(photoId)) continue;
      seen.add(photoId);

      const index = images.findIndex((img: any) => photoKey(img) === photoId);
      if (index === -1) {
        skipped.push({ photo_id: photoId, reason: 'That photo is no longer on this sale' });
        continue;
      }
      const photo = images[index];

      const already = promoted.get(photoId);
      if (already) {
        skipped.push({
          photo_id: photoId,
          title: photo?.name || '',
          item_id: already.id,
          item_number: already.item_number || null,
          reason: 'Already in inventory',
        });
        continue;
      }

      if (photo?.excluded_from_public) {
        skipped.push({
          photo_id: photoId,
          title: photo?.name || '',
          reason: 'Marked retained / KEEP — not turned into inventory',
        });
        continue;
      }

      try {
        const payload = buildPhotoItemPayload({ sale, photo, user, index, brand: brandByPhoto[photoId] || null });
        const item = await service.entities.Item.create(payload);

        // Canonical sale-scoped item number, through the one function that owns it.
        let itemNumber = null;
        try {
          const numbered = await base44.functions.invoke('assignItemNumber', { item_id: item.id });
          itemNumber = numbered?.data?.item_number ?? null;
        } catch (error: any) {
          console.error('Item number assignment failed for', item.id, error && error.message);
        }

        // Marketplace listing is a draft until the sale publishes.
        let listing = null;
        try {
          listing = await createDraftListing(service, { item, sale });
        } catch (error: any) {
          console.error('Draft marketplace listing failed for', item.id, error && error.message);
        }

        created.push({
          photo_id: photoId,
          item_id: item.id,
          item_number: itemNumber,
          title: payload.title,
          brand: payload.brand || null,
          price: payload.price,
          needs_price: !(payload.price > 0),
          marketplace_listing_id: listing?.id || null,
        });
      } catch (error: any) {
        console.error('Item creation from photo failed for', photoId, error && error.message);
        failed.push({
          photo_id: photoId,
          title: photo?.name || '',
          reason: error?.message || 'Could not create the item',
        });
      }
    }

    return Response.json({
      created_count: created.length,
      skipped_count: skipped.length,
      failed_count: failed.length,
      created,
      skipped,
      failed,
    });
  } catch (error: any) {
    console.error('createItemsFromPhotos error:', error && error.message);
    return Response.json({ error: error?.message || 'Could not create items from photos' }, { status: 500 });
  }
}