// CENTRAL ITEM OBSERVATION ENGINE
// One sale at a time: a published sale's named photographs and inventory Item
// records become central observations, with the asking price, its provenance and
// the sold evidence that checkout records actually support.
//
// Deliberate rules (see ESTESALEN central item database spec):
// - The identity of an observation is <sale id>::<source item key>, so republishing,
//   retries and duplicate events update the same row instead of creating a new one.
// - Nothing is invented: a missing brand, condition, location or price stays empty.
//   The original price is only kept when it was actually captured; otherwise it is
//   labelled 'unavailable' — the current price is never called the initial price.
// - A sale ending is not a sale of the item. Only an operator-reported sold price or
//   a checkout order line makes an item sold, and those stay separate outcomes.
// - A bundle is never split into invented per-item prices.
// - Group photographs are retained for their description but are never priced items.
// - Image binaries are never stored — only a durable media reference.

export function srOf(base44) {
  return (base44 && base44.asServiceRole) ? base44.asServiceRole : base44;
}

function page(res) {
  return (res && res.items) ? res.items : (res || []);
}

function num(value) {
  return (typeof value === 'number' && Number.isFinite(value)) ? value : null;
}

/** Short stable digest — used to key a legacy photo that has no pipeline id yet. */
function shortHash(text) {
  let hash = 5381;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash * 33) ^ text.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36);
}

function str(value) {
  return String(value == null ? '' : value).trim();
}

const MAX_UNITS_PER_SALE = 2000;
const PUBLISHED = ['upcoming', 'active', 'completed'];

/* ───────────────────────── source units ───────────────────────── */

/** Deterministic unit list for a sale: named photographs in order, then its inventory records. */
export function buildUnits(sale, items) {
  const units = [];
  const images = Array.isArray(sale && sale.images) ? sale.images : [];
  images.forEach((photo, index) => {
    if (!photo || typeof photo === 'string') return;
    const title = str(photo.name);
    const description = str(photo.description);
    if (!title && !description) return;
    // Stable identity: the pipeline id when the photo has one, otherwise a digest of its
    // image URL — never its position, so reordering photos cannot fork an observation.
    const photoId = str(photo.pipeline && photo.pipeline.id)
      || (str(photo.url) ? `url_${shortHash(str(photo.url))}` : `idx_${index}`);
    const classification = str(photo.pipeline && photo.pipeline.classification);
    units.push({
      key: `photo:${photoId}`,
      kind: 'photo',
      photo_id: photoId,
      index,
      representation: classification === 'group' ? 'group' : (classification === 'single' ? 'single' : 'unknown'),
      title,
      description,
      brand: str(photo.brand),
      category: Array.isArray(photo.categories) && photo.categories.length ? str(photo.categories[0]) : '',
      attributes: {},
      price: num(photo.price),
      image_url: str(photo.url),
      thumbnail_url: str(photo.thumbnail_url),
      operator_fields: Array.isArray(photo.pipeline && photo.pipeline.operator_fields) ? photo.pipeline.operator_fields : [],
      ai_marked: !!(photo.ai_updated_at || photo.ai_result_id || (photo.pipeline && photo.pipeline.jobs)),
      source_updated_at: str(photo.pipeline && photo.pipeline.edit_revision) || str(photo.ai_updated_at) || '',
    });
  });

  for (const item of (items || [])) {
    if (!item || !item.id) continue;
    const isLot = (Array.isArray(item.included_items) && item.included_items.length > 0) || !!str(item.group_note);
    units.push({
      key: `item:${item.id}`,
      kind: 'item',
      item_id: item.id,
      representation: isLot ? 'lot' : 'single',
      title: str(item.title),
      description: str(item.description),
      brand: str(item.brand) || str(item.maker),
      category: str(item.category),
      subcategory: str(item.subcategory),
      condition: str(item.condition),
      material: str(item.materials),
      model: str(item.model),
      dimensions: str(item.dimensions) || str(item.size),
      attributes: {
        maker: str(item.maker),
        serial_number: str(item.serial_number),
        era: str(item.era),
        style: str(item.style),
        condition_notes: str(item.condition_notes),
        tags: Array.isArray(item.tags) ? item.tags.slice(0, 12) : [],
        item_number: str(item.item_number),
        inventory_level: str(item.inventory_level),
        included_items: isLot ? (item.included_items || []).slice(0, 20) : [],
        group_note: str(item.group_note),
      },
      price: num(item.price),
      image_url: firstImageUrl(item),
      thumbnail_url: firstImageUrl(item),
      operator_fields: [],
      ai_marked: false,
      source_updated_at: str(item.updated_date),
      item,
    });
  }

  return units.slice(0, MAX_UNITS_PER_SALE);
}

