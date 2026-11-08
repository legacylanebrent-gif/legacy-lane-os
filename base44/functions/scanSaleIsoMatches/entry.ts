import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

/**
 * The operator's ISO match scan for ONE sale.
 *
 * Reads the sale's own item list (its photos plus its inventory records) and the
 * customers' active ISO requests, shortlists the ISO requests that share real
 * words with the item list, then asks the model which of those shortlisted ISOs
 * an item actually satisfies. Every id, name and price written to a match is
 * resolved from stored records — a model never supplies one, so a hallucinated
 * item or price cannot reach the operator's list.
 *
 * Actions: list (stored matches), scan (run the match), dismiss (operator says
 * this pairing is wrong; a dismissal survives later scans).
 */

const STOP_WORDS = new Set([
  'the', 'and', 'with', 'for', 'from', 'that', 'this', 'these', 'those', 'any', 'all',
  'set', 'sets', 'pair', 'pairs', 'piece', 'pieces', 'item', 'items', 'lot', 'lots',
  'vintage', 'antique', 'style', 'looking', 'want', 'wanted', 'need', 'needs', 'would',
  'like', 'love', 'please', 'one', 'two', 'very', 'good', 'great', 'nice', 'large',
  'small', 'new', 'used', 'rare', 'old', 'condition', 'color', 'size',
]);

function words(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !STOP_WORDS.has(word));
}

/** The sale's own item list: its photos first, then inventory records not already covered by a photo. */
function saleItems(sale, itemRecords) {
  const items = [];
  const photoNames = new Set();
  const photos = Array.isArray(sale?.images) ? sale.images : [];

  photos.forEach((photo, index) => {
    const name = String(photo?.name || '').trim();
    if (!name) return;
    const photoId = String(photo?.pipeline?.id || index);
    items.push({
      key: `photo:${photoId}`,
      item_id: '',
      name,
      text: [name, photo?.description, (photo?.categories || []).join(' ')].filter(Boolean).join(' '),
      price: typeof photo?.price === 'number' ? photo.price : null,
    });
    photoNames.add(name.toLowerCase());
  });

  for (const record of itemRecords || []) {
    const name = String(record?.title || '').trim();
    if (!name || photoNames.has(name.toLowerCase())) continue;
    items.push({
      key: `item:${record.id}`,
      item_id: record.id,
      name,
      text: [name, record?.description, record?.brand, record?.category, (record?.tags || []).join(' ')].filter(Boolean).join(' '),
      price: typeof record?.price === 'number' ? record.price : null,
    });
  }

  return items.slice(0, 150);
}

/** Keeps the ISO requests that share real words with at least one item — the model only sees these. */
function shortlistIso(wantedItems, items) {
  const itemWordSets = items.map(item => ({ item, wordSet: new Set(words(item.text)) }));
  const scored = [];

  for (const wanted of wantedItems) {
    const isoWords = new Set(words([
      wanted.title,
      wanted.brand,
      wanted.category,
      wanted.subcategory,
      wanted.style,
      wanted.era,
      wanted.material,
      wanted.color,
      String(wanted.description || '').slice(0, 300),
    ].filter(Boolean).join(' ')));
    if (!isoWords.size) continue;

    const brand = String(wanted.brand || '').toLowerCase().trim();
    let best = 0;
    for (const entry of itemWordSets) {
      let score = 0;
      for (const word of isoWords) {
        if (entry.wordSet.has(word)) score += 1;
      }
      if (brand && entry.item.text.toLowerCase().includes(brand)) score += 3;
      if (score > best) best = score;
    }
    if (best > 0) scored.push({ wanted, score: best });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 40).map(entry => entry.wanted);
}

function isoDetail(wanted) {
  const parts = [];
  if (wanted.brand) parts.push(String(wanted.brand));
  if (wanted.category) parts.push(String(wanted.category).replace(/_/g, ' '));
  if (typeof wanted.budget_max === 'number') parts.push(`budget up to $${wanted.budget_max}`);
  if (wanted.era) parts.push(String(wanted.era));
  return parts.join(' · ').slice(0, 160);
}

