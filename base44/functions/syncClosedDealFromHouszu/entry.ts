import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const incomingKey = req.headers.get('x-legacy-shared-key') || '';
  const expectedKey = Deno.env.get('LEGACY_SHARED_API_KEY') || '';

  if (!incomingKey || incomingKey !== expectedKey) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { deal_id, operator_id, property_address, actual_referral_fee, closing_date } = body;

  if (!deal_id || !operator_id || !actual_referral_fee) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const base44 = createClientFromRequest(req);

  // Check for existing credit transaction for this deal
  const existingCredits = await base44.asServiceRole.entities.WalletTransaction.filter({
    deal_id,
    operator_id,
    type: 'credit'
  });

  if (existingCredits.length > 0) {
    const existing = existingCredits[0];
    return Response.json({
      success: true,
      operator_credit: existing.amount,
      status: existing.status,
      message: 'Credit already exists for this deal'
    });
  }

  // Get OPERATOR_CREDIT_PERCENTAGE from env or default to 20%
  const creditPercentage = parseFloat(Deno.env.get('OPERATOR_CREDIT_PERCENTAGE') || '0.20');
  const operatorCredit = Math.round(actual_referral_fee * creditPercentage);

  // Calculate available_after (14 days from closing)
  const closingDateObj = new Date(closing_date);
  const availableAfter = new Date(closingDateObj.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();

  // Create wallet transaction
  const transactionId = `TXN-${Date.now()}-${operator_id.slice(-6).toUpperCase()}`;
  await base44.asServiceRole.entities.WalletTransaction.create({
    transaction_id: transactionId,
    operator_id,
    deal_id,
    property_address: property_address || '',
    type: 'credit',
    amount: operatorCredit,
    status: 'pending',
    available_after: availableAfter,
    description: 'Platform credit from closed referral deal'
  });

  // Update or create operator wallet
  const wallets = await base44.asServiceRole.entities.OperatorWallet.filter({ operator_id });
  const now = new Date().toISOString();

  if (wallets.length > 0) {
    const wallet = wallets[0];
    await base44.asServiceRole.entities.OperatorWallet.update(wallet.id, {
      pending_balance: (wallet.pending_balance || 0) + operatorCredit,
      total_credits: (wallet.total_credits || 0) + operatorCredit,
      last_updated: now
    });
  } else {
    await base44.asServiceRole.entities.OperatorWallet.create({
      operator_id,
      pending_balance: operatorCredit,
      total_credits: operatorCredit,
      available_balance: 0,
      withdrawn_total: 0,
      frozen_balance: 0,
      wallet_status: 'active',
      last_updated: now
    });
  }

  return Response.json({
    success: true,
    operator_credit: operatorCredit,
    status: 'pending'
  });
});