function firstImageUrl(item) {
  const images = Array.isArray(item && item.images) ? item.images : [];
  for (const image of images) {
    if (typeof image === 'string' && image) return image;
    if (image && typeof image.url === 'string' && image.url) return image.url;
    if (image && typeof image.file_url === 'string' && image.file_url) return image.file_url;
  }
  return '';
}

/* ───────────────────── sold evidence from checkout ───────────────────── */

/** Order lines (and refunds against those orders) per inventory item id — the only transaction evidence that exists today. */
async function loadSoldEvidence(sr, saleId) {
  const orders = page(await sr.entities.Order.filter({ sale_id: saleId }, { limit: 500 }).catch(() => []));
  const orderIds = orders.map(order => order.id).filter(Boolean);
  const refunds = orderIds.length
    ? page(await sr.entities.SaleRefund.filter({ order_id: { $in: orderIds } }, { limit: 300 }).catch(() => []))
    : [];
  const refundsByOrder = new Map();
  for (const refund of refunds) {
    if (!refundsByOrder.has(refund.order_id)) refundsByOrder.set(refund.order_id, []);
    refundsByOrder.get(refund.order_id).push(refund);
  }

  const byItem = new Map();
  for (const order of orders) {
    const lines = Array.isArray(order.items) ? order.items : [];
    for (const line of lines) {
      const itemId = str(line && line.item_id);
      if (!itemId) continue;
      const quantity = num(line.quantity) || 1;
      const unitPrice = num(line.price);
      const amount = unitPrice == null ? null : unitPrice * quantity;
      const entry = byItem.get(itemId) || { refs: [], refunds: [], amountTotal: 0, hasAmount: false, quantity: 0 };
      entry.refs.push({ order_id: order.id, order_number: str(order.order_number), amount, quantity, at: str(order.created_date) });
      if (amount != null) { entry.amountTotal += amount; entry.hasAmount = true; }
      entry.quantity += quantity;
      for (const refund of (refundsByOrder.get(order.id) || [])) {
        entry.refunds.push({ refund_id: refund.id, order_id: order.id, amount: num(refund.amount), status: str(refund.status), at: str(refund.refunded_at) });
      }
      byItem.set(itemId, entry);
    }
  }
  return byItem;
}

function soldFor(unit, sale, soldByItem) {
  const empty = { outcome: 'unknown', sold_price: null, sold_at: null, sold_quantity: null, refs: [], refundRefs: [], net: null, operator_reported: null, bundle_note: '' };
  if (!unit.item) {
    // A photograph carries no transaction record of its own.
    return { ...empty, outcome: unit.price != null ? 'asking' : 'unknown' };
  }

  const item = unit.item;
  const operatorReported = num(item.sold_price);
  const tx = soldByItem.get(item.id);
  const base = {
    ...empty,
    operator_reported: operatorReported,
    bundle_note: unit.representation === 'lot' && (tx || operatorReported != null)
      ? 'Lot/bundle total — no per-item split was recorded, so no per-item price is claimed.'
      : '',
  };

  if (tx) {
    const refunded = tx.refunds.reduce((sum, refund) => sum + (num(refund.amount) || 0), 0);
    return {
      ...base,
      outcome: 'transaction_linked_sold',
      sold_price: tx.hasAmount ? tx.amountTotal : operatorReported,
      sold_at: str(item.sold_date) || str(tx.refs[0] && tx.refs[0].at),
      sold_quantity: tx.quantity,
      refs: tx.refs,
      refundRefs: tx.refunds,
      net: tx.hasAmount ? Math.round((tx.amountTotal - refunded) * 100) / 100 : null,
    };
  }

  if (str(item.status) === 'sold' || operatorReported != null || str(item.sold_date)) {
    return {
      ...base,
      outcome: 'operator_reported_sold',
      sold_price: operatorReported,
      sold_at: str(item.sold_date) || null,
      sold_quantity: num(item.quantity) || 1,
    };
  }

  return { ...base, outcome: unit.price != null ? 'asking' : 'unknown' };
}

