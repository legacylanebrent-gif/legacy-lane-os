/**
 * CANONICAL PHOTO FIELD RULES (server-side).
 *
 * One place decides:
 *  - which fields an AI job may ever write
 *  - whether a write fills empty fields or replaces existing ones
 *  - whether an identity value is a real identification or invented text
 *  - which stored values are contaminated legacy defaults
 *
 * Every writer (updateSaleImage, generateSaleImageSEO, repair job, batch jobs)
 * must go through these helpers so no two paths can disagree again.
 */

export const AI_OWNED_FIELDS = [
  'name',
  'description',
  'synopsis',
  'ai_first_search_price',
  'ai_deep_search_price',
  'categories',
];

/** Fields that describe WHO/WHAT the item is. Never guessed without the image. */
export const IDENTITY_FIELDS = ['name', 'description'];

export function isBlank(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/** Photographs are addressed by their file URL — never by array position. */
export function photoUrl(img) {
  if (!img) return '';
  if (typeof img === 'string') return img;
  const raw = img.url;
  if (typeof raw === 'object' && raw) return raw.url || '';
  return raw || '';
}

/**
 * Writes allowed fields onto the CURRENT stored photo.
 * mode 'fill_empty' (default) never touches a value a human already set.
 * mode 'overwrite' replaces only AI-owned fields, and only when the caller
 * explicitly asked for it (operator pressed "use AI suggestion").
 */
export function applyPhotoFields(current, fields, mode = 'fill_empty') {
  const next = { ...current };
  const changed = [];

  for (const key of AI_OWNED_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(fields || {}, key)) continue;
    const incoming = fields[key];
    if (incoming === undefined) continue;

    const isIdentity = IDENTITY_FIELDS.includes(key);
    // An empty/unknown AI value must never blank real content.
    if (isIdentity && isBlank(incoming)) continue;
    if (!isIdentity && incoming === null) continue;

    if (mode === 'fill_empty' && !isBlank(next[key])) continue;

    const before = JSON.stringify(next[key] ?? null);
    const after = JSON.stringify(incoming ?? null);
    if (before === after) continue;

    next[key] = incoming;
    changed.push(key);
    if (isIdentity) next[`${key}_source`] = 'ai';
  }

  if (changed.length > 0) {
    next.ai_updated_at = new Date().toISOString();
    if (fields?.ai_result_id) next.ai_result_id = fields.ai_result_id;
  }

  return { photo: next, changed };
}

/** True when the stored photo already carries any real identification work. */
export function hasIdentityWork(img) {
  if (!img || typeof img !== 'object') return false;
  return !isBlank(img.name) || !isBlank(img.description) || !isBlank(img.synopsis)
    || !isBlank(img.ai_first_search_price) || !isBlank(img.ai_deep_search_price)
    || img.name_source === 'operator' || img.description_source === 'operator';
}

/**
 * Legacy contamination signature.
 *
 * The retired nightly SEO job called the LLM without the photo attached and told
 * it to "mention <city, state> estate sale context", then wrote the invented
 * result into every unlabeled photo. Its output is recognisable: an estate-sale
 * location phrase inside a description that has no image-derived evidence
 * (no synopsis, no search prices, no search status), on a title shared by
 * several photos. Both conditions are required so real operator text and real
 * identified items are never treated as contaminated.
 */
export function looksLikeInventedSeoCopy(img, sale, sharedTitleCount) {
  if (!img || typeof img !== 'object') return false;
  const description = (img.description || '').toLowerCase();
  const city = (sale?.property_address?.city || '').toLowerCase();
  const state = (sale?.property_address?.state || '').toLowerCase();

  const hasEvidence = !isBlank(img.synopsis) || !isBlank(img.ai_first_search_price)
    || !isBlank(img.ai_deep_search_price) || !isBlank(img.serp_search_status);
  if (hasEvidence) return false;
  if (img.name_source === 'operator' || img.description_source === 'operator') return false;

  const mentionsLocation = (city && city.length > 2 && description.includes(city))
    || (state && state.length === 2 && description.includes(`, ${state} `))
    || description.includes('estate sale. add a touch')
    || description.includes("don't miss the chance to acquire")
    || description.includes('from our exclusive');

  return !!mentionsLocation && (sharedTitleCount || 0) >= 3;
}

/** Groups stored photos by normalized title to detect mass-duplicated identity. */
export function titleCounts(images) {
  const counts = new Map();
  for (const img of images || []) {
    if (!img || typeof img !== 'object') continue;
    const key = (img.name || '').trim().toLowerCase();
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  // Near-identical furniture variants share a long prefix; count by prefix too.
  const prefixCounts = new Map();
  for (const img of images || []) {
    if (!img || typeof img !== 'object') continue;
    const key = (img.name || '').trim().toLowerCase().split(' ').slice(0, 6).join(' ');
    if (!key) continue;
    prefixCounts.set(key, (prefixCounts.get(key) || 0) + 1);
  }
  return { counts, prefixCounts };
}

export function sharedTitleCountFor(img, images) {
  if (!img || typeof img !== 'object') return 0;
  const title = (img.name || '').trim().toLowerCase();
  if (!title) return 0;
  const prefix = title.split(' ').slice(0, 6).join(' ');
  let n = 0;
  for (const other of images || []) {
    if (!other || typeof other !== 'object') continue;
    const otherTitle = (other.name || '').trim().toLowerCase();
    if (!otherTitle) continue;
    if (otherTitle === title || (prefix.length > 12 && otherTitle.startsWith(prefix))) n++;
  }
  return n;
}