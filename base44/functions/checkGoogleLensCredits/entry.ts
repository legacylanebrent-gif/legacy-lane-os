import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Free tier default limit
const FREE_TIER_LIMIT = 50;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const checkOnly = body.check_only === true;

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // Find credit account
    let accounts = await base44.asServiceRole.entities.OperatorAICreditAccount.filter({ operator_id: user.id });
    let account;

    if (accounts.length === 0) {
      // First time — create account and auto-determine limit from subscription
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

      // Check subscription package for Google Lens limit
      let baseLimit = 0;
      const selectedPkgId = user.selected_package;
      if (selectedPkgId) {
        try {
          const pkgData = await base44.asServiceRole.entities.SubscriptionPackage.get(selectedPkgId);
          const hasSerpapi = (pkgData.allowed_features || []).includes('serpapi');
          if (hasSerpapi) {
            // Paid tiers with serpapi get a default limit — exact limit from package limits if set
            const pkgLimit = pkgData.limits?.google_lens_searches || pkgData.limits?.serp_searches;
            if (pkgLimit) {
              const parsed = parseInt(pkgLimit, 10);
              baseLimit = isNaN(parsed) ? -1 : parsed;
            } else {
              // Default for paid users: unlimited (or a high number for tracking purposes)
              baseLimit = 10000;
            }
          } else {
            // Free tier
            baseLimit = FREE_TIER_LIMIT;
          }
        } catch (e) {
          baseLimit = FREE_TIER_LIMIT;
        }
      } else {
        baseLimit = FREE_TIER_LIMIT;
      }

      account = await base44.asServiceRole.entities.OperatorAICreditAccount.create({
        operator_id: user.id,
        google_lens_searches_limit: baseLimit,
        google_lens_searches_used: 0,
        google_lens_purchased_searches: 0,
        google_lens_purchased_used: 0,
        google_lens_period_start: periodStart,
        google_lens_period_end: periodEnd,
        subscription_tier: user.subscription_tier || 'starter',
      });
    } else {
      account = accounts[0];

      // Reset if period has changed
      const accountPeriodStart = account.google_lens_period_start;
      if (!accountPeriodStart || new Date(accountPeriodStart).getMonth() !== now.getMonth() || 
          new Date(accountPeriodStart).getFullYear() !== now.getFullYear()) {
        // New month — reset counters
        const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
        await base44.asServiceRole.entities.OperatorAICreditAccount.update(account.id, {
          google_lens_searches_used: 0,
          google_lens_purchased_used: 0,
          google_lens_period_start: periodStart,
          google_lens_period_end: periodEnd,
        });
        account = await base44.asServiceRole.entities.OperatorAICreditAccount.filter({ operator_id: user.id });
        account = account[0];
      }
    }

    const baseLimit = account.google_lens_searches_limit || 0;
    const baseUsed = account.google_lens_searches_used || 0;
    const purchased = account.google_lens_purchased_searches || 0;
    const purchasedUsed = account.google_lens_purchased_used || 0;

    const remainingPurchased = Math.max(0, purchased - purchasedUsed);
    const remainingBase = baseLimit === -1 ? Infinity : Math.max(0, baseLimit - baseUsed);
    const totalRemaining = remainingPurchased + remainingBase;

    if (totalRemaining <= 0) {
      return Response.json({
        allowed: false,
        reason: 'No Google Lens searches remaining. Purchase more credits to continue.',
        base_limit: baseLimit,
        base_used: baseUsed,
        purchased: purchased,
        purchased_used: purchasedUsed,
        remaining: 0,
      });
    }

    // If just checking (no consumption), return current state
    if (checkOnly) {
      return Response.json({
        allowed: true,
        base_limit: baseLimit,
        base_used: baseUsed,
        purchased: purchased,
        purchased_used: purchasedUsed,
        remaining: totalRemaining === Infinity ? 999999 : totalRemaining,
      });
    }

    // Consume from purchased first, then base
    const consumeFromPurchased = Math.min(1, remainingPurchased);
    const consumeFromBase = consumeFromPurchased > 0 ? 0 : Math.min(1, remainingBase);

    await base44.asServiceRole.entities.OperatorAICreditAccount.update(account.id, {
      google_lens_purchased_used: purchasedUsed + consumeFromPurchased,
      google_lens_searches_used: baseUsed + consumeFromBase,
    });

    // Refresh account
    const refreshed = await base44.asServiceRole.entities.OperatorAICreditAccount.filter({ operator_id: user.id });
    const updated = refreshed[0];

    return Response.json({
      allowed: true,
      base_limit: baseLimit,
      base_used: (updated.google_lens_searches_used || 0),
      purchased: purchased,
      purchased_used: (updated.google_lens_purchased_used || 0),
      remaining: Math.max(0,
        (purchased || 0) - (updated.google_lens_purchased_used || 0) +
        (baseLimit === -1 ? 999999 : Math.max(0, baseLimit - (updated.google_lens_searches_used || 0)))
      ),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});