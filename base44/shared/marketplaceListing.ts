/**
 * MARKETPLACE LISTINGS (server-side).
 *
 * An item's marketplace listing is a separate record tied to the inventory item.
 * Items created from sale photos get a DRAFT listing; the listings go live when
 * the sale itself is published. Nothing here changes an item's price or publishes
 * a photo.
 */

const rows = (page: any): any[] => (Array.isArray(page) ? page : (page && page.items) || []);

function pickupAddress(sale: any): { address: string; zip: string } {
  const a = (sale && sale.property_address) || {};
  const address = a.formatted_address
    || [a.street, a.city, a.state, a.zip].filter(Boolean).join(', ');
  return { address: address || '', zip: a.zip || '' };
}

export function draftListingFor({ item, sale }: any) {
  const pickup = pickupAddress(sale);
  return {
    item_id: item.id,
    operator_id: item.operator_id || (sale && sale.operator_id) || item.seller_id,
    estate_sale_id: (sale && sale.id) || item.estate_sale_id || null,
    listing_type: 'FOR_SALE',
    price: Number(item.price) > 0 ? Number(item.price) : 0,
    shipping_option: 'BOTH',
    shipping_cost: 0,
    pickup_location_address: pickup.address,
    pickup_location_zip: pickup.zip,
    status: 'DRAFT',
  };
}

/** Creates the draft listing once; an existing listing is never duplicated. */
export async function createDraftListing(service: any, { item, sale }: any) {
  const existing = rows(await service.entities.MarketplaceItem.filter({ item_id: item.id }));
  if (existing.length > 0) return existing[0];
  return service.entities.MarketplaceItem.create(draftListingFor({ item, sale }));
}

/**
 * Sale published → the sale's draft marketplace listings go live together.
 * Only items actually offered on the marketplace, and only listings still in
 * draft, are touched.
 */
export async function activateSaleListings(service: any, saleId: string) {
  const result = { activated: 0, failed: 0 };
  if (!saleId) return result;

  const items = rows(await service.entities.Item.filter(
    { estate_sale_id: saleId, marketplace_display_status: 'draft' },
    { limit: 500, fields: ['id', 'sales_channels', 'marketplace_display_status'] },
  )).filter((item: any) => (item.sales_channels || []).includes('marketplace'));
  if (items.length === 0) return result;

  const listings = rows(await service.entities.MarketplaceItem.filter(
    { item_id: { $in: items.map((i: any) => i.id) } },
    { limit: 500 },
  ));
  const drafts = new Map(
    listings.filter((l: any) => l.status === 'DRAFT').map((l: any) => [l.item_id, l]),
  );

  for (const item of items) {
    const listing = drafts.get(item.id);
    if (!listing) continue;
    try {
      await service.entities.MarketplaceItem.update(listing.id, { status: 'ACTIVE' });
      await service.entities.Item.update(item.id, {
        marketplace_item_id: listing.id,
        marketplace_display_status: 'active',
      });
      result.activated += 1;
    } catch (error) {
      result.failed += 1;
      console.error('Marketplace listing activation failed for item', item.id, error && error.message);
    }
  }

  return result;
}