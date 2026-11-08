/**
 * ISO matching engine — the one shared matcher behind every "in search of" feature.
 *
 * It is deliberately deterministic: structured criteria first (brand, item type,
 * category, material, style, budget, condition, availability), with plain token
 * overlap for wording. No AI call per item/ISO pair — AI is only used upstream to
 * interpret a customer's photo or free text into criteria, never to decide a match.
 *
 * Rules this file enforces:
 *  - Only eligible units are candidates: live sale photos (upcoming/active sales,
 *    not skipped and not excluded from public), available inventory Items, ACTIVE
 *    marketplace listings, and ONE entry per physical item (marketplace and
 *    inventory records of the same Item are deduplicated by Item id).
 *  - A sale-level brand association is never an item-level brand match: those are
 *    emitted as separate `sale_level` leads with matched_via 'sale_brand'.
 *  - Missing price, brand, condition or location stays 'unknown' — never invented.
 *  - Required criteria and exclusions are respected; a rejected candidate is kept
 *    out instead of being shown as a weak match.
 *  - Customer feedback (`hidden`) is never overwritten by a later scan, and a match
 *    is notified at most once.
 */

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'that', 'this', 'any', 'all', 'one', 'two',
  'set', 'of', 'a', 'an', 'in', 'on', 'to', 'or', 'my', 'me', 'looking', 'want',
  'wanted', 'need', 'would', 'like', 'find', 'found', 'item', 'items', 'piece',
  'pieces', 'something', 'some', 'very', 'good', 'great', 'nice', 'please',
]);

const CONDITION_RANK: Record<string, number> = {
  any: 0,
  used_fair: 1,
  used_good: 2,
  used_like_new: 3,
  new: 4,
  for_parts: 0,
};

