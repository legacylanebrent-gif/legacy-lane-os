import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const MIN_WITHDRAWAL = 10000; // $100 in cents

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { operator_id, amount } = body;

  if (!operator_id || !amount) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Verify operator owns the request
  if (user.id !== operator_id && user.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Validation
  if (amount < MIN_WITHDRAWAL) {
    return Response.json({ error: 'Minimum withdrawal is $100' }, { status: 400 });
  }

  const wallets = await base44.asServiceRole.entities.OperatorWallet.filter({ operator_id });

  if (wallets.length === 0) {
    return Response.json({ error: 'Wallet not found' }, { status: 404 });
  }

  const wallet = wallets[0];

  if (wallet.wallet_status !== 'active') {
    return Response.json({ error: 'Wallet is not active' }, { status: 403 });
  }

  if ((wallet.available_balance || 0) < amount) {
    return Response.json({ error: 'Insufficient balance' }, { status: 400 });
  }

  // Create withdrawal transaction
  const transactionId = `WTH-${Date.now()}-${operator_id.slice(-6).toUpperCase()}`;
  await base44.asServiceRole.entities.WalletTransaction.create({
    transaction_id: transactionId,
    operator_id,
    type: 'withdrawal',
    amount,
    status: 'pending',
    description: 'Operator withdrawal request'
  });

  // Deduct from available balance
  await base44.asServiceRole.entities.OperatorWallet.update(wallet.id, {
    available_balance: (wallet.available_balance || 0) - amount,
    last_updated: new Date().toISOString()
  });

  return Response.json({
    success: true,
    message: 'Withdrawal request submitted'
  });
});