async function listMatches(service, saleId) {
  const page = await service.entities.SaleIsoMatch.filter({ sale_id: saleId }, { sort: '-confidence', limit: 200 });
  const rows = page.items || [];
  return rows;
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || 'list');
    const saleId = String(body.sale_id || '').trim();
    if (!saleId) return Response.json({ error: 'A sale is required' }, { status: 400 });

    const service = base44.asServiceRole;
    const sale = await service.entities.EstateSale.get(saleId).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!sale) return Response.json({ error: 'Sale not found' }, { status: 404 });

    const isOwner = sale.operator_id === user.id || sale.created_by_id === user.id;
    if (!isOwner && user.role !== 'admin') {
      return Response.json({ error: 'You do not have access to this sale' }, { status: 403 });
    }

    if (action === 'list') {
      return Response.json({ matches: await listMatches(service, saleId) });
    }

    if (action === 'dismiss') {
      const matchId = String(body.match_id || '').trim();
      if (!matchId) return Response.json({ error: 'A match is required' }, { status: 400 });
      const match = await service.entities.SaleIsoMatch.get(matchId).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
      if (!match) return Response.json({ error: 'Match not found' }, { status: 404 });
      if (match.sale_id !== saleId) return Response.json({ error: 'Match does not belong to this sale' }, { status: 400 });
      await service.entities.SaleIsoMatch.update(matchId, { status: 'dismissed' });
      return Response.json({ matches: await listMatches(service, saleId) });
    }

    if (action !== 'scan') return Response.json({ error: 'Unsupported action' }, { status: 400 });

    // ── the scan ───────────────────────────────────────────────────────────────
    const itemPage = await service.entities.Item.filter(
      { estate_sale_id: saleId },
      { sort: '-created_date', limit: 300 },
    ).catch(() => ({ items: [] }));
    const items = saleItems(sale, itemPage.items || []);
    if (items.length === 0) {
      return Response.json({
        matches: await listMatches(service, saleId),
        scanned: { items: 0, isos: 0, considered: 0 },
        note: 'This sale has no named items yet. Add item names and descriptions, then scan again.',
      });
    }

    const wantedPage = await service.entities.WantedItem.filter(
      { status: 'active' },
      { sort: '-created_date', limit: 400 },
    ).catch(() => ({ items: [] }));
    const wantedItems = (wantedPage.items || []).filter(wanted => String(wanted?.title || '').trim());
    if (wantedItems.length === 0) {
      return Response.json({
        matches: await listMatches(service, saleId),
        scanned: { items: items.length, isos: 0, considered: 0 },
        note: 'No active customer ISO requests to match against yet.',
      });
    }

    const shortlisted = shortlistIso(wantedItems, items);
    if (shortlisted.length === 0) {
      return Response.json({
        matches: await listMatches(service, saleId),
        scanned: { items: items.length, isos: wantedItems.length, considered: 0 },
        note: 'Nothing in this sale shares wording with any active ISO request.',
      });
    }

    const itemLines = items
      .map(item => `- ${item.key} | ${item.name}${item.price != null ? ` | asking $${item.price}` : ''}`)
      .join('\n');
    const isoLines = shortlisted
      .map(wanted => {
        const detail = [
          wanted.brand ? `brand: ${wanted.brand}` : '',
          wanted.category ? `category: ${wanted.category}` : '',
          wanted.style ? `style: ${wanted.style}` : '',
          wanted.era ? `era: ${wanted.era}` : '',
          wanted.material ? `material: ${wanted.material}` : '',
          wanted.color ? `color: ${wanted.color}` : '',
          typeof wanted.budget_max === 'number' ? `budget max: $${wanted.budget_max}` : '',
          wanted.description ? `notes: ${String(wanted.description).slice(0, 200)}` : '',
        ].filter(Boolean).join(' | ');
        return `- ${wanted.id} | ${wanted.title}${detail ? ` | ${detail}` : ''}`;
      })
      .join('\n');

    const prompt = `You are helping an estate sale operator find buyers who are already looking for things that are in this sale.

Match the buyer ISO ("in search of") requests below to items in the sale.

Rules:
- Only match when the item genuinely satisfies the request: the same kind of object, and where the buyer named a brand, maker, model, style, era or material, the item must agree with it.
- Do not match on vague category overlap. A plain glass vase does not satisfy "Tiffany-style favrile vase". "Dinner plates" is not "depression glass bowls".
- Respect the buyer's budget when the item has an asking price: an item clearly above the buyer's maximum budget is not a match.
- One ISO request may match several items, and one item may match several ISO requests. Never repeat the same ISO and item pair.
- Use only the item keys and ISO ids listed here. Never invent an item, an id, a price or a detail.
- confidence: 90 or more only for an explicit match on object type plus the brand/model/style the buyer asked for; 70-89 for a strong match with one minor uncertainty; 60-69 for a plausible match the operator should check. Anything below 60: leave it out.
- reason: one short plain sentence for the operator, quoting the buyer's own words (brand, model, material, style).

SALE ITEMS (key | item | asking price):
${itemLines}

BUYER ISO REQUESTS (iso id | what they are looking for):
${isoLines}

Return every genuine match you find, and nothing else.`;

    const llm = await service.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          matches: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                iso_id: { type: 'string' },
                item_key: { type: 'string' },
                confidence: { type: 'number' },
                reason: { type: 'string' },
              },
              required: ['iso_id', 'item_key', 'confidence', 'reason'],
            },
          },
        },
        required: ['matches'],
      },
    });

    const itemByKey = new Map(items.map(item => [item.key, item]));
    const wantedById = new Map(shortlisted.map(wanted => [wanted.id, wanted]));
    const seenPairs = new Set();
    const accepted = [];
    for (const raw of (llm?.matches || [])) {
      const isoId = String(raw?.iso_id || '').trim();
      const itemKey = String(raw?.item_key || '').trim();
      const confidence = Number(raw?.confidence);
      const wanted = wantedById.get(isoId);
      const item = itemByKey.get(itemKey);
      if (!wanted || !item) continue;
      if (!Number.isFinite(confidence) || confidence < 60) continue;
      const pairKey = `${isoId}::${itemKey}`;
      if (seenPairs.has(pairKey)) continue;
      seenPairs.add(pairKey);
      accepted.push({ wanted, item, confidence: Math.round(confidence), reason: String(raw?.reason || '').trim().slice(0, 300) });
    }

    const existingPage = await service.entities.SaleIsoMatch.filter({ sale_id: saleId }, { limit: 500 });
    const existing = existingPage.items || [];
    const existingPairs = new Set(existing.map(row => `${row.wanted_item_id}::${row.item_key}`));
    const now = new Date().toISOString();

    const toCreate = accepted
      .filter(entry => !existingPairs.has(`${entry.wanted.id}::${entry.item.key}`))
      .slice(0, 120)
      .map(entry => ({
        sale_id: saleId,
        operator_id: sale.operator_id || sale.created_by_id || user.id,
        wanted_item_id: entry.wanted.id,
        buyer_id: entry.wanted.buyer_id || '',
        buyer_name: entry.wanted.buyer_name || 'Buyer',
        dealer_contact_allowed: entry.wanted.allow_dealer_contact === true,
        iso_title: entry.wanted.title,
        iso_detail: isoDetail(entry.wanted),
        item_key: entry.item.key,
        item_id: entry.item.item_id || '',
        item_name: entry.item.name,
        item_price: entry.item.price == null ? undefined : entry.item.price,
        confidence: entry.confidence,
        reason: entry.reason,
        status: 'new',
        scanned_at: now,
      }));

    if (toCreate.length > 0) {
      await service.entities.SaleIsoMatch.bulkCreate(toCreate);
    }

    const matches = await listMatches(service, saleId);
    return Response.json({
      matches,
      scanned: { items: items.length, isos: wantedItems.length, considered: shortlisted.length, found: accepted.length, added: toCreate.length },
    });
  } catch (error) {
    console.error('scanSaleIsoMatches failed:', error?.message || error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}