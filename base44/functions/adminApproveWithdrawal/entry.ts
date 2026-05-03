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

  const { transaction_id } = body;

  if (!transaction_id) {
    return Response.json({ error: 'transaction_id required' }, { status: 400 });
  }

  const transactions = await base44.asServiceRole.entities.WalletTransaction.filter({ transaction_id });

  if (transactions.length === 0) {
    return Response.json({ error: 'Transaction not found' }, { status: 404 });
  }

  const txn = transactions[0];

  if (txn.type !== 'withdrawal') {
    return Response.json({ error: 'Only withdrawal transactions can be approved' }, { status: 400 });
  }

  // Update transaction
  await base44.asServiceRole.entities.WalletTransaction.update(txn.id, {
    status: 'completed'
  });

  // Update wallet
  const wallets = await base44.asServiceRole.entities.OperatorWallet.filter({ operator_id: txn.operator_id });

  if (wallets.length > 0) {
    const wallet = wallets[0];
    await base44.asServiceRole.entities.OperatorWallet.update(wallet.id, {
      withdrawn_total: (wallet.withdrawn_total || 0) + txn.amount,
      last_updated: new Date().toISOString()
    });
  }

  return Response.json({
    success: true
  });
});