/**
 * PIPELINE: Sale Image → Item Intelligence Repository
 *
 * Triggered by: entity automation on EstateSale (update)
 * Also callable directly with { sale_id }
 *
 * For each named image in the sale:
 *  1. AI extracts metadata (brand, category, era, style, etc.)
 *  2. Calls itemMatchingService to upsert ItemKnowledge + create ItemImageReference
 *  3. Writes SEOItemProfile + SEOPage ONLY if ItemKnowledge was matched/created
 *  4. Ensures brand/category/city hub stubs exist
 *
 * NOTE: No duplicate AI call — metadata computed once and passed to matching service.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { mutateSalePhotos, locatePhoto, blockedPhoto } from '../../shared/photoStore.ts';

function toSlug(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/[''""]/g, '').replace(/[^a-z0-9\s-]/g, ' ').trim()
    .replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
}

function buildItemSlug(itemName, shortId) {
  const base = toSlug(itemName || 'estate-sale-item');
  const suffix = shortId ? '-' + shortId : '';
  const max = 90 - suffix.length;
  return '/items/' + (base.length > max ? base.substring(0, max) : base) + suffix;
}

function detectItemMetadata(image) {
  // Metadata projection ONLY. No second identity inference or provider call.
  return { canonical_name: image.name, normalized_name: image.name.toLowerCase().trim(), category: image.categories?.[0] || '', short_description: image.description || '', long_description: image.description || '', search_keywords: image.categories || [], confidence_score: 0 };
}
function sourceFingerprint(photo, sale) {
  return JSON.stringify([photo.pipeline?.revision, photo.pipeline?.edit_revision, photo.name, photo.description, photo.price, photo.categories, photo.url, sale.status, sale.property_address?.city, sale.property_address?.state]);
}

async function upsertSeoItemProfile(base44, image, metadata, sale, shortId, knowledgeId) {
  const existing = await base44.asServiceRole.entities.SEOItemProfile.filter({ sale_id: sale.id, item_id: shortId });
  const profileData = {
    item_id: shortId,
    item_knowledge_id: knowledgeId,
    sale_id: sale.id,
    company_id: sale.operator_id || '',
    brand_name: metadata.brand || '',
    category_name: metadata.category || '',
    style: metadata.style || '',
    estimated_age: metadata.era || '',
    condition_summary: 'Condition not specified',
    value_low: image.price ? Math.round(image.price * 0.7) : null,
    value_high: image.price ? Math.round(image.price * 1.3) : null,
    sold_status: image.sold_status || (image.sold ? 'sold' : 'available'),
    ai_description: metadata.long_description || metadata.short_description || '',
    search_keywords: metadata.search_keywords || [],
    image_url: image.url || '',
    item_name: image.name || '',
    indexed_status: 'not_submitted',
  };
  if (existing.length > 0) {
    await base44.asServiceRole.entities.SEOItemProfile.update(existing[0].id, profileData);
    return existing[0].id;
  } else {
    const created = await base44.asServiceRole.entities.SEOItemProfile.create(profileData);
    return created.id;
  }
}

async function upsertSeoPage(base44, image, metadata, sale, slug, seoProfileId, knowledgeId) {
  const city = sale?.property_address?.city || '';
  const state = sale?.property_address?.state || '';
  const locationStr = [city, state].filter(Boolean).join(', ');
  const isSold = image.sold_status === 'sold' || image.sold;
  const soldNote = isSold ? ' (Sold)' : '';
  const desc = metadata.long_description || metadata.short_description || '';

  const pageData = {
    page_type: 'item',
    entity_id: seoProfileId,
    item_knowledge_id: knowledgeId,
    slug,
    title: `${image.name || 'Estate Sale Item'}${soldNote}${locationStr ? ' — ' + locationStr : ''} | EstateSalen`,
    meta_description: desc.substring(0, 155),
    h1: `${image.name || 'Estate Sale Item'}${soldNote}`,
    intro_content: desc,
    schema_json: {
      '@context': 'https://schema.org', '@type': 'Product',
      name: image.name || 'Estate Sale Item', description: desc,
      offers: { '@type': 'Offer', priceCurrency: 'USD', availability: isSold ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock', ...(image.price ? { price: image.price } : {}) },
      ...(metadata.brand ? { brand: { '@type': 'Brand', name: metadata.brand } } : {}),
    },
    status: 'published',
    indexed_status: 'not_submitted',
    published_at: new Date().toISOString(),
  };

  const existing = await base44.asServiceRole.entities.SEOPage.filter({ slug });
  if (existing.length > 0) {
    await base44.asServiceRole.entities.SEOPage.update(existing[0].id, pageData);
  } else {
    await base44.asServiceRole.entities.SEOPage.create(pageData);
  }
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 });
    const body = await req.json().catch(() => ({}));
    const saleId = body?.data?.id || body?.event?.entity_id || body?.sale_id;
    if (!saleId) return Response.json({ error: 'sale_id required' }, { status: 400 });

    const sales = await base44.asServiceRole.entities.EstateSale.filter({ id: saleId });
    if (!sales.length) return Response.json({ error: 'Sale not found' }, { status: 404 });
    const sale = sales[0];

    const images = ['upcoming', 'active', 'completed'].includes(sale.status) ? (sale.images || []).filter(img => img.name?.trim() && img.pipeline?.id && !blockedPhoto(img) && !img.pipeline.review_required && img.pipeline.operator_fields?.includes('name') && img.pipeline.jobs?.seo?.result?.fingerprint !== sourceFingerprint(img, sale)) : [];
    if (!images.length) return Response.json({ message: 'No changed operator-approved public items', processed: 0, provider_calls: 0 });
    let processed = 0;
    const errors = [];

    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      try {
        const fingerprint = sourceFingerprint(image, sale);
        const claim = await mutateSalePhotos(base44.asServiceRole, sale.id, user, (currentImages, currentSale) => {
          const photo = locatePhoto(currentImages, { photo_id: image.pipeline.id, image_revision: image.pipeline.revision });
          if (sourceFingerprint(photo, currentSale) !== fingerprint || blockedPhoto(photo)) return false;
          const previous = photo.pipeline.jobs?.seo;
          // A partial side-effect attempt is not automatically replayed.
          if (previous?.state === 'processing' || previous?.result?.fingerprint === fingerprint) return false;
          photo.pipeline.jobs.seo = { state: 'processing', result: { fingerprint }, at: new Date().toISOString() };
          return true;
        });
        if (!claim.value) continue;
        const shortId = image.pipeline.id;
        const metadata = detectItemMetadata(image);

        // 2. Route everything through central matching service
        const matchRes = await base44.asServiceRole.functions.invoke('itemMatchingService', {
          canonical_name: metadata.canonical_name || image.name,
          normalized_name: metadata.normalized_name || (image.name || '').toLowerCase(),
          brand: metadata.brand || '',
          manufacturer: metadata.manufacturer || '',
          category: metadata.category || '',
          subcategory: metadata.subcategory || '',
          item_type: metadata.item_type || '',
          model: metadata.model || '',
          pattern: metadata.pattern || '',
          era: metadata.era || '',
          style: metadata.style || '',
          material: metadata.material || '',
          color: metadata.color || '',
          country_of_origin: metadata.country_of_origin || '',
          short_description: metadata.short_description || '',
          long_description: metadata.long_description || '',
          historical_context: metadata.historical_context || '',
          search_keywords: metadata.search_keywords || [],
          seo_title: `${metadata.canonical_name || image.name} — Estate Sale Price Guide | EstateSalen`,
          seo_description: (metadata.short_description || '').substring(0, 155),
          confidence_score: metadata.confidence_score || 60,
          original_image_url: image.url || '',
          source_type: 'sale_upload',
          source_record_id: shortId,
          sale_id: sale.id,
          sale_item_id: shortId,
          operator_id: sale.operator_id || '',
          price: image.price || null,
          sold_status: image.sold_status || (image.sold ? 'sold' : 'listed'),
          ai_metadata: metadata,
        });

        const knowledgeId = matchRes?.data?.item_knowledge_id;
        if (!knowledgeId) throw new Error('Knowledge projection did not return a record ID');

        // 3. SEOItemProfile + SEOPage — only if knowledge was matched/created
        if (knowledgeId) {
          const slug = buildItemSlug(image.name, shortId);
          const seoProfileId = await upsertSeoItemProfile(base44, image, metadata, sale, shortId, knowledgeId);
          await upsertSeoPage(base44, image, metadata, sale, slug, seoProfileId, knowledgeId);
        }

        await mutateSalePhotos(base44.asServiceRole, sale.id, user, currentImages => {
          const photo = locatePhoto(currentImages, { photo_id: image.pipeline.id, image_revision: image.pipeline.revision });
          if (photo.pipeline.jobs?.seo?.result?.fingerprint === fingerprint) photo.pipeline.jobs.seo.state = 'completed';
        });
        processed++;
      } catch (err) {
        errors.push({ item: image.name, error: err.message });
        console.error(`processItemSeoOnSaleUpdate — item "${image.name}":`, err.message);
      }

      if (i < images.length - 1) await new Promise(r => setTimeout(r, 350));
    }

    return Response.json({ message: `Projected ${processed}/${images.length} changed approved items`, processed, total: images.length, provider_calls: 0, errors: errors.length ? errors : undefined });
  } catch (error) {
    return Response.json({ error: error.message }, { status: error.status || 500 });
  }
}