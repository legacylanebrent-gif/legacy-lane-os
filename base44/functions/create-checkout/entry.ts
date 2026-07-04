import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ─────────────────────────────────────────────
// create-checkout
// Creates a Wix Payments checkout session for:
// 1. Additional email campaign profiles ($40 per 1,000)
// 2. Pro-rated subscription upgrades
// ─────────────────────────────────────────────

const ADDITIONAL_PROFILES_PRICE = '40.00';
const PROFILES_PER_BLOCK = 1000;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { product } = body; // 'additional_profiles' | 'subscription_upgrade'

    const origin = req.headers.get('Origin') || req.headers.get('origin') || '';
    if (!origin) return Response.json({ error: 'Missing Origin header' }, { status: 400 });

    const apiKey = Deno.env.get('WIX_PAYMENTS_API_KEY');
    const siteId = Deno.env.get('WIX_PAYMENTS_SITE_ID');
    if (!apiKey || !siteId) {
      return Response.json({ error: 'Payment credentials not configured' }, { status: 500 });
    }

    // ── Product: Additional Email Profiles ──
    if (product === 'additional_profiles') {
      const existing = await base44.asServiceRole.entities.OperatorEmailQuota.filter({ operator_id: user.id });
      let quota = existing[0];
      if (!quota) {
        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setFullYear(now.getFullYear() + 1);
        quota = await base44.asServiceRole.entities.OperatorEmailQuota.create({
          operator_id: user.id,
          operator_email: user.email,
          company_name: user.company_name || '',
          subscription_tier: 'elite',
          profiles_included: 1000,
          profiles_used: 0,
          additional_purchased: 0,
          period_start: now.toISOString(),
          period_end: periodEnd.toISOString(),
        });
      }

      const checkoutResponse = await fetch(
        'https://www.wixapis.com/payments/platform/v1/checkout-sessions/construct',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': apiKey,
            'wix-site-id': siteId,
          },
          body: JSON.stringify({
            cart: {
              items: [
                {
                  name: 'Additional 1,000 Email Campaign Profiles',
                  quantity: 1,
                  price: ADDITIONAL_PROFILES_PRICE,
                },
              ],
              customerInfo: {
                email: user.email,
                firstName: user.full_name?.split(' ')[0] || '',
                lastName: user.full_name?.split(' ').slice(1).join(' ') || '',
              },
            },
            callbackUrls: {
              postFlowUrl: `${origin}/CampaignBuilder`,
              thankYouPageUrl: `${origin}/CampaignBuilder?purchase=success`,
            },
          }),
        }
      );

      const data = await checkoutResponse.json();
      if (!checkoutResponse.ok) {
        console.error('Wix checkout error:', JSON.stringify(data));
        return Response.json({ error: data.message || 'Failed to create checkout session' }, { status: 400 });
      }

      const checkoutId = data.checkoutSession?.id;
      const redirectUrl = data.checkoutSession?.redirectUrl;

      if (!checkoutId || !redirectUrl) {
        return Response.json({ error: 'Invalid checkout response' }, { status: 500 });
      }

      await base44.asServiceRole.entities.OperatorEmailQuota.update(quota.id, {
        pending_checkout_id: checkoutId,
      });

      return Response.json({ success: true, redirectUrl, checkoutId });
    }

    // ── Product: Pro-rated Subscription Upgrade ──
    if (product === 'subscription_upgrade') {
      const { package_id } = body;
      if (!package_id) return Response.json({ error: 'Package ID required' }, { status: 400 });

      // Look up the target package
      const packages = await base44.asServiceRole.entities.SubscriptionPackage.filter({ id: package_id });
      const targetPkg = packages[0];
      if (!targetPkg) return Response.json({ error: 'Package not found' }, { status: 404 });

      const newPrice = targetPkg.monthly_price || 0;

      // Look up the user's current active subscription to calculate pro-rating
      const subs = await base44.asServiceRole.entities.Subscription.filter({ user_id: user.id, status: 'active' });
      const currentSub = subs[0];

      let proRatedCharge = 0;
      let currentPrice = 0;

      if (currentSub && currentSub.price != null) {
        currentPrice = currentSub.price;
        const now = new Date();
        const cycleStart = currentSub.start_date ? new Date(currentSub.start_date) : null;
        const cycleEnd = currentSub.renewal_date
          ? new Date(currentSub.renewal_date)
          : (currentSub.end_date ? new Date(currentSub.end_date) : null);

        if (cycleStart && cycleEnd && newPrice > currentPrice) {
          const totalDays = Math.max(1, (cycleEnd - cycleStart) / (1000 * 60 * 60 * 24));
          const daysRemaining = Math.max(0, (cycleEnd - now) / (1000 * 60 * 60 * 24));
          if (daysRemaining > 0) {
            // Pro-rated upgrade charge = price difference × fraction of cycle remaining
            proRatedCharge = (newPrice - currentPrice) * (daysRemaining / totalDays);
          }
        }
      }

      const items = [];

      // Pro-rated one-time upgrade charge (only if there's a current sub to pro-rate against)
      if (proRatedCharge > 0) {
        items.push({
          name: `Pro-rated upgrade charge to ${targetPkg.package_name}`,
          quantity: 1,
          price: proRatedCharge.toFixed(2),
        });
      }

      // New recurring subscription at the new price
      items.push({
        name: `${targetPkg.package_name} - Monthly`,
        quantity: 1,
        price: newPrice.toFixed(2),
        subscriptionInfo: {
          subscriptionSettings: {
            frequency: 'MONTH',
          },
          title: `${targetPkg.package_name} Monthly`,
          description: targetPkg.description || `Monthly subscription for ${targetPkg.package_name}`,
        },
      });

      const checkoutResponse = await fetch(
        'https://www.wixapis.com/payments/platform/v1/checkout-sessions/construct',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': apiKey,
            'wix-site-id': siteId,
          },
          body: JSON.stringify({
            cart: {
              items,
              customerInfo: {
                email: user.email,
                firstName: user.full_name?.split(' ')[0] || '',
                lastName: user.full_name?.split(' ').slice(1).join(' ') || '',
              },
            },
            callbackUrls: {
              postFlowUrl: `${origin}/OperatorPackages`,
              thankYouPageUrl: `${origin}/OperatorPackages?upgrade=success`,
            },
          }),
        }
      );

      const data = await checkoutResponse.json();
      if (!checkoutResponse.ok) {
        console.error('Wix checkout error:', JSON.stringify(data));
        return Response.json({ error: data.message || 'Failed to create checkout session' }, { status: 400 });
      }

      const checkoutId = data.checkoutSession?.id;
      const redirectUrl = data.checkoutSession?.redirectUrl;

      if (!checkoutId || !redirectUrl) {
        return Response.json({ error: 'Invalid checkout response' }, { status: 500 });
      }

      // Store pending upgrade on the user so the webhook can activate it
      try {
        await base44.auth.updateMe({
          pending_checkout_id: checkoutId,
          pending_upgrade: {
            checkout_id: checkoutId,
            package_id: package_id,
            target_tier: targetPkg.tier_level,
            target_account_type: targetPkg.account_type,
            target_package_name: targetPkg.package_name,
            pro_rated_charge: parseFloat(proRatedCharge.toFixed(2)),
            current_price: currentPrice,
            new_price: newPrice,
            requested_at: new Date().toISOString(),
          },
        });
      } catch (e) {
        console.error('Error storing pending upgrade on user:', e);
      }

      return Response.json({
        success: true,
        redirectUrl,
        checkoutId,
        proRatedCharge: parseFloat(proRatedCharge.toFixed(2)),
        newMonthlyPrice: newPrice,
      });
    }

    // ── Product: Marketplace Item Purchase ──
    if (product === 'marketplace_item') {
      const { marketplace_item_id } = body;
      if (!marketplace_item_id) return Response.json({ error: 'Marketplace item ID required' }, { status: 400 });

      // Fetch the marketplace item
      const miRecords = await base44.asServiceRole.entities.MarketplaceItem.filter({ id: marketplace_item_id });
      const mi = miRecords[0];
      if (!mi) return Response.json({ error: 'Marketplace item not found' }, { status: 404 });

      // Fetch linked Item for title/images
      let itemTitle = 'Marketplace Item';
      if (mi.item_id) {
        const items = await base44.asServiceRole.entities.Item.filter({ id: mi.item_id });
        if (items[0]) itemTitle = items[0].title || itemTitle;
      }

      const price = mi.price || 0;
      if (price < 0.50) {
        return Response.json({ error: 'Price must be at least $0.50' }, { status: 400 });
      }

      const shippingCost = mi.shipping_option === 'SHIPS_ONLY' || mi.shipping_option === 'BOTH'
        ? (mi.shipping_cost || 0)
        : 0;

      const items = [{
        name: itemTitle,
        quantity: 1,
        price: price.toFixed(2),
      }];

      if (shippingCost > 0) {
        items.push({
          name: 'Shipping',
          quantity: 1,
          price: shippingCost.toFixed(2),
        });
      }

      const checkoutResponse = await fetch(
        'https://www.wixapis.com/payments/platform/v1/checkout-sessions/construct',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': apiKey,
            'wix-site-id': siteId,
          },
          body: JSON.stringify({
            cart: {
              items,
              customerInfo: {
                email: user.email,
                firstName: user.full_name?.split(' ')[0] || '',
                lastName: user.full_name?.split(' ').slice(1).join(' ') || '',
              },
            },
            callbackUrls: {
              postFlowUrl: `${origin}/MarketplaceItemDetail?id=${marketplace_item_id}`,
              thankYouPageUrl: `${origin}/ThankYou?type=marketplace&id=${marketplace_item_id}`,
            },
          }),
        }
      );

      const data = await checkoutResponse.json();
      if (!checkoutResponse.ok) {
        console.error('Wix checkout error (marketplace):', JSON.stringify(data));
        return Response.json({ error: data.message || 'Failed to create checkout session' }, { status: 400 });
      }

      const checkoutId = data.checkoutSession?.id;
      const redirectUrl = data.checkoutSession?.redirectUrl;

      if (!checkoutId || !redirectUrl) {
        return Response.json({ error: 'Invalid checkout response' }, { status: 500 });
      }

      // Create a pending purchase record that the webhook will complete
      await base44.asServiceRole.entities.Purchase.create({
        marketplace_item_id,
        seller_id: mi.operator_id,
        buyer_id: user.id,
        purchase_type: 'FIXED_PRICE',
        final_price: price,
        shipping_option_chosen: mi.shipping_option === 'LOCAL_PICKUP_ONLY' ? 'LOCAL_PICKUP' : 'SHIP',
        shipping_cost_paid: shippingCost,
        status: 'PENDING_PAYMENT_ONLINE',
        pending_checkout_id: checkoutId,
      });

      return Response.json({ success: true, redirectUrl, checkoutId });
    }

    // ── Product: POS Cart Checkout ──
    if (product === 'pos_order') {
      const { cart_id } = body;
      if (!cart_id) return Response.json({ error: 'Cart ID required' }, { status: 400 });

      // Fetch the cart
      const carts = await base44.asServiceRole.entities.Cart.filter({ id: cart_id });
      const cart = carts[0];
      if (!cart) return Response.json({ error: 'Cart not found' }, { status: 404 });
      if (!cart.items || cart.items.length === 0) return Response.json({ error: 'Cart is empty' }, { status: 400 });

      const total = cart.total || 0;
      if (total < 0.50) {
        return Response.json({ error: 'Total must be at least $0.50' }, { status: 400 });
      }

      // Build cart items from the saved cart
      const items = cart.items.map(ci => ({
        name: ci.item_title || 'Item',
        quantity: ci.quantity || 1,
        price: (ci.price || 0).toFixed(2),
      }));

      const checkoutResponse = await fetch(
        'https://www.wixapis.com/payments/platform/v1/checkout-sessions/construct',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': apiKey,
            'wix-site-id': siteId,
          },
          body: JSON.stringify({
            cart: {
              items,
              customerInfo: {
                email: user.email,
                firstName: user.full_name?.split(' ')[0] || '',
                lastName: user.full_name?.split(' ').slice(1).join(' ') || '',
              },
            },
            callbackUrls: {
              postFlowUrl: `${origin}/ScanAndCart`,
              thankYouPageUrl: `${origin}/ThankYou?type=pos`,
            },
          }),
        }
      );

      const data = await checkoutResponse.json();
      if (!checkoutResponse.ok) {
        console.error('Wix checkout error (POS):', JSON.stringify(data));
        return Response.json({ error: data.message || 'Failed to create checkout session' }, { status: 400 });
      }

      const checkoutId = data.checkoutSession?.id;
      const redirectUrl = data.checkoutSession?.redirectUrl;

      if (!checkoutId || !redirectUrl) {
        return Response.json({ error: 'Invalid checkout response' }, { status: 500 });
      }

      // Store pending checkout on the cart so the webhook can find it
      await base44.asServiceRole.entities.Cart.update(cart.id, {
        pending_checkout_id: checkoutId,
      });

      return Response.json({ success: true, redirectUrl, checkoutId });
    }

    return Response.json({ error: 'Unknown product' }, { status: 400 });
  } catch (error) {
    console.error('create-checkout error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});