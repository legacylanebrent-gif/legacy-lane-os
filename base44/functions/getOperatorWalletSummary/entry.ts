import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  if (req.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const url = new URL(req.url);
  const operatorId = url.searchParams.get('operator_id');
  const incomingKey = req.headers.get('x-legacy-shared-key') || '';
  const expectedKey = Deno.env.get('LEGACY_SHARED_API_KEY') || '';

  if (!incomingKey || incomingKey !== expectedKey) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!operatorId) {
    return Response.json({ error: 'operator_id required' }, { status: 400 });
  }

  const base44 = createClientFromRequest(req);

  const wallets = await base44.asServiceRole.entities.OperatorWallet.filter({ operator_id: operatorId });
  
  if (wallets.length === 0) {
    return Response.json({ error: 'Wallet not found' }, { status: 404 });
  }

  const wallet = wallets[0];

  return Response.json({
    success: true,
    operator_id: wallet.operator_id,
    available_balance: wallet.available_balance || 0,
    pending_balance: wallet.pending_balance || 0,
    withdrawn_total: wallet.withdrawn_total || 0,
    total_credits: wallet.total_credits || 0,
    frozen_balance: wallet.frozen_balance || 0,
    wallet_status: wallet.wallet_status || 'active'
  });
});