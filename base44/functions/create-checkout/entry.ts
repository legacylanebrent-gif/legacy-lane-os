import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ─────────────────────────────────────────────
// create-checkout
// Creates a Wix Payments checkout session for purchasing
// additional email campaign profiles ($40 per 1,000).
// ─────────────────────────────────────────────

const ADDITIONAL_PROFILES_PRICE = '40.00';
const PROFILES_PER_BLOCK = 1000;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { product } = body; // 'additional_profiles'

    if (product !== 'additional_profiles') {
      return Response.json({ error: 'Unknown product' }, { status: 400 });
    }

    const origin = req.headers.get('Origin') || req.headers.get('origin') || '';
    if (!origin) return Response.json({ error: 'Missing Origin header' }, { status: 400 });

    const apiKey = Deno.env.get('WIX_PAYMENTS_API_KEY');
    const siteId = Deno.env.get('WIX_PAYMENTS_SITE_ID');
    if (!apiKey || !siteId) {
      return Response.json({ error: 'Payment credentials not configured' }, { status: 500 });
    }

    // Create or update the operator's quota record with a pending checkout ID placeholder
    // We'll store the actual checkout ID after creation
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

    // Store the checkout ID on the quota record so the webhook can match it
    await base44.asServiceRole.entities.OperatorEmailQuota.update(quota.id, {
      pending_checkout_id: checkoutId,
    });

    return Response.json({ success: true, redirectUrl, checkoutId });
  } catch (error) {
    console.error('create-checkout error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});