import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { item_id } = await req.json();
    if (!item_id) return Response.json({ error: 'item_id required' }, { status: 400 });

    const creds = user.etsy_credentials;
    if (!creds?.access_token || !creds?.api_key || !creds?.shop_id) {
      return Response.json({ error: 'Etsy credentials not configured. Please set them in My Profile → Etsy tab.' }, { status: 400 });
    }

    const items = await base44.entities.Item.filter({ id: item_id });
    if (items.length === 0) return Response.json({ error: 'Item not found' }, { status: 404 });
    const item = items[0];

    // Build Etsy listing payload
    const listingPayload = {
      quantity: item.quantity || 1,
      title: item.title,
      description: item.description || item.title,
      price: {
        amount: Math.round((item.price || 0) * 100),
        divisor: 100,
        currency_code: 'USD',
      },
      who_made: 'someone_else',
      when_made: 'made_to_order',
      taxonomy_id: 1,  // General / Other category
      shipping_profile_id: null, // Operator must set their shipping profile
      state: 'draft', // Post as draft so operator can review before activating
      tags: item.tags || [],
      materials: [],
      is_supply: false,
      is_digital: false,
    };

    const response = await fetch(
      `https://openapi.etsy.com/v3/application/shops/${creds.shop_id}/listings`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': creds.api_key,
          'Authorization': `Bearer ${creds.access_token}`,
        },
        body: JSON.stringify(listingPayload),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return Response.json({ error: data.error_description || data.error || 'Etsy API error', details: data }, { status: response.status });
    }

    // Upload first image if available
    if (item.images?.length > 0 && data.listing_id) {
      const imageUrl = item.images[0];
      const imgResponse = await fetch(imageUrl);
      const imgBlob = await imgResponse.blob();
      const formData = new FormData();
      formData.append('image', imgBlob, 'image.jpg');
      formData.append('rank', '1');

      await fetch(
        `https://openapi.etsy.com/v3/application/shops/${creds.shop_id}/listings/${data.listing_id}/images`,
        {
          method: 'POST',
          headers: {
            'x-api-key': creds.api_key,
            'Authorization': `Bearer ${creds.access_token}`,
          },
          body: formData,
        }
      );
    }

    return Response.json({
      success: true,
      listing_id: data.listing_id,
      url: `https://www.etsy.com/listing/${data.listing_id}`,
      message: `Posted to Etsy as draft listing #${data.listing_id}. Activate it in your Etsy shop manager.`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});