import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { item_id } = await req.json();
    if (!item_id) return Response.json({ error: 'item_id required' }, { status: 400 });

    const creds = user.ebay_credentials;
    if (!creds?.access_token || !creds?.api_key) {
      return Response.json({ error: 'eBay credentials not configured. Please set them in My Profile → eBay tab.' }, { status: 400 });
    }

    const items = await base44.entities.Item.filter({ id: item_id });
    if (items.length === 0) return Response.json({ error: 'Item not found' }, { status: 404 });
    const item = items[0];

    // eBay Inventory Item (Inventory API)
    const sku = item.sku || `ITEM-${item_id.slice(-8).toUpperCase()}`;

    const inventoryPayload = {
      product: {
        title: item.title,
        description: item.description || item.title,
        imageUrls: item.images || [],
      },
      condition: mapCondition(item.condition),
      availability: {
        shipToLocationAvailability: {
          quantity: item.quantity || 1,
        },
      },
    };

    // Create/update inventory item
    const invResponse = await fetch(
      `https://api.ebay.com/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${creds.access_token}`,
          'Content-Language': 'en-US',
        },
        body: JSON.stringify(inventoryPayload),
      }
    );

    if (!invResponse.ok && invResponse.status !== 204) {
      const errData = await invResponse.json();
      return Response.json({ error: 'eBay inventory error', details: errData }, { status: invResponse.status });
    }

    // Create offer
    const offerPayload = {
      sku,
      marketplaceId: 'EBAY_US',
      format: 'FIXED_PRICE',
      availableQuantity: item.quantity || 1,
      categoryId: '99',  // Generic category — operator should update in eBay Seller Hub
      listingDescription: item.description || item.title,
      pricingSummary: {
        price: {
          value: String(item.price || 0),
          currency: 'USD',
        },
      },
      listingPolicies: {
        fulfillmentPolicyId: creds.fulfillment_policy_id || '',
        paymentPolicyId: creds.payment_policy_id || '',
        returnPolicyId: creds.return_policy_id || '',
      },
    };

    const offerResponse = await fetch('https://api.ebay.com/sell/inventory/v1/offer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${creds.access_token}`,
        'Content-Language': 'en-US',
      },
      body: JSON.stringify(offerPayload),
    });

    const offerData = await offerResponse.json();

    if (!offerResponse.ok) {
      return Response.json({ error: 'eBay offer error', details: offerData }, { status: offerResponse.status });
    }

    return Response.json({
      success: true,
      offer_id: offerData.offerId,
      sku,
      message: `Posted to eBay! SKU: ${sku}. Offer ID: ${offerData.offerId}. Publish the offer in eBay Seller Hub to make it live.`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function mapCondition(condition) {
  const map = {
    new: 'NEW',
    used_like_new: 'LIKE_NEW',
    used_good: 'USED_EXCELLENT',
    used_fair: 'USED_GOOD',
    for_parts: 'FOR_PARTS_OR_NOT_WORKING',
  };
  return map[condition] || 'USED_GOOD';
}