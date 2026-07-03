import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import jwt from 'npm:jsonwebtoken@9.0.2';

// ─────────────────────────────────────────────
// wix-payments-webhook
// Handles Wix Payments webhooks:
//   1. ORDER_APPROVED — additional email profiles purchase OR subscription upgrade
//   2. SUBSCRIPTION_CANCELED — user/system ended subscription early
//   3. SUBSCRIPTION_ENDED — subscription completed all billing cycles
// ─────────────────────────────────────────────

const PROFILES_PER_BLOCK = 1000;

Deno.serve(async (req) => {
  try {
    const publicKey = Deno.env.get('WIX_PAYMENTS_WEBHOOK_PUBLIC_KEY');
    if (!publicKey) {
      console.error('Missing WIX_PAYMENTS_WEBHOOK_PUBLIC_KEY');
      return new Response('Missing public key', { status: 500 });
    }

    const requestBody = await req.text();

    // Step 1: Verify JWT signature — fail closed
    let rawPayload;
    try {
      rawPayload = jwt.verify(requestBody, publicKey, { algorithms: ['RS256'] });
    } catch (err) {
      console.error('JWT verification failed:', err.message);
      return new Response('Invalid signature', { status: 401 });
    }

    // Step 2: Parse double-nested JSON
    const event = JSON.parse(rawPayload.data);
    const eventData = JSON.parse(event.data);

    const base44 = createClientFromRequest(req);

    // ── ORDER APPROVED ──────────────────────────────────────────
    if (event.eventType === 'wix.ecom.v1.order_approved') {
      const order = eventData.actionEvent?.body?.order;
      if (!order) {
        console.error('No order in webhook payload');
        return new Response('OK', { status: 200 });
      }

      const checkoutId = order.checkoutId;
      if (!checkoutId) {
        console.error('No checkoutId in order');
        return new Response('OK', { status: 200 });
      }

      // Extract subscription IDs from line items (for future cancel/expire matching)
      const subscriptionIds = [];
      for (const lineItem of (order.lineItems || [])) {
        if (lineItem.subscriptionInfo?.id) {
          subscriptionIds.push(lineItem.subscriptionInfo.id);
        }
      }

      // ── Try 1: Additional email profiles purchase ──
      const quotaRecords = await base44.asServiceRole.entities.OperatorEmailQuota.filter({
        pending_checkout_id: checkoutId,
      });

      if (quotaRecords.length > 0) {
        const quota = quotaRecords[0];
        await base44.asServiceRole.entities.OperatorEmailQuota.update(quota.id, {
          additional_purchased: (quota.additional_purchased || 0) + PROFILES_PER_BLOCK,
          pending_checkout_id: null,
          last_purchase_at: new Date().toISOString(),
        });
        console.log(`[webhook] Added ${PROFILES_PER_BLOCK} profiles to operator ${quota.operator_id}`);

        // Fire CustomerIO event
        try {
          await base44.asServiceRole.functions.invoke('customerioService', {
            action: 'trackEvent',
            userId: quota.operator_id,
            eventName: 'purchase.completed',
            data: { product: 'additional_profiles', quantity: PROFILES_PER_BLOCK, checkout_id: checkoutId },
          });
        } catch (e) {
          console.error('[webhook] CustomerIO track failed:', e.message);
        }

        return new Response('OK', { status: 200 });
      }

      // ── Try 2: Subscription upgrade ──
      const users = await base44.asServiceRole.entities.User.filter({
        pending_checkout_id: checkoutId,
      });

      if (users.length > 0) {
        const user = users[0];
        const pendingUpgrade = user.pending_upgrade || {};

        // Cancel any existing active subscription
        const existingSubs = await base44.asServiceRole.entities.Subscription.filter({
          user_id: user.id,
          status: 'active',
        });
        for (const oldSub of existingSubs) {
          await base44.asServiceRole.entities.Subscription.update(oldSub.id, {
            status: 'cancelled',
            end_date: new Date().toISOString(),
          });
        }

        // Create new active subscription
        const now = new Date();
        const renewalDate = new Date(now);
        renewalDate.setMonth(renewalDate.getMonth() + 1);

        await base44.asServiceRole.entities.Subscription.create({
          user_id: user.id,
          plan_type: pendingUpgrade.target_account_type || 'operator_pro',
          tier: pendingUpgrade.target_tier || 'pro',
          price: pendingUpgrade.new_price || 0,
          billing_period: 'monthly',
          status: 'active',
          start_date: now.toISOString(),
          renewal_date: renewalDate.toISOString(),
          wix_subscription_id: subscriptionIds[0] || null,
          wix_checkout_id: checkoutId,
          package_name: pendingUpgrade.target_package_name || '',
          account_type: pendingUpgrade.target_account_type || '',
        });

        // Update user tier and clear pending state
        await base44.asServiceRole.entities.User.update(user.id, {
          primary_account_type: pendingUpgrade.target_account_type || user.primary_account_type,
          subscription_tier: pendingUpgrade.target_tier,
          subscription_status: 'active',
          pending_checkout_id: null,
          pending_upgrade: null,
        });

        console.log(`[webhook] Activated subscription for user ${user.id}: tier=${pendingUpgrade.target_tier}, package=${pendingUpgrade.target_package_name}`);

        // Fire CustomerIO events: identify + track
        try {
          await base44.asServiceRole.functions.invoke('customerioService', {
            action: 'identifyConsumer',
            profile: {
              user_id: user.id,
              email: user.email,
              first_name: user.full_name?.split(' ')[0] || '',
              last_name: user.full_name?.split(' ').slice(1).join(' ') || '',
              role: pendingUpgrade.target_account_type || user.primary_account_type,
              subscription_tier: pendingUpgrade.target_tier,
              subscription_status: 'active',
              source: 'subscription_upgrade',
            },
          });

          await base44.asServiceRole.functions.invoke('customerioService', {
            action: 'trackEvent',
            userId: user.id,
            email: user.email,
            eventName: 'subscription.activated',
            data: {
              tier: pendingUpgrade.target_tier,
              package_name: pendingUpgrade.target_package_name,
              price: pendingUpgrade.new_price,
              pro_rated_charge: pendingUpgrade.pro_rated_charge,
            },
          });
        } catch (e) {
          console.error('[webhook] CustomerIO sync failed:', e.message);
        }

        return new Response('OK', { status: 200 });
      }

      // No matching record found — could be a checkout we didn't create
      console.log(`[webhook] No matching record found for checkoutId: ${checkoutId}`);
      return new Response('OK', { status: 200 });
    }

    // ── SUBSCRIPTION CANCELED ────────────────────────────────────
    if (event.eventType === 'wix.ecom.subscription_contracts.v1.subscription_contract_canceled') {
      const subscriptionContract = eventData.actionEvent?.body?.subscriptionContract;
      if (!subscriptionContract) {
        console.error('No subscriptionContract in cancel webhook');
        return new Response('OK', { status: 200 });
      }

      const subscriptionId = subscriptionContract.id;
      const subs = await base44.asServiceRole.entities.Subscription.filter({
        wix_subscription_id: subscriptionId,
      });

      if (subs.length > 0) {
        const sub = subs[0];
        await base44.asServiceRole.entities.Subscription.update(sub.id, {
          status: 'cancelled',
          end_date: new Date().toISOString(),
        });

        await base44.asServiceRole.entities.User.update(sub.user_id, {
          subscription_tier: null,
          subscription_status: 'cancelled',
        });

        // Fire CustomerIO event
        try {
          const users = await base44.asServiceRole.entities.User.filter({ id: sub.user_id });
          if (users[0]) {
            await base44.asServiceRole.functions.invoke('customerioService', {
              action: 'trackEvent',
              userId: users[0].id,
              email: users[0].email,
              eventName: 'subscription.cancelled',
              data: { reason: 'cancelled_by_system_or_user', previous_tier: sub.tier },
            });
          }
        } catch (e) {
          console.error('[webhook] CustomerIO track failed:', e.message);
        }

        console.log(`[webhook] Cancelled subscription ${subscriptionId} for user ${sub.user_id}`);
      }

      return new Response('OK', { status: 200 });
    }

    // ── SUBSCRIPTION ENDED (completed all cycles) ──────────────
    if (event.eventType === 'wix.ecom.subscription_contracts.v1.subscription_contract_expired') {
      const subscriptionContract = eventData.actionEvent?.body?.subscriptionContract;
      if (!subscriptionContract) {
        console.error('No subscriptionContract in expire webhook');
        return new Response('OK', { status: 200 });
      }

      const subscriptionId = subscriptionContract.id;
      const subs = await base44.asServiceRole.entities.Subscription.filter({
        wix_subscription_id: subscriptionId,
      });

      if (subs.length > 0) {
        const sub = subs[0];
        await base44.asServiceRole.entities.Subscription.update(sub.id, {
          status: 'expired',
          end_date: new Date().toISOString(),
        });

        await base44.asServiceRole.entities.User.update(sub.user_id, {
          subscription_tier: null,
          subscription_status: 'expired',
        });

        // Fire CustomerIO event
        try {
          const users = await base44.asServiceRole.entities.User.filter({ id: sub.user_id });
          if (users[0]) {
            await base44.asServiceRole.functions.invoke('customerioService', {
              action: 'trackEvent',
              userId: users[0].id,
              email: users[0].email,
              eventName: 'subscription.expired',
              data: { previous_tier: sub.tier },
            });
          }
        } catch (e) {
          console.error('[webhook] CustomerIO track failed:', e.message);
        }

        console.log(`[webhook] Expired subscription ${subscriptionId} for user ${sub.user_id}`);
      }

      return new Response('OK', { status: 200 });
    }

    // Unhandled event type — acknowledge anyway
    console.log(`[webhook] Unhandled event type: ${event.eventType}`);
    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('wix-payments-webhook error:', error);
    return new Response('Internal error', { status: 500 });
  }
});