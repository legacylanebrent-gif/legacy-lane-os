/**
 * PHOTO → INVENTORY PROMOTION (server-side rules).
 *
 * One place decides how an analyzed sale photo becomes a canonical inventory item:
 * which inventory fields are filled, which price is used, how a free-text photo
 * category maps onto the inventory taxonomy, and how provenance is recorded so the
 * same photo can never create a second item.
 *
 * The photo itself is never altered here — it stays the sale's photo record.
 */

import { cleanBrandName } from './brandRegistry.ts';

export const PHOTO_SOURCE_KEY = 'photo_source';

/** A photo is addressed by its stable pipeline id (never by array position). */
export function photoKey(photo: any): string {
  return (photo && photo.pipeline && photo.pipeline.id) || (photo && typeof photo.url === 'string' ? photo.url : '') || '';
}

/** The photo an inventory item was created from, when it was created this way. */
export function photoSourceOf(item: any) {
  const src = item && item.specs ? item.specs[PHOTO_SOURCE_KEY] : null;
  return src && src.photo_id ? src : null;
}

// The inventory category list is fixed. Photo categories are free text from the AI,
// so they are matched to a real category — an unknown one becomes 'other', never an
// invented value.
const CATEGORY_RULES: Array<[string, string]> = [
  ['furniture', 'furniture'], ['chair', 'furniture'], ['table', 'furniture'], ['sofa', 'furniture'],
  ['couch', 'furniture'], ['dresser', 'furniture'], ['cabinet', 'furniture'], ['desk', 'furniture'],
  ['bookcase', 'furniture'], ['bed', 'furniture'], ['stool', 'furniture'],
  ['painting', 'art'], ['artwork', 'art'], ['sculpture', 'art'], ['fine art', 'art'],
  ['print', 'artwork_prints_posters'], ['poster', 'artwork_prints_posters'],
  ['book', 'books_media'], ['magazine', 'books_media'], ['record', 'books_media'],
  ['vinyl', 'books_media'], ['media', 'books_media'],
  ['china', 'china_porcelain'], ['porcelain', 'china_porcelain'], ['pottery', 'china_porcelain'],
  ['ceramic', 'china_porcelain'],
  ['clothing', 'clothing_accessories'], ['apparel', 'clothing_accessories'], ['purse', 'clothing_accessories'],
  ['handbag', 'clothing_accessories'], ['shoe', 'clothing_accessories'], ['jewel', 'clothing_accessories'],
  ['coin', 'coins_currency'], ['currency', 'coins_currency'], ['banknote', 'coins_currency'],
  ['antique', 'antiques'],
  ['collectible', 'collectibles'], ['memorabilia', 'collectibles'], ['figurine', 'collectibles'],
  ['sewing', 'craft_sewing'], ['fabric', 'craft_sewing'], ['yarn', 'craft_sewing'],
  ['electronic', 'electronics'], ['camera', 'electronics'], ['stereo', 'electronics'],
  ['television', 'electronics'], ['radio', 'electronics'],
  ['garden', 'garden_outdoor'], ['outdoor', 'garden_outdoor'], ['patio', 'garden_outdoor'],
  ['lawn', 'garden_outdoor'],
  ['glassware', 'glassware_crystal'], ['crystal', 'glassware_crystal'], ['glass', 'glassware_crystal'],
  ['holiday', 'holiday_seasonal'], ['christmas', 'holiday_seasonal'], ['seasonal', 'holiday_seasonal'],
  ['decor', 'home_decor'], ['vase', 'home_decor'], ['mirror', 'home_decor'], ['candle', 'home_decor'],
  ['kitchen', 'kitchen_dining'], ['dining', 'kitchen_dining'], ['cookware', 'kitchen_dining'],
  ['dish', 'kitchen_dining'], ['tableware', 'kitchen_dining'],
  ['lamp', 'lighting_lamps'], ['lighting', 'lighting_lamps'], ['chandelier', 'lighting_lamps'],
  ['medical', 'medical_mobility'], ['mobility', 'medical_mobility'], ['wheelchair', 'medical_mobility'],
  ['instrument', 'musical_instruments'], ['guitar', 'musical_instruments'], ['piano', 'musical_instruments'],
  ['office', 'office_business'], ['business equipment', 'office_business'],
  ['rug', 'rugs_textiles'], ['textile', 'rugs_textiles'], ['linen', 'rugs_textiles'],
  ['quilt', 'rugs_textiles'],
  ['sport', 'sporting_goods'], ['bicycle', 'sporting_goods'], ['fishing', 'sporting_goods'],
  ['tool', 'tools_hardware'], ['hardware', 'tools_hardware'],
  ['toy', 'toys_games'], ['game', 'toys_games'], ['puzzle', 'toys_games'], ['doll', 'toys_games'],
  ['vehicle', 'vehicles'], ['automobile', 'vehicles'], ['motorcycle', 'vehicles'],
];

