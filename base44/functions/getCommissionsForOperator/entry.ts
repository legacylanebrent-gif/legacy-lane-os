import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get commissions from local wallet transactions (populated by syncClosedDealFromHouszu)
    const transactions = await base44.entities.WalletTransaction.filter({
      operator_id: user.id,
    }, '-created_date');

    // Also get the operator wallet for summary stats
    const wallets = await base44.entities.OperatorWallet.filter({ operator_id: user.id });
    const wallet = wallets.length > 0 ? wallets[0] : null;

    const commissions = (transactions || []).map(tx => ({
      id: tx.id,
      property_address: tx.property_address || '',
      client_name: tx.description || '',
      deal_stage: tx.status === 'completed' ? 'Closed Won' : tx.status === 'pending' ? 'Pending Payout' : tx.status,
      deal_id: tx.deal_id || '',
      expected_referral_fee: tx.amount || 0,
      actual_referral_fee: tx.status === 'completed' ? tx.amount : 0,
      status: tx.status === 'completed' ? 'paid' : tx.status === 'pending' ? 'pending' : tx.status,
    }));

    const total_expected = commissions.reduce((sum, c) => sum + (c.expected_referral_fee || 0), 0);
    const total_actual = commissions.filter(c => c.status === 'paid').reduce((sum, c) => sum + (c.actual_referral_fee || 0), 0);
    const pending_count = commissions.filter(c => c.status === 'pending').length;

    return Response.json({
      commissions,
      total_expected,
      total_actual,
      pending_count,
      wallet: wallet ? {
        available_balance: wallet.available_balance || 0,
        pending_balance: wallet.pending_balance || 0,
        total_credits: wallet.total_credits || 0,
      } : null,
    });
  } catch (error) {
    console.error('Error fetching commissions:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});