// Referral Rebuild Phase 1: releasing legacy pending wallet credits is
// centrally DISABLED (shared/referralCompensationControl). Existing pending
// transactions and wallet balances are PRESERVED untouched — this function
// now refuses to release new amounts while the program is paused.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import {
  LEGACY_REFERRAL_COMPENSATION_ENABLED,
  LEGACY_COMPENSATION_PAUSED_CODE,
  LEGACY_COMPENSATION_PAUSED_MESSAGE,
} from '../../shared/referralCompensationControl.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Admin access required' }, { status: 403 });
  }

  if (!LEGACY_REFERRAL_COMPENSATION_ENABLED) {
    return Response.json(
      {
        success: false,
        error: LEGACY_COMPENSATION_PAUSED_CODE,
        message: LEGACY_COMPENSATION_PAUSED_MESSAGE,
        released_count: 0,
        released_amount: 0
      },
      { status: 409 }
    );
  }

  const now = new Date();

  // Find all pending transactions where available_after <= now
  const pendingTransactions = await base44.asServiceRole.entities.WalletTransaction.filter({ status: 'pending' });

  const eligibleTransactions = pendingTransactions.filter(txn => {
    if (!txn.available_after) return false;
    const availableDate = new Date(txn.available_after);
    return availableDate <= now;
  });

  const updatedByOperator = {};
  let totalReleased = 0;

  // Update transactions
  for (const txn of eligibleTransactions) {
    await base44.asServiceRole.entities.WalletTransaction.update(txn.id, {
      status: 'available'
    });

    if (!updatedByOperator[txn.operator_id]) {
      updatedByOperator[txn.operator_id] = { amount: 0, count: 0 };
    }
    updatedByOperator[txn.operator_id].amount += txn.amount;
    updatedByOperator[txn.operator_id].count += 1;
    totalReleased += txn.amount;
  }

  // Update wallets
  for (const operatorId of Object.keys(updatedByOperator)) {
    const wallets = await base44.asServiceRole.entities.OperatorWallet.filter({ operator_id: operatorId });
    if (wallets.length > 0) {
      const wallet = wallets[0];
      const releaseAmount = updatedByOperator[operatorId].amount;

      await base44.asServiceRole.entities.OperatorWallet.update(wallet.id, {
        pending_balance: Math.max(0, (wallet.pending_balance || 0) - releaseAmount),
        available_balance: (wallet.available_balance || 0) + releaseAmount,
        last_updated: new Date().toISOString()
      });
    }
  }

  return Response.json({
    success: true,
    released_count: eligibleTransactions.length,
    released_amount: totalReleased
  });
});