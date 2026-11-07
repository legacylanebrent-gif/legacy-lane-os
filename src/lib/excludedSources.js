// EstateSales.net is a hard-excluded source for every AI description and pricing
// lookup. No prompt may search it, and no returned match, source or price from it
// is ever shown, saved or averaged into an estimate.
export const BLOCKED_SOURCE_DOMAINS = ['estatesales.net'];

/**
 * Adds the exclusion rule to an AI pricing/description prompt.
 * Append to any prompt that asks a model to research or price an item.
 */
export const SOURCE_EXCLUSION_RULE = `STRICT SOURCE EXCLUSION: Never search, browse, cite or reference estatesales.net (EstateSales.net) in any form. Exclude that domain entirely — do not post a description, title, listing or price found there, and do not use it as a comparable. Use eBay sold listings, Facebook Marketplace, 1stDibs, Chairish, Etsy, or other legitimate retail/resale sources instead.`;

/** Returns true when a link, site name or source string points at a blocked domain. */
export function isBlockedSource(value) {
  if (!value) return false;
  const text = String(value).toLowerCase().replace(/\s+/g, '');
  return BLOCKED_SOURCE_DOMAINS.some((domain) => text.includes(domain));
}

/** Drops any entry whose key field points at a blocked domain. */
export function filterAllowedSources(list, getKey = (item) => `${item?.site || ''} ${item?.source || ''} ${item?.link || ''} ${item?.url || ''}`) {
  if (!Array.isArray(list)) return [];
  return list.filter((item) => !isBlockedSource(getKey(item)));
}