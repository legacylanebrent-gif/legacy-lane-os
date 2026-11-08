/**
 * BRAND REGISTRY (server-side rules).
 *
 * One place decides how a brand name typed by the AI or by an operator becomes a
 * canonical Brand record, and how a sale photo is attached to it.
 *
 * Doctrine:
 *  - A brand is only ever recorded when the photograph or a clearly matching
 *    research result supports it. Absence is recorded as "no brand", never a guess.
 *  - One brand per name: matching happens on a normalized key, so casing,
 *    punctuation and legal suffixes can't split a brand into duplicates.
 *  - A photo carries at most one brand; linking it to a brand removes it from any
 *    other brand it was attached to.
 *  - The operator's choice outranks the AI — a later analysis run never moves a
 *    photo off a brand the operator set by hand (same rule as operator_fields).
 */

const MAX_NAME = 80;
const LEGAL_SUFFIX = /\b(inc|incorporated|co|company|corp|corporation|ltd|limited|llc|plc|gmbh|ag|nv|bv|sa|srl|spa)\b/g;

/** Display form of a brand name: trimmed, single-spaced, quotes removed. */
export function cleanBrandName(raw: any): string {
  const name = String(raw ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, '')
    .trim();
  return name.length > MAX_NAME ? name.slice(0, MAX_NAME).trim() : name;
}

/** Comparison key: case, accents, punctuation and legal suffixes removed. */
export function brandKey(raw: any): string {
  return cleanBrandName(raw)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(LEGAL_SUFFIX, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    // "Tiffany & Co." and "Tiffany" must land on the same key.
    .replace(/\s+and$/, '');
}

export function brandSlug(key: string): string {
  return key.replace(/\s+/g, '-').slice(0, 80);
}

const rows = (page: any): any[] => (Array.isArray(page) ? page : (page?.items || []));

/** Every brand used by one sale — the single read that serves the photo screen. */
export async function brandsTouchingSale(service: any, saleId: string): Promise<any[]> {
  if (!saleId) return [];
  return rows(await service.entities.Brand.filter({ sale_ids: saleId }, { limit: 300 }));
}

/** Existing brand for this name (by normalized key, then by exact alias). */
export async function findBrand(service: any, rawName: any): Promise<any | null> {
  const name = cleanBrandName(rawName);
  const key = brandKey(name);
  if (!name || !key) return null;

  const byKey = rows(await service.entities.Brand.filter({ normalized_name: key }, { limit: 1 }));
  if (byKey.length) return byKey[0];

  const byAlias = rows(await service.entities.Brand.filter({ aliases: name }, { limit: 1 }));
  return byAlias.length ? byAlias[0] : null;
}

/** The canonical brand for a name, created the first time it is seen. */
export async function resolveBrand(
  service: any,
  rawName: any,
  source: 'ai' | 'operator' = 'ai',
): Promise<{ brand_id: string; name: string } | null> {
  const name = cleanBrandName(rawName);
  const key = brandKey(name);
  if (!name || !key) return null;

  const existing = await findBrand(service, name);
  if (existing) return { brand_id: existing.id, name: existing.name || name };

  try {
    const created = await service.entities.Brand.create({
      name,
      normalized_name: key,
      slug: brandSlug(key),
      source,
      status: 'active',
      aliases: [],
      photo_refs: [],
      sale_ids: [],
    });
    return { brand_id: created.id, name: created.name || name };
  } catch (error: any) {
    // Two runs can resolve the same new brand at once; reuse the winner.
    console.error('Brand create failed, re-checking registry:', error?.message);
    const raced = await findBrand(service, name);
    if (raced) return { brand_id: raced.id, name: raced.name || name };
    throw error;
  }
}

async function detachPhoto(service: any, brand: any, photoId: string) {
  const refs = (brand.photo_refs || []).filter((ref: any) => ref.photo_id !== photoId);
  if (refs.length === (brand.photo_refs || []).length) return;
  const saleIds = [...new Set(refs.map((ref: any) => ref.sale_id).filter(Boolean))];
  await service.entities.Brand.update(brand.id, { photo_refs: refs, sale_ids: saleIds });
}

/**
 * Set (or clear) the brand of one sale photo.
 * An empty name removes the photo from its brand — the honest "no brand" state.
 */
export async function linkPhotoBrand(
  service: any,
  { saleId, photoId, name, source = 'ai', user = null }: any,
): Promise<{ brand_id: string; name: string } | null> {
  if (!saleId || !photoId) return null;
  const touching = await brandsTouchingSale(service, saleId);
  const current = touching.find((brand: any) =>
    (brand.photo_refs || []).some((ref: any) => ref.photo_id === photoId)) || null;
  const clean = cleanBrandName(name);

  if (!clean) {
    if (current) await detachPhoto(service, current, photoId);
    return null;
  }

  // The operator's choice is final; an analysis run never overrides it.
  const currentRef = current
    ? (current.photo_refs || []).find((ref: any) => ref.photo_id === photoId)
    : null;
  if (currentRef && source === 'ai' && currentRef.source === 'operator') {
    return { brand_id: current.id, name: current.name || clean };
  }

  const target = await resolveBrand(service, clean, source);
  if (!target) return null;

  for (const brand of touching) {
    if (brand.id !== target.brand_id) await detachPhoto(service, brand, photoId);
  }

  const doc = touching.find((brand: any) => brand.id === target.brand_id)
    || await service.entities.Brand.get(target.brand_id);
  const now = new Date().toISOString();
  const refs = (doc.photo_refs || []).filter((ref: any) => ref.photo_id !== photoId);
  refs.push({ sale_id: saleId, photo_id: photoId, source, linked_at: now, linked_by: user?.id || null });
  const saleIds = [...new Set([...(doc.sale_ids || []), saleId])];

  await service.entities.Brand.update(doc.id, {
    photo_refs: refs,
    sale_ids: saleIds,
    last_linked_at: now,
  });
  return { brand_id: doc.id, name: doc.name || clean };
}

/** photo_id → brand, for every photo of one sale that has a brand. */
export async function brandMapForSale(service: any, saleId: string): Promise<Record<string, any>> {
  const map: Record<string, any> = {};
  for (const brand of await brandsTouchingSale(service, saleId)) {
    for (const ref of brand.photo_refs || []) {
      if (ref.sale_id !== saleId) continue;
      map[ref.photo_id] = { brand_id: brand.id, name: brand.name || '', source: ref.source || null };
    }
  }
  return map;
}