/* ───────────────────────── observation build ───────────────────────── */

function identificationProvenance(unit) {
  if (unit.kind === 'item') return unit.title ? 'operator_entered' : 'unknown';
  if (unit.operator_fields.includes('name') || unit.operator_fields.includes('description')) return 'operator_confirmed';
  if (unit.ai_marked) return 'ai_suggested';
  return unit.title ? 'operator_entered' : 'unknown';
}

function pricingProvenance(unit) {
  if (unit.kind === 'item') return unit.price != null ? 'operator_entered' : 'unknown';
  if (unit.operator_fields.includes('price')) return 'operator_confirmed';
  if (unit.ai_marked) return 'ai_suggested';
  return unit.price != null ? 'operator_entered' : 'unknown';
}

function initialPriceFor(unit, sale, existing, trigger) {
  if (existing) {
    return { price: existing.initial_asking_price == null ? null : existing.initial_asking_price, status: existing.initial_price_status || 'unavailable', changes: Array.isArray(existing.price_changes) ? existing.price_changes : [] };
  }
  const changes = [];
  if (unit.price == null) return { price: null, status: 'unavailable', changes };
  if (trigger === 'publish' && ['upcoming', 'active'].includes(str(sale.status))) {
    return { price: unit.price, status: 'captured_at_publish', changes };
  }
  if (['upcoming', 'active'].includes(str(sale.status))) {
    // First time we saw it while the sale is still running: that is the asking price
    // now, not proof of what it was on publication day.
    return { price: unit.price, status: 'first_observed', changes };
  }
  // Sale already over and this price was never captured when it was live.
  return { price: null, status: 'unavailable', changes };
}

function buildObservation(sale, unit, existing, sold, now, trigger) {
  const initial = initialPriceFor(unit, sale, existing, trigger);
  const changes = initial.changes.slice();
  if (existing && unit.price != null) {
    const previous = num(existing.current_asking_price);
    if (previous != null && previous !== unit.price) {
      changes.push({ at: now, from: previous, to: unit.price });
    }
  }

  const observation = {
    unique_key: `${sale.id}::${unit.key}`,
    source_sale_id: sale.id,
    source_item_key: unit.key,
    source_item_id: unit.item_id || '',
    source_photo_id: unit.photo_id || '',
    operator_id: str(sale.operator_id),
    operator_name: str(sale.operator_name),
    company_id: str(sale.company_id),
    captured_from: trigger,
    representation: unit.representation,
    sale_status: str(sale.status),
    sale_dates: (Array.isArray(sale.sale_dates) ? sale.sale_dates : []).map(entry => str(entry && entry.date)).filter(Boolean).slice(0, 12),
    title: unit.title,
    description: unit.description,
    brand: unit.brand || '',
    category: unit.category || '',
    subcategory: unit.subcategory || '',
    condition: unit.condition || '',
    material: unit.material || '',
    model: unit.model || '',
    dimensions: unit.dimensions || '',
    attributes_json: unit.attributes || {},
    image_url: unit.image_url || '',
    thumbnail_url: unit.thumbnail_url || '',
    city: str(sale.property_address && sale.property_address.city),
    state: str(sale.property_address && sale.property_address.state),
    zip: str(sale.property_address && sale.property_address.zip),
    currency: 'USD',
    initial_asking_price: initial.price,
    initial_price_status: initial.status,
    current_asking_price: unit.price,
    price_changes: changes,
    identification_provenance: identificationProvenance(unit),
    pricing_provenance: pricingProvenance(unit),
    outcome: sold.outcome,
    sold_price: sold.sold_price,
    sold_at: sold.sold_at,
    sold_quantity: sold.sold_quantity,
    operator_reported_sold_price: sold.operator_reported,
    transaction_refs: sold.refs,
    refund_refs: sold.refundRefs,
    net_merchandise_amount: sold.net,
    bundle_note: sold.bundle_note,
    capture_status: 'captured',
    active_for_pricing: false,
    capture_error: '',
    source_updated_at: unit.source_updated_at || '',
    first_captured_at: (existing && existing.first_captured_at) || now,
    last_captured_at: now,
    capture_version: ((existing && existing.capture_version) || 0) + 1,
    normalized_knowledge_id: (existing && existing.normalized_knowledge_id) || '',
    normalized_name: (existing && existing.normalized_name) || '',
  };

  observation.active_for_pricing = observation.representation !== 'group'
    && (observation.current_asking_price != null || observation.sold_price != null);

  return observation;
}

