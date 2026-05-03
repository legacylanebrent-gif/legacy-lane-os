import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Admin access required' }, { status: 403 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { operator_id, reason } = body;

  if (!operator_id || !reason) {
    return Response.json({ error: 'operator_id and reason required' }, { status: 400 });
  }

  const wallets = await base44.asServiceRole.entities.OperatorWallet.filter({ operator_id });

  if (wallets.length === 0) {
    return Response.json({ error: 'Wallet not found' }, { status: 404 });
  }

  const wallet = wallets[0];

  // Update wallet status
  await base44.asServiceRole.entities.OperatorWallet.update(wallet.id, {
    wallet_status: 'frozen',
    last_updated: new Date().toISOString()
  });

  // Create hold transaction
  const transactionId = `HLD-${Date.now()}-${operator_id.slice(-6).toUpperCase()}`;
  await base44.asServiceRole.entities.WalletTransaction.create({
    transaction_id: transactionId,
    operator_id,
    type: 'hold',
    amount: 0,
    status: 'hold',
    description: reason
  });

  return Response.json({
    success: true
  });
});