function matchCategory(text: string): string | null {
  const hay = String(text || '').toLowerCase();
  if (!hay.trim()) return null;
  for (const [needle, category] of CATEGORY_RULES) {
    if (hay.includes(needle)) return category;
  }
  return null;
}

/** AI categories first; the photo's own title then decides when it has none. */
export function mapItemCategory(photo: any): string {
  const categories = Array.isArray(photo && photo.categories) ? photo.categories : [];
  return matchCategory(categories.join(' '))
    || matchCategory(photo && photo.name)
    || 'other';
}

export function photoItemPrice(photo: any): number {
  const price = Number(photo && photo.price);
  return Number.isFinite(price) && price > 0 ? price : 0;
}

export function photoItemTitle(photo: any, index: number): string {
  const name = String((photo && photo.name) || '').trim();
  return name || `Untitled item — photo ${(Number.isFinite(index) ? index : 0) + 1}`;
}

/**
 * The inventory item created from one photo.
 *
 * Price: the operator's Listing Price on the photo. A photo without one still
 * creates the item (price 0), which the inventory views already flag as
 * "Needs price" — never an AI number the operator did not choose.
 *
 * Photos: the sale photo is copied into the item's PRIVATE photo library and is
 * NOT added to the published gallery, so the existing screen-and-approve step
 * still decides what becomes public.
 */
export function buildPhotoItemPayload({ sale, photo, user, index, brand }: any) {
  const price = photoItemPrice(photo);
  const now = new Date().toISOString();
  const url = typeof (photo && photo.url) === 'string' ? photo.url : '';
  // The brand the operator or the analysis established for this photo. No brand
  // on the photo means no brand on the item — never an inferred one.
  const brandName = cleanBrandName(brand?.name);

  const payload: Record<string, any> = {
    title: photoItemTitle(photo, index),
    description: String((photo && photo.description) || ''),
    category: mapItemCategory(photo),
    quantity: 1,
    price,
    status: 'available',
    estate_sale_id: sale.id,
    seller_id: user.id,
    seller_name: user.full_name || user.email || '',
    operator_id: sale.operator_id || user.id,
    sale_team_ids: Array.isArray(sale.sale_team) ? sale.sale_team : [],
    sales_channels: ['inventory', 'marketplace'],
    inventory_display_status: 'active',
    marketplace_display_status: 'draft',
    inventory_level: 'STANDARD',
    research_status: 'CLEAR',
    images: [],
    photo_library: url
      ? [{
        url,
        purpose: 'MARKETING',
        approved_public: false,
        screen_status: 'not_run',
        note: 'From the sale photos',
        added_at: now,
      }]
      : [],
    specs: {
      [PHOTO_SOURCE_KEY]: {
        sale_id: sale.id,
        photo_id: photoKey(photo),
        photo_revision: (photo && photo.pipeline && photo.pipeline.revision) || null,
        photo_url: url,
        promoted_at: now,
      },
      ...(brand?.brand_id ? { brand_id: brand.brand_id } : {}),
    },
  };

  // The opening price is only recorded when there really is one.
  if (price > 0) payload.original_price = price;

  // The item's own Brand field, from the shared brands list.
  if (brandName) payload.brand = brandName;

  return payload;
}