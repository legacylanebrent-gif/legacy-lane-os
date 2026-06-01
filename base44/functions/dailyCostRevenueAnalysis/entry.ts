import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow both scheduled (no user) and manual admin calls
    let isAdmin = false;
    try {
      const user = await base44.auth.me();
      if (user?.role === 'admin') isAdmin = true;
    } catch (_) {
      // Called from automation — treat as authorized
      isAdmin = true;
    }

    if (!isAdmin) {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Check if snapshot already exists for today
    const existing = await base44.asServiceRole.entities.PlatformDailySnapshot.filter({ snapshot_date: todayStr });
    if (existing.length > 0 && req.method !== 'PUT') {
      return Response.json({ message: 'Snapshot already exists for today', snapshot: existing[0] });
    }

    // Load expense configs
    const configs = await base44.asServiceRole.entities.PlatformExpenseConfig.filter({ is_active: true });

    // Calculate estimated daily expenses from configs
    let expenseBreakdown = {
      serpapi: 0,
      google_maps: 0,
      base44_platform: 0,
      openai: 0,
      meta_ads: 0,
      email_service: 0,
      other: 0
    };

    let totalExpenses = 0;

    for (const config of configs) {
      let dailyCost = 0;

      if (config.billing_model === 'monthly_flat') {
        dailyCost = (config.monthly_flat_cost || 0) / 30;
      } else if (config.billing_model === 'per_call' || config.billing_model === 'per_token' || config.billing_model === 'per_gb') {
        const dailyUnits = config.estimated_daily_units || 0;
        const freePerDay = (config.free_tier_units_per_month || 0) / 30;
        const billableUnits = Math.max(0, dailyUnits - freePerDay);
        dailyCost = billableUnits * (config.cost_per_unit || 0);
      } else if (config.billing_model === 'manual' && config.last_actual_monthly_cost) {
        dailyCost = config.last_actual_monthly_cost / 30;
      }

      const key = config.service_key;
      if (key in expenseBreakdown) {
        expenseBreakdown[key] = (expenseBreakdown[key] || 0) + dailyCost;
      } else {
        expenseBreakdown.other += dailyCost;
      }
      totalExpenses += dailyCost;
    }

    // Estimate daily revenue from subscriptions
    // Pull active users with operator role as a rough revenue signal
    let revenueBreakdown = { subscriptions: 0, marketplace: 0, referrals: 0, features: 0, other: 0 };
    let totalRevenue = 0;

    try {
      // Count active subscription packages to estimate daily revenue
      const packages = await base44.asServiceRole.entities.SubscriptionPackage.filter({ is_active: true });
      const monthlySubRevenue = packages.reduce((sum, pkg) => sum + (pkg.monthly_price || 0), 0);
      revenueBreakdown.subscriptions = monthlySubRevenue / 30;

      // Check recent wallet transactions for the day
      const walletTx = await base44.asServiceRole.entities.WalletTransaction.filter({}, '-created_date', 500);
      const todayTx = walletTx.filter(tx => {
        const txDate = tx.created_date?.split('T')[0];
        return txDate === todayStr && tx.transaction_type === 'credit';
      });
      const dailyTxRevenue = todayTx.reduce((sum, tx) => sum + (tx.amount || 0), 0);
      revenueBreakdown.other = dailyTxRevenue;

      totalRevenue = Object.values(revenueBreakdown).reduce((a, b) => a + b, 0);
    } catch (_) {
      // Revenue tracking may not be fully set up — leave as 0 estimates
    }

    const net = totalRevenue - totalExpenses;

    const snapshotData = {
      snapshot_date: todayStr,
      total_expenses: Math.round(totalExpenses * 100) / 100,
      total_revenue: Math.round(totalRevenue * 100) / 100,
      net: Math.round(net * 100) / 100,
      expense_breakdown: expenseBreakdown,
      revenue_breakdown: revenueBreakdown,
      api_call_counts: {
        serpapi_calls: configs.find(c => c.service_key === 'serpapi')?.estimated_daily_units || 0,
        google_maps_calls: configs.find(c => c.service_key === 'google_maps')?.estimated_daily_units || 0,
        openai_tokens: configs.find(c => c.service_key === 'openai')?.estimated_daily_units || 0,
        enrichment_calls: 0
      },
      generated_by: 'automation',
      notes: `Auto-generated snapshot for ${todayStr}. Total expenses: $${totalExpenses.toFixed(2)}, estimated revenue: $${totalRevenue.toFixed(2)}.`
    };

    let snapshot;
    if (existing.length > 0) {
      snapshot = await base44.asServiceRole.entities.PlatformDailySnapshot.update(existing[0].id, snapshotData);
    } else {
      snapshot = await base44.asServiceRole.entities.PlatformDailySnapshot.create(snapshotData);
    }

    return Response.json({ success: true, snapshot, summary: { date: todayStr, expenses: totalExpenses.toFixed(2), revenue: totalRevenue.toFixed(2), net: net.toFixed(2) } });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});