function changedFields(previous, next) {
  const keys = [
    'title', 'description', 'brand', 'category', 'subcategory', 'condition', 'material', 'model',
    'dimensions', 'current_asking_price', 'initial_asking_price', 'initial_price_status', 'outcome',
    'sold_price', 'sold_at', 'sold_quantity', 'operator_reported_sold_price', 'net_merchandise_amount',
    'bundle_note', 'sale_status', 'representation', 'image_url', 'city', 'state', 'zip',
    'identification_provenance', 'pricing_provenance', 'source_updated_at', 'capture_status',
    'active_for_pricing', 'capture_error',
  ];
  return keys.some(key => JSON.stringify(previous[key] == null ? null : previous[key]) !== JSON.stringify(next[key] == null ? null : next[key]))
    || JSON.stringify(previous.price_changes || []) !== JSON.stringify(next.price_changes || [])
    || JSON.stringify(previous.transaction_refs || []) !== JSON.stringify(next.transaction_refs || [])
    || JSON.stringify(previous.refund_refs || []) !== JSON.stringify(next.refund_refs || []);
}

/* ───────────────────────── jobs ───────────────────────── */

async function getSale(sr, saleId) {
  try {
    return await sr.entities.EstateSale.get(saleId);
  } catch (error) {
    return null;
  }
}

async function loadSaleObservations(sr, saleId) {
  const rows = [];
  let cursor = null;
  for (let pass = 0; pass < 8; pass += 1) {
    const options = { limit: 500 };
    if (cursor) options.cursor = cursor;
    const res = await sr.entities.ItemObservation.filter({ source_sale_id: saleId }, options);
    rows.push(...page(res));
    if (!res || !res.has_more || !res.next_cursor) break;
    cursor = res.next_cursor;
  }
  return rows;
}

/** Close a sale's capture: anything no longer present in the source, or any archived sale, stops being pricing evidence. */
async function finalizeSale(sr, sale, units, now) {
  const present = new Set(units.map(unit => unit.key));
  const rows = await loadSaleObservations(sr, sale.id);
  const archived = str(sale.status) === 'archived';
  const patches = [];
  for (const row of rows) {
    const missing = !present.has(row.source_item_key);
    if ((missing || archived) && row.capture_status !== 'withdrawn') {
      patches.push({
        id: row.id,
        capture_status: 'withdrawn',
        active_for_pricing: false,
        capture_error: archived ? 'Sale archived — withdrawn from pricing evidence.' : 'Source item no longer exists in the sale — withdrawn from pricing evidence.',
        last_captured_at: now,
      });
    }
  }
  if (patches.length) await sr.entities.ItemObservation.bulkUpdate(patches.slice(0, 500));
  return patches.length;
}