export function str(value: any): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function num(value: any): number | null {
  const n = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

export function normalize(value: any): string {
  return str(value).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function brandKey(value: any): string {
  return normalize(value)
    .replace(/\b(inc|incorporated|llc|ltd|co|corp|company|and|the)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokens(value: any): string[] {
  return normalize(value)
    .split(' ')
    .filter(w => w.length > 2 && !STOPWORDS.has(w));
}

export function rows(res: any): any[] {
  if (!res) return [];
  return Array.isArray(res) ? res : (res.items || []);
}

export function srOf(base44: any) {
  return base44.asServiceRole || base44;
}

export type IsoCandidate = {
  source: 'sale_photo' | 'inventory' | 'marketplace' | 'sale_level';
  itemKey: string;
  identityKey: string;
  saleId: string;
  operatorId: string;
  title: string;
  description: string;
  brand: string;
  brandSource: 'item' | 'photo' | 'sale' | 'none';
  category: string;
  itemType: string;
  material: string;
  style: string;
  color: string;
  era: string;
  price: number | null;
  condition: string;
  city: string;
  state: string;
  imageUrl: string;
  available: boolean;
  saleStatus: string;
  text: string;
};

export type IsoScore = {
  score: number;
  quality: 'strong' | 'possible' | null;
  reasons: string[];
  unknowns: string[];
  excluded: string | null;
  matchedVia: 'item' | 'photo' | 'sale_brand' | 'sale_text';
};

function buildCandidate(input: Partial<IsoCandidate> & { source: IsoCandidate['source']; itemKey: string }): IsoCandidate {
  const parts = [
    input.title, input.description, input.brand, input.category,
    input.itemType, input.material, input.style, input.color, input.era,
  ];
  return {
    source: input.source,
    itemKey: input.itemKey,
    identityKey: input.identityKey || input.itemKey,
    saleId: str(input.saleId),
    operatorId: str(input.operatorId),
    title: str(input.title),
    description: str(input.description),
    brand: str(input.brand),
    brandSource: input.brandSource || 'none',
    category: str(input.category),
    itemType: str(input.itemType),
    material: str(input.material),
    style: str(input.style),
    color: str(input.color),
    era: str(input.era),
    price: num(input.price),
    condition: str(input.condition),
    city: str(input.city),
    state: str(input.state),
    imageUrl: str(input.imageUrl),
    available: input.available !== false,
    saleStatus: str(input.saleStatus),
    text: normalize(parts.filter(Boolean).join(' ')),
  };
}

/**
 * Every eligible unit that can satisfy an ISO right now.
 * Bounded and paginated: this is called per ISO and per publish, never per pair.
 */
export async function loadIsoCandidates(sr: any, options: { saleId?: string } = {}) {
  const saleQuery: any = options.saleId
    ? { id: options.saleId }
    : { status: { $in: ['upcoming', 'active'] } };
  const [salesRes, itemsRes, listingsRes, brandsRes] = await Promise.all([
    sr.entities.EstateSale.filter(saleQuery, { limit: options.saleId ? 1 : 60, sort: '-created_date' }),
    sr.entities.Item.filter({ status: 'available' }, { limit: 500, sort: '-created_date' }),
    sr.entities.MarketplaceItem.filter({ status: 'ACTIVE' }, { limit: 300, sort: '-created_date' }),
    sr.entities.Brand.filter({ status: 'active' }, { limit: 500 }).catch(() => []),
  ]);

  const sales = rows(salesRes).filter((s: any) => ['upcoming', 'active'].includes(str(s.status)));
  const items = rows(itemsRes);
  const listings = rows(listingsRes);
  const brands = rows(brandsRes);

  const brandByPhoto: Record<string, { name: string; brandId: string }> = {};
  const saleLevelBrands: Record<string, Array<{ name: string; brandId: string }>> = {};
  for (const brand of brands) {
    for (const ref of (brand.photo_refs || [])) {
      if (ref && ref.photo_id) brandByPhoto[`${ref.sale_id}:${ref.photo_id}`] = { name: str(brand.name), brandId: brand.id };
    }
    for (const saleId of (brand.sale_ids || [])) {
      saleLevelBrands[saleId] = saleLevelBrands[saleId] || [];
      saleLevelBrands[saleId].push({ name: str(brand.name), brandId: brand.id });
    }
  }

  const itemById: Record<string, any> = {};
  for (const item of items) itemById[item.id] = item;

  const byIdentity = new Map<string, IsoCandidate>();
  const keep = (candidate: IsoCandidate, priority: number) => {
    const current = byIdentity.get(candidate.identityKey);
    if (!current) {
      byIdentity.set(candidate.identityKey, { ...candidate, _priority: priority } as any);
      return;
    }
    if (((current as any)._priority || 0) < priority) {
      byIdentity.set(candidate.identityKey, { ...candidate, _priority: priority } as any);
    }
  };

  // Inventory items — available master status is the availability truth.
  for (const item of items) {
    const candidate = buildCandidate({
      source: 'inventory',
      itemKey: `item:${item.id}`,
      identityKey: `item:${item.id}`,
      saleId: item.estate_sale_id,
      operatorId: item.operator_id,
      title: item.title,
      description: item.description,
      brand: item.brand || item.maker,
      brandSource: (item.brand || item.maker) ? 'item' : 'none',
      category: item.category,
      itemType: item.subcategory,
      material: item.materials,
      style: item.style,
      color: item.color,
      era: item.era,
      price: item.price,
      condition: item.condition,
      city: item.location?.city,
      state: item.location?.state,
      imageUrl: (item.images || [])[0] || '',
      available: str(item.status) === 'available',
      saleStatus: '',
    });
    if (candidate.available) keep(candidate, 2);
  }

  // Marketplace listings — same physical item, buyable path, so it wins the dedupe.
  for (const listing of listings) {
    const item = itemById[listing.item_id];
    if (!item) continue;
    if (str(item.status) !== 'available') continue;
    const candidate = buildCandidate({
      source: 'marketplace',
      itemKey: `marketplace:${listing.id}`,
      identityKey: `item:${item.id}`,
      saleId: listing.estate_sale_id || item.estate_sale_id,
      operatorId: listing.operator_id || item.operator_id,
      title: item.title,
      description: item.description,
      brand: item.brand || item.maker,
      brandSource: (item.brand || item.maker) ? 'item' : 'none',
      category: item.category,
      itemType: item.subcategory,
      material: item.materials,
      style: item.style,
      color: item.color,
      era: item.era,
      price: num(listing.price) ?? num(item.price),
      condition: item.condition,
      city: item.location?.city,
      state: item.location?.state,
      imageUrl: (item.images || [])[0] || '',
      available: true,
      saleStatus: '',
    });
    keep(candidate, 3);
  }

  // Published sale photos from live sales — item-level units.
  const itemTitlesBySale: Record<string, Set<string>> = {};
  for (const item of items) {
    if (!item.estate_sale_id) continue;
    itemTitlesBySale[item.estate_sale_id] = itemTitlesBySale[item.estate_sale_id] || new Set();
    itemTitlesBySale[item.estate_sale_id].add(normalize(item.title));
  }

  for (const sale of sales) {
    const address = sale.property_address || {};
    for (const [index, photo] of (sale.images || []).entries()) {
      if (!photo || photo.skip_item === true || photo.excluded_from_public === true) continue;
      const photoId = str(photo.pipeline?.id) || `idx${index}`;
      const title = str(photo.name);
      if (!title) continue;
      // The same item already present as inventory in this sale is not counted twice.
      if ((itemTitlesBySale[sale.id] || new Set()).has(normalize(title))) continue;
      const linked = brandByPhoto[`${sale.id}:${photoId}`];
      const brand = str(photo.brand) || linked?.name || '';
      const candidate = buildCandidate({
        source: 'sale_photo',
        itemKey: `photo:${photoId}`,
        identityKey: `photo:${sale.id}:${photoId}`,
        saleId: sale.id,
        operatorId: sale.operator_id,
        title,
        description: photo.description,
        brand,
        brandSource: brand ? (str(photo.brand) ? 'photo' : 'item') : 'none',
        category: (photo.categories || []).join(' '),
        price: photo.price,
        condition: '',
        city: address.city,
        state: address.state,
        imageUrl: photo.url,
        available: true,
        saleStatus: str(sale.status),
      });
      if (candidate.available) keep(candidate, 1);
    }
  }

  // Sale-level brand leads — kept separate, never an item-level match.
  const saleLevelLeads: IsoCandidate[] = [];
  for (const sale of sales) {
    const linkedPhotos = new Set(
      (sale.images || [])
        .filter((p: any) => p && p.brand)
        .map((p: any) => str(p.brand).toLowerCase()),
    );
    for (const brand of (saleLevelBrands[sale.id] || [])) {
      if (!brand.name) continue;
      if (linkedPhotos.has(brand.name.toLowerCase())) continue;
      saleLevelLeads.push(buildCandidate({
        source: 'sale_level',
        itemKey: `sale:${sale.id}`,
        identityKey: `sale:${sale.id}:${brand.name.toLowerCase()}`,
        saleId: sale.id,
        operatorId: sale.operator_id,
        title: sale.title,
        description: sale.description,
        brand: brand.name,
        brandSource: 'sale',
        city: sale.property_address?.city,
        state: sale.property_address?.state,
        availabilityNote: 'sale',
        available: true,
        saleStatus: str(sale.status),
      } as any));
    }
  }

  const candidates = [...byIdentity.values()].map(({ ...rest }: any) => {
    const { _priority, ...candidate } = rest;
    return candidate as IsoCandidate;
  });
  return { candidates, saleLevelLeads };
}

const BUDGET_TOLERANCE = 1.05;

/** Score one ISO against one candidate using structured criteria only. */
export function scoreIsoCandidate(iso: any, candidate: IsoCandidate): IsoScore {
  const reasons: string[] = [];
  const unknowns: string[] = [];
  let score = 0;
  const text = candidate.text;
  const isoBrand = brandKey(iso.brand);
  const aliases = (iso.brand_aliases || []).map(brandKey).filter(Boolean);

  // Exclusions are absolute.
  for (const exclusion of (iso.exclusions || [])) {
    const term = normalize(exclusion);
    if (term.length > 2 && text.includes(term)) {
      return { score: 0, quality: null, reasons, unknowns, excluded: `contains "${exclusion}" which you excluded`, matchedVia: 'item' };
    }
  }

  const matchedVia: IsoScore['matchedVia'] = candidate.source === 'sale_photo'
    ? 'photo'
    : candidate.source === 'sale_level' ? 'sale_brand' : 'item';

  if (candidate.source === 'sale_level') {
    if (!isoBrand) return { score: 0, quality: null, reasons, unknowns, excluded: 'sale-level lead needs a brand', matchedVia };
    const saleBrand = brandKey(candidate.brand);
    if (saleBrand !== isoBrand && !aliases.includes(saleBrand)) {
      return { score: 0, quality: null, reasons, unknowns, excluded: 'brand not associated', matchedVia };
    }
    return {
      score: 38,
      quality: 'possible',
      reasons: [`${candidate.brand} is listed for this sale, but no specific item is linked to that brand yet`],
      unknowns: ['which item in this sale carries the brand'],
      excluded: null,
      matchedVia: 'sale_brand',
    };
  }

  // Brand
  const candidateBrand = brandKey(candidate.brand);
  const brandConfirmed = str(iso.brand_status) === 'confirmed_by_customer';
  if (isoBrand) {
    const sameBrand = candidateBrand && (candidateBrand === isoBrand
      || aliases.includes(candidateBrand)
      || candidateBrand.includes(isoBrand)
      || isoBrand.includes(candidateBrand));
    if (sameBrand) {
      score += 45;
      reasons.push(`brand ${candidate.brand}`);
    } else if (candidateBrand) {
      if (brandConfirmed && str(iso.match_mode) === 'exact') {
        return { score: 0, quality: null, reasons, unknowns, excluded: `different brand (${candidate.brand})`, matchedVia };
      }
      score -= 12;
      unknowns.push(`brand differs from ${iso.brand}`);
    } else {
      unknowns.push('brand not stated');
    }
  }

  // Category / item type
  const isoCategory = normalize(iso.category);
  const isoItemType = normalize(iso.item_type || iso.subcategory);
  if (isoCategory && candidate.category && normalize(candidate.category) === isoCategory) {
    score += 18;
    reasons.push(`category ${iso.category}`);
  } else if (isoCategory && text.includes(isoCategory)) {
    score += 12;
    reasons.push(`category ${iso.category}`);
  } else if (isoCategory) {
    unknowns.push('category not stated');
  }
  if (isoItemType) {
    const typeWords = tokens(isoItemType);
    if (typeWords.length && typeWords.every(w => text.includes(w))) {
      score += 16;
      reasons.push(`item type ${iso.item_type || iso.subcategory}`);
    } else if (typeWords.length && typeWords.some(w => text.includes(w))) {
      score += 7;
    }
  }

  // Descriptive attributes
  const attributes: Array<[string, any, number]> = [
    ['style', iso.style, 10],
    ['material', iso.material, 12],
    ['color', iso.color, 6],
    ['era', iso.era, 8],
  ];
  for (const [label, value, points] of attributes) {
    const term = normalize(value);
    if (!term) continue;
    if (text.includes(term)) {
      score += points;
      reasons.push(`${label} ${value}`);
    } else {
      unknowns.push(`${label} not stated`);
    }
  }

  // Wording overlap
  const isoWords = [...new Set([
    ...tokens(iso.title),
    ...tokens(iso.item_type),
    ...tokens(iso.description).slice(0, 8),
  ])].slice(0, 12);
  if (isoWords.length) {
    const hits = isoWords.filter(w => text.includes(w));
    const ratio = hits.length / isoWords.length;
    score += Math.round(ratio * 22);
    if (ratio >= 0.5) reasons.push(`wording: ${hits.slice(0, 4).join(', ')}`);
  }

  // Budget
  if (candidate.price != null && num(iso.budget_max) != null) {
    if (candidate.price > (num(iso.budget_max) as number) * BUDGET_TOLERANCE) {
      return { score: 0, quality: null, reasons, unknowns, excluded: `priced above your budget ($${candidate.price})`, matchedVia };
    }
    score += 6;
    reasons.push('within budget');
  } else if (candidate.price == null) {
    unknowns.push('price not listed');
  }

  // Condition
  const requiredCondition = str(iso.condition) || 'any';
  if (requiredCondition !== 'any') {
    const candidateRank = CONDITION_RANK[str(candidate.condition)] ?? null;
    if (candidateRank == null) {
      unknowns.push('condition not stated');
    } else if (candidateRank < (CONDITION_RANK[requiredCondition] || 0)) {
      return { score: 0, quality: null, reasons, unknowns, excluded: 'condition below your minimum', matchedVia };
    } else {
      score += 5;
      reasons.push('condition meets your minimum');
    }
  } else if (!candidate.condition) {
    unknowns.push('condition not stated');
  }

  // Location — only decisive when the customer will not ship.
  const isoState = normalize(iso.state);
  if (!iso.shipping_ok && isoState) {
    if (candidate.state && normalize(candidate.state) !== isoState) {
      return { score: 0, quality: null, reasons, unknowns, excluded: 'outside your pickup area', matchedVia };
    }
    if (candidate.state) {
      score += 4;
      reasons.push('in your area');
    } else {
      unknowns.push('location not stated');
    }
  }

  // A bare category match is not enough for a suggestion: require a brand, the item
  // type itself, or real wording overlap before a candidate is offered at all.
  const substantive = reasons.some(r => /brand|item type|wording/.test(r));
  const quality = !substantive || score < 32 ? null : (score >= 55 ? 'strong' : 'possible');
  return { score: Math.max(0, Math.min(100, score)), quality, reasons, unknowns, excluded: null, matchedVia };
}

function matchKey(isoId: string, itemKey: string) {
  return `${isoId}::${itemKey}`;
}

function isoDetail(iso: any) {
  return [
    iso.brand ? `brand ${iso.brand}` : null,
    iso.category ? iso.category : null,
    num(iso.budget_max) != null ? `up to $${iso.budget_max}` : null,
    str(iso.match_mode) === 'exact' ? 'exact model' : 'similar style',
  ].filter(Boolean).join(' · ');
}

/**
 * Re-match one ISO and persist the result. Safe to call repeatedly and concurrently:
 * rows are keyed by wanted_item_id::item_key, customer-hidden matches are never
 * resurrected, and notifications are stamped once.
 */
export async function rematchIso(sr: any, isoId: string, options: { notify?: boolean } = {}) {
  const iso = await sr.entities.WantedItem.get(isoId).catch(() => null);
  if (!iso) return { ok: false, error: 'ISO not found' };
  if (str(iso.status) !== 'active') {
    return { ok: true, skipped: true, reason: `ISO is ${iso.status}` };
  }

  const { candidates, saleLevelLeads } = await loadIsoCandidates(sr);
  const scored: Array<{ candidate: IsoCandidate; score: IsoScore }> = [];
  for (const candidate of candidates) {
    const score = scoreIsoCandidate(iso, candidate);
    if (score.excluded || !score.quality) continue;
    scored.push({ candidate, score });
  }
  // Sale-level leads are only added when there is no item-level brand match.
  const hasItemBrandMatch = scored.some(s => s.candidate.brandSource !== 'sale' && brandKey(s.candidate.brand) === brandKey(iso.brand));
  if (!hasItemBrandMatch) {
    for (const lead of saleLevelLeads) {
      const score = scoreIsoCandidate(iso, lead);
      if (score.excluded || !score.quality) continue;
      scored.push({ candidate: lead, score });
    }
  }

  scored.sort((a, b) => b.score.score - a.score.score);
  const top = scored.slice(0, 40);

  const existingRes = await sr.entities.SaleIsoMatch.filter({ wanted_item_id: isoId }, { limit: 400 });
  const existing = rows(existingRes);
  const byKey = new Map<string, any>();
  for (const row of existing) {
    byKey.set(row.unique_key || matchKey(isoId, row.item_key), row);
  }
  const stillPresent = new Set<string>();

  let created = 0;
  let updated = 0;
  let hiddenSkipped = 0;
  const newlyStrong: any[] = [];
  const now = new Date().toISOString();

  for (const { candidate, score } of top) {
    const key = matchKey(isoId, candidate.itemKey);
    stillPresent.add(key);
    const prior = byKey.get(key);

    if (prior && str(prior.feedback) === 'hidden') {
      hiddenSkipped += 1;
      continue;
    }

    const base = {
      sale_id: candidate.saleId,
      operator_id: candidate.operatorId,
      wanted_item_id: isoId,
      buyer_id: str(iso.buyer_id),
      buyer_name: str(iso.buyer_name),
      dealer_contact_allowed: iso.allow_dealer_contact === true,
      iso_title: str(iso.title),
      iso_detail: isoDetail(iso),
      source_type: candidate.source === 'inventory' ? 'inventory'
        : candidate.source === 'marketplace' ? 'marketplace'
          : candidate.source === 'sale_level' ? 'sale_level' : 'sale_photo',
      item_key: candidate.itemKey,
      identity_key: candidate.identityKey,
      unique_key: key,
      item_id: candidate.identityKey.startsWith('item:') ? candidate.identityKey.slice(5) : '',
      item_name: candidate.title,
      item_price: candidate.price,
      item_brand: candidate.brand,
      brand_source: candidate.brandSource,
      item_condition: candidate.condition,
      city: candidate.city,
      state: candidate.state,
      image_url: candidate.imageUrl,
      match_quality: score.quality,
      matched_via: score.matchedVia,
      confidence: score.score,
      reason: score.reasons.slice(0, 4).join(' · '),
      unknown_attributes: score.unknowns.slice(0, 6),
      availability: candidate.available ? 'available' : 'unavailable',
      availability_note: candidate.available ? '' : 'No longer available',
      sale_status: candidate.saleStatus,
      last_matched_at: now,
      scanned_at: now,
    };

    if (prior) {
      const patch: any = { id: prior.id, ...base };
      // A customer's own feedback is never overwritten by a scan.
      if (str(prior.feedback) === 'not_meant' || str(prior.feedback) === 'relevant') {
        patch.feedback = prior.feedback;
        patch.feedback_at = prior.feedback_at;
      }
      if (str(prior.status) === 'dismissed') patch.status = 'dismissed';
      await sr.entities.SaleIsoMatch.update(prior.id, patch);
      updated += 1;
      if (score.quality === 'strong' && !prior.notified_at) newlyStrong.push({ key, id: prior.id, candidate, score });
    } else {
      const record = await sr.entities.SaleIsoMatch.create({
        ...base,
        status: 'new',
        feedback: 'none',
        seen: false,
        first_seen_at: now,
      });
      created += 1;
      if (score.quality === 'strong') newlyStrong.push({ key, id: record.id, candidate, score });
    }
  }

  // Candidates that disappeared are kept as history, never presented as available.
  const gone = existing.filter(row => {
    const key = row.unique_key || matchKey(isoId, row.item_key);
    return !stillPresent.has(key) && str(row.availability) !== 'unavailable';
  });
  if (gone.length) {
    await sr.entities.SaleIsoMatch.bulkUpdate(gone.slice(0, 500).map(row => ({
      id: row.id,
      availability: 'unavailable',
      availability_note: 'No longer listed',
      scanned_at: now,
    })));
  }

  const visible = await sr.entities.SaleIsoMatch.filter({ wanted_item_id: isoId, feedback: { $ne: 'hidden' } }, { limit: 400 });
  const visibleRows = rows(visible);
  const strongCount = visibleRows.filter(r => r.match_quality === 'strong' && r.availability !== 'unavailable').length;
  const possibleCount = visibleRows.filter(r => r.match_quality === 'possible' && r.availability !== 'unavailable').length;

  await sr.entities.WantedItem.update(isoId, {
    match_counts: { strong: strongCount, possible: possibleCount, unseen: visibleRows.filter(r => !r.seen).length },
    last_matched_at: now,
  });

  let notified = 0;
  if (options.notify !== false && newlyStrong.length) {
    notified = await notifyIsoMatches(sr, { ...iso, match_counts: { strong: strongCount, possible: possibleCount } }, newlyStrong);
  }

  return {
    ok: true,
    iso_id: isoId,
    candidates: candidates.length,
    matched: top.length,
    created,
    updated,
    hidden_skipped: hiddenSkipped,
    withdrawn: gone.length,
    strong: strongCount,
    possible: possibleCount,
    notified,
  };
}

/** One in-app notification per ISO per run, deduplicated by match rows and prefs. */
export async function notifyIsoMatches(sr: any, iso: any, fresh: Array<{ key: string; id: string; candidate: IsoCandidate; score: IsoScore }>) {
  if (!fresh.length) return 0;
  if (iso.alerts_enabled === false) return 0;
  const prefsRes = await sr.entities.NotificationPreference.filter({ user_id: str(iso.buyer_id) }, { limit: 1 }).catch(() => []);
  const prefs = rows(prefsRes)[0];
  if (prefs && prefs.system_in_app === false) return 0;

  const alreadyNotified = new Set(iso.notified_match_ids || []);
  const pending = fresh.filter(item => !alreadyNotified.has(item.key)).slice(0, 5);
  if (!pending.length) return 0;

  const lines = pending.slice(0, 3).map(item =>
    `• ${item.candidate.title}${item.candidate.price != null ? ` — $${item.candidate.price}` : ''} (${item.score.reasons.slice(0, 2).join(', ')})`,
  );

  await sr.entities.Notification.create({
    user_id: str(iso.buyer_id),
    type: 'system',
    title: `New match for “${str(iso.title)}”`,
    message: `${pending.length} new match${pending.length > 1 ? 'es' : ''} found:\n${lines.join('\n')}\n\nOpen your ISO dashboard to review them.`,
    link_to_page: 'IsoCenter',
    link_params: `iso=${iso.id}`,
    read: false,
    related_entity_type: 'WantedItem',
    related_entity_id: iso.id,
  });

  const now = new Date().toISOString();
  await sr.entities.SaleIsoMatch.bulkUpdate(pending.map(item => ({ id: item.id, notified_at: now })));
  await sr.entities.WantedItem.update(iso.id, {
    notified_match_ids: [...(iso.notified_match_ids || []), ...pending.map(item => item.key)].slice(-400),
  });
  return 1;
}

/** Re-match every active ISO (bounded). Used after a sale publishes and by the daily scan. */
export async function rematchAllActive(sr: any, options: { limit?: number } = {}) {
  const res = await sr.entities.WantedItem.filter({ status: 'active' }, { limit: Math.min(options.limit || 100, 200), sort: '-created_date' });
  const isos = rows(res);
  const stats = { isos: isos.length, created: 0, updated: 0, notified: 0, errors: 0 };
  for (const iso of isos) {
    try {
      const result: any = await rematchIso(sr, iso.id);
      if (result.ok) {
        stats.created += result.created || 0;
        stats.updated += result.updated || 0;
        stats.notified += result.notified || 0;
      }
    } catch (error) {
      console.error('ISO rematch failed', iso.id, error);
      stats.errors += 1;
    }
  }
  return stats;
}

/** Re-match only against one sale's units — called when a sale publishes or changes. */
export async function rematchAgainstSale(sr: any, saleId: string) {
  const { candidates } = await loadIsoCandidates(sr, { saleId });
  if (!candidates.length) return { candidates: 0, isos: 0 };
  const isoRes = await sr.entities.WantedItem.filter({ status: 'active' }, { limit: 200, sort: '-created_date' });
  const isos = rows(isoRes);
  for (const iso of isos) {
    try {
      await rematchIso(sr, iso.id);
    } catch (error) {
      console.error('ISO sale rematch failed', iso.id, error);
    }
  }
  return { candidates: candidates.length, isos: isos.length };
}

/** Duplicate / overlap fingerprint for an interest. */
export function duplicateKey(input: { brand?: string; item_type?: string; category?: string; title?: string }) {
  return [
    brandKey(input.brand),
    normalize(input.item_type),
    normalize(input.category),
    tokens(input.title).slice(0, 4).sort().join(' '),
  ].filter(Boolean).join('|');
}