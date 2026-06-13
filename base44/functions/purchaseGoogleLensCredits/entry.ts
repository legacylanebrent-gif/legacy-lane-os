import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const CREDIT_PACKAGES = [
  { id: 'lens_500', searches: 500, price: 19, label: '500 Extra Searches' },
  { id: 'lens_1500', searches: 1500, price: 49, label: '1,500 Extra Searches' },
  { id: 'lens_5000', searches: 5000, price: 129, label: '5,000 Extra Searches' },
  { id: 'lens_15000', searches: 15000, price: 299, label: '15,000 Extra Searches' },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { credit_package_id } = await req.json();
    const pkg = CREDIT_PACKAGES.find(c => c.id === credit_package_id);
    if (!pkg) {
      return Response.json({ error: 'Invalid credit package', available_packages: CREDIT_PACKAGES }, { status: 400 });
    }

    // Find or create credit account
    let accounts = await base44.asServiceRole.entities.OperatorAICreditAccount.filter({ operator_id: user.id });
    let account;

    if (accounts.length === 0) {
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
      account = await base44.asServiceRole.entities.OperatorAICreditAccount.create({
        operator_id: user.id,
        google_lens_searches_limit: 0,
        google_lens_searches_used: 0,
        google_lens_purchased_searches: pkg.searches,
        google_lens_purchased_used: 0,
        google_lens_period_start: periodStart,
        google_lens_period_end: periodEnd,
        subscription_tier: 'starter',
      });
    } else {
      account = accounts[0];
      const currentPurchased = account.google_lens_purchased_searches || 0;
      const currentUsed = account.google_lens_purchased_used || 0;
      const remainingPurchased = Math.max(0, currentPurchased - currentUsed);
      await base44.asServiceRole.entities.OperatorAICreditAccount.update(account.id, {
        google_lens_purchased_searches: remainingPurchased + pkg.searches,
        google_lens_purchased_used: 0,
      });
      account = await base44.asServiceRole.entities.OperatorAICreditAccount.filter({ operator_id: user.id });
      account = account[0];
    }

    // Log the purchase as a ledger entry
    await base44.asServiceRole.entities.OperatorAICreditLedger.create({
      operator_id: user.id,
      ai_mode: 'other',
      model_used: 'google-lens',
      total_tokens: pkg.searches,
      estimated_cost: pkg.price,
      credits_charged: 0,
      credit_reason: `Google Lens credit purchase: ${pkg.label} — $${pkg.price}`,
    });

    // Create a wallet transaction record
    const wallets = await base44.asServiceRole.entities.OperatorWallet.filter({ operator_id: user.id });
    if (wallets.length === 0) {
      await base44.asServiceRole.entities.OperatorWallet.create({
        operator_id: user.id,
        total_credits: 0,
        available_balance: 0,
        pending_balance: 0,
        withdrawn_total: 0,
        frozen_balance: 0,
        wallet_status: 'active',
      });
    }

    return Response.json({
      success: true,
      searches_added: pkg.searches,
      package: pkg.label,
      price: pkg.price,
      account: {
        purchased_searches: account.google_lens_purchased_searches || 0,
        purchased_used: account.google_lens_purchased_used || 0,
        base_limit: account.google_lens_searches_limit || 0,
        base_used: account.google_lens_searches_used || 0,
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});