/** Run one bounded batch of a sale_capture job. Safe to call repeatedly: the cursor is durable. */
export async function runCaptureBatch(base44, jobId, options) {
  const sr = srOf(base44);
  const maxUnits = Math.max(1, Math.min(Number(options && options.maxUnits) || 60, 200));
  const job = await sr.entities.ItemObservationJob.get(jobId).catch(() => null);
  if (!job) return { ok: false, error: 'job_not_found' };
  if (job.status === 'completed') return { ok: true, job, status: 'completed', done: true };

  const sale = await getSale(sr, job.scope_sale_id);
  const now = new Date().toISOString();

  if (!sale) {
    await sr.entities.ItemObservationJob.update(jobId, { status: 'failed', last_error: 'Sale not found', completed_at: now });
    return { ok: false, error: 'sale_not_found' };
  }
  if (!PUBLISHED.includes(str(sale.status))) {
    await sr.entities.ItemObservationJob.update(jobId, {
      status: 'completed',
      last_error: `Sale status "${str(sale.status) || 'unknown'}" is not a published sale — nothing captured.`,
      completed_at: now,
    });
    return { ok: true, skipped: true, status: 'completed', done: true };
  }

  const items = page(await sr.entities.Item.filter({ estate_sale_id: sale.id }, { limit: 2000 }).catch(() => []));
  const units = buildUnits(sale, items);
  const start = Number(job.cursor_unit_index) || 0;
  const slice = units.slice(start, start + maxUnits);

  let created = 0, updated = 0, unchanged = 0, failed = 0;
  let errorNote = '';

  try {
    const soldByItem = await loadSoldEvidence(sr, sale.id);
    const existingRows = slice.length
      ? page(await sr.entities.ItemObservation.filter(
        { source_sale_id: sale.id, source_item_key: { $in: slice.map(unit => unit.key) } },
        { limit: slice.length },
      ))
      : [];
    const existingByKey = new Map(existingRows.map(row => [row.source_item_key, row]));

    const toCreate = [];
    const toUpdate = [];
    for (const unit of slice) {
      const existing = existingByKey.get(unit.key) || null;
      const sold = soldFor(unit, sale, soldByItem);
      const next = buildObservation(sale, unit, existing, sold, now, str(job.trigger) || 'publish');
      if (!existing) {
        toCreate.push(next);
      } else if (changedFields(existing, next)) {
        toUpdate.push({ id: existing.id, ...next });
      } else {
        unchanged += 1;
      }
    }

    if (toCreate.length) {
      await sr.entities.ItemObservation.bulkCreate(toCreate);
      created = toCreate.length;
    }
    if (toUpdate.length) {
      await sr.entities.ItemObservation.bulkUpdate(toUpdate.slice(0, 500));
      updated = toUpdate.length;
    }
  } catch (error) {
    failed = slice.length;
    errorNote = error && error.message ? error.message : 'capture_failed';
    console.error('item observation batch failed:', errorNote);
  }

  const nextCursor = start + slice.length;
  const done = nextCursor >= units.length;
  let withdrawn = 0;
  if (done) {
    try {
      withdrawn = await finalizeSale(sr, sale, units, now);
    } catch (error) {
      errorNote = errorNote || (error && error.message) || 'finalize_failed';
    }
  }

  const status = done ? (failed > 0 || errorNote ? 'partial' : 'completed') : 'processing';
  const jobPatch = {
    status,
    units_total: units.length,
    units_processed: (Number(job.units_processed) || 0) + slice.length,
    created_count: (Number(job.created_count) || 0) + created,
    updated_count: (Number(job.updated_count) || 0) + updated,
    unchanged_count: (Number(job.unchanged_count) || 0) + unchanged,
    failed_count: (Number(job.failed_count) || 0) + failed,
    withdrawn_count: (Number(job.withdrawn_count) || 0) + withdrawn,
    cursor_unit_index: nextCursor,
    last_batch_at: now,
    last_error: errorNote || '',
    started_at: job.started_at || now,
  };
  if (done) jobPatch.completed_at = now;
  const savedJob = await sr.entities.ItemObservationJob.update(jobId, jobPatch);

  return {
    ok: true,
    job: savedJob,
    status,
    done,
    units: units.length,
    processed: slice.length,
    created,
    updated,
    unchanged,
    withdrawn,
    failed,
    error: errorNote || null,
  };
}

/** Queue a sale for capture (idempotent per sale) and run the first bounded batch inline. */
export async function queueSaleCapture(base44, saleId, options) {
  const sr = srOf(base44);
  const trigger = str(options && options.trigger) || 'publish';
  const maxUnits = Number(options && options.maxUnits) || 60;

  const sale = await getSale(sr, saleId);
  if (!sale) return { ok: false, error: 'sale_not_found' };
  if (!PUBLISHED.includes(str(sale.status))) return { ok: true, skipped: true, reason: `status=${str(sale.status) || 'unknown'}` };

  const open = page(await sr.entities.ItemObservationJob.filter(
    { job_type: 'sale_capture', scope_sale_id: saleId, status: { $in: ['queued', 'processing'] } },
    { limit: 5, sort: '-created_date' },
  ));
  let job = open[0] || null;
  if (!job) {
    job = await sr.entities.ItemObservationJob.create({
      job_type: 'sale_capture',
      trigger,
      scope_sale_id: saleId,
      status: 'processing',
      attempts: 1,
      started_at: new Date().toISOString(),
    });
  } else {
    job = await sr.entities.ItemObservationJob.update(job.id, { attempts: (Number(job.attempts) || 0) + 1 });
  }

  const batch = await runCaptureBatch(sr, job.id, { maxUnits });
  return { ok: true, job_id: job.id, ...batch };
}

/** Re-read the sale and its checkout evidence without a new publish. */
export async function refreshSaleObservations(base44, saleId) {
  return queueSaleCapture(base44, saleId, { trigger: 'sold_refresh', maxUnits: 60 });
}

/** Retry: a fresh job from the start of the sale. Observations are matched by key, so nothing duplicates. */
export async function retrySaleCapture(base44, saleId) {
  const sr = srOf(base44);
  const stale = page(await sr.entities.ItemObservationJob.filter(
    { job_type: 'sale_capture', scope_sale_id: saleId, status: { $in: ['failed', 'partial', 'processing', 'queued'] } },
    { limit: 20 },
  ));
  for (const job of stale) {
    await sr.entities.ItemObservationJob.update(job.id, { status: 'failed', last_error: job.last_error || 'Superseded by a retry' });
  }
  return queueSaleCapture(sr, saleId, { trigger: 'manual', maxUnits: 80 });
}

/* ───────────────────────── status / overview ───────────────────────── */

export async function saleCaptureStatus(base44, saleId) {
  const sr = srOf(base44);
  const [byStatus, byOutcome, jobs] = await Promise.all([
    sr.entities.ItemObservation.aggregate({ query: { source_sale_id: saleId }, groupBy: 'capture_status' }).catch(() => ({ rows: [] })),
    sr.entities.ItemObservation.aggregate({ query: { source_sale_id: saleId }, groupBy: 'outcome' }).catch(() => ({ rows: [] })),
    sr.entities.ItemObservationJob.filter({ job_type: 'sale_capture', scope_sale_id: saleId }, { limit: 3, sort: '-created_date' }).catch(() => []),
  ]);
  const counts = {};
  for (const row of (byStatus.rows || [])) counts[row.capture_status || 'unknown'] = row.count;
  const outcomes = {};
  for (const row of (byOutcome.rows || [])) outcomes[row.outcome || 'unknown'] = row.count;
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  const latest = page(jobs)[0] || null;
  return {
    total,
    captured: counts.captured || 0,
    withdrawn: counts.withdrawn || 0,
    by_outcome: outcomes,
    job: latest ? {
      id: latest.id,
      status: latest.status,
      units_total: latest.units_total || 0,
      units_processed: latest.units_processed || 0,
      failed_count: latest.failed_count || 0,
      last_error: latest.last_error || '',
      completed_at: latest.completed_at || null,
    } : null,
  };
}

export async function captureOverview(base44) {
  const sr = srOf(base44);
  const [byStatus, byOutcome, byRepresentation, jobs] = await Promise.all([
    sr.entities.ItemObservation.aggregate({ groupBy: 'capture_status' }).catch(() => ({ rows: [] })),
    sr.entities.ItemObservation.aggregate({ groupBy: 'outcome' }).catch(() => ({ rows: [] })),
    sr.entities.ItemObservation.aggregate({ groupBy: 'representation' }).catch(() => ({ rows: [] })),
    sr.entities.ItemObservationJob.filter({}, { limit: 8, sort: '-created_date' }).catch(() => []),
  ]);
  const counts = {};
  for (const row of (byStatus.rows || [])) counts[row.capture_status || 'unknown'] = row.count;
  const outcomes = {};
  for (const row of (byOutcome.rows || [])) outcomes[row.outcome || 'unknown'] = row.count;
  const representations = {};
  for (const row of (byRepresentation.rows || [])) representations[row.representation || 'unknown'] = row.count;
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  const active = await sr.entities.ItemObservation.count({ active_for_pricing: true }).catch(() => null);
  return {
    total,
    active_for_pricing: active,
    by_status: counts,
    by_outcome: outcomes,
    by_representation: representations,
    jobs: page(jobs),
  };
}

/* ───────────────────────── backfill ───────────────────────── */

/** Resumable backfill over already-published sales, using the same capture engine. */
export async function startBackfill(base44, options) {
  const sr = srOf(base44);
  const limit = Math.max(1, Math.min(Number(options && options.limit) || 40, 200));
  const includeCompleted = options && options.includeCompleted !== false;

  const statuses = includeCompleted ? ['upcoming', 'active', 'completed'] : ['upcoming', 'active'];
  const sales = page(await sr.entities.EstateSale.filter({ status: { $in: statuses } }, { limit, sort: '-updated_date' }));

  const targets = [];
  let skipped = 0;
  for (const sale of sales) {
    if (!sale || !sale.id) continue;
    const done = page(await sr.entities.ItemObservationJob.filter(
      { job_type: 'sale_capture', scope_sale_id: sale.id, status: 'completed' },
      { limit: 1 },
    ));
    const existing = await sr.entities.ItemObservation.count({ source_sale_id: sale.id }).catch(() => 0);
    if (done.length && existing > 0) { skipped += 1; continue; }
    targets.push(sale.id);
  }

  if (!targets.length) return { ok: true, created: false, considered: sales.length, skipped, reason: 'Nothing left to backfill in this batch.' };

  const job = await sr.entities.ItemObservationJob.create({
    job_type: 'backfill',
    trigger: 'backfill',
    status: 'processing',
    target_sale_ids: targets,
    total_sales: targets.length,
    sales_skipped: skipped,
    attempts: 1,
    started_at: new Date().toISOString(),
  });
  return { ok: true, created: true, job_id: job.id, considered: sales.length, targets: targets.length, skipped };
}

/** Advance a backfill by one sale (bounded batches inside that sale). */
export async function processBackfillStep(base44, jobId, options) {
  const sr = srOf(base44);
  const job = await sr.entities.ItemObservationJob.get(jobId).catch(() => null);
  if (!job) return { ok: false, error: 'job_not_found' };
  if (job.status === 'completed') return { ok: true, done: true, job };

  const targets = Array.isArray(job.target_sale_ids) ? job.target_sale_ids : [];
  const index = Number(job.cursor_sale_index) || 0;
  if (index >= targets.length) {
    const saved = await sr.entities.ItemObservationJob.update(jobId, { status: 'completed', completed_at: new Date().toISOString(), last_batch_at: new Date().toISOString() });
    return { ok: true, done: true, job: saved };
  }

  const saleId = targets[index];
  const maxUnits = Number(options && options.maxUnits) || 80;
  const queued = await queueSaleCapture(sr, saleId, { trigger: 'backfill', maxUnits });
  const done = !queued || queued.skipped || queued.done;

  const patch = {
    cursor_sale_index: done ? index + 1 : index,
    sales_completed: (Number(job.sales_completed) || 0) + (done ? 1 : 0),
    last_batch_at: new Date().toISOString(),
    last_error: queued && queued.error ? String(queued.error) : '',
    attempts: (Number(job.attempts) || 0) + 1,
  };
  if (patch.cursor_sale_index >= targets.length) {
    patch.status = 'completed';
    patch.completed_at = new Date().toISOString();
  }
  const saved = await sr.entities.ItemObservationJob.update(jobId, patch);
  return {
    ok: true,
    done: patch.status === 'completed',
    sale_id: saleId,
    position: patch.cursor_sale_index,
    total: targets.length,
    batch: queued,
    job: saved,
  };
}