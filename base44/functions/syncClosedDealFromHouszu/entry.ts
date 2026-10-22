// Legacy Houszu closed-deal callback (server-to-server, LEGACY_SHARED_API_KEY).
//
// Referral Rebuild Phase 1: the legacy compensation program is centrally
// DISABLED (shared/referralCompensationControl). Valid incoming closing
// information is still recorded — as an INFORMATIONAL ReferralCommission
// record (status 'recorded') that creates NO monetary entitlement — but no
// wallet credit is created and no operator email is sent. If the callback
// cannot be safely recorded, an explicit NON-SUCCESS response is returned so
// the sender can retry: an unrecorded event is never acknowledged as
// successfully processed.
//
// What Houszu observes while compensation is paused:
//   - HTTP 200 with { recorded: true, compensation_credits_created: false,
//     code: 'legacy_referral_compensation_paused' } when closing info is
//     recorded (idempotent per deal).
//   - HTTP 500 { success: false, error: 'recording_failed' } when the closing
//     info could NOT be recorded — the event was NOT processed and is safe
//     to retry.
//   - The original operator-credit response shape is preserved for the
//     already-credited deals (duplicate prevention is unchanged).
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

  const { deal_id, operator_id, property_address, referral_amount_due_to_brent, closing_date } = body;

  if (!deal_id || !operator_id || referral_amount_due_to_brent === undefined) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (
    typeof referral_amount_due_to_brent !== 'number' ||
    !Number.isFinite(referral_amount_due_to_brent) ||
    referral_amount_due_to_brent < 0
  ) {
    return Response.json({ error: 'referral_amount_due_to_brent must be a non-negative number' }, { status: 400 });
  }

  const base44 = createClientFromRequest(req);
  const service = base44.asServiceRole;

  // Duplicate prevention: a credit for this deal is never created twice.
  const existingCredits = await service.entities.WalletTransaction.filter({
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

  // ── Phase 1: compensation disabled — record closing info, create NO credit ──
  if (!LEGACY_REFERRAL_COMPENSATION_ENABLED) {
    try {
      const existingRecord = await service.entities.ReferralCommission.filter({
        deal_id,
        status: 'recorded'
      });

      if (existingRecord.length === 0) {
        const commissionId = `RC-${Date.now()}-${String(deal_id).slice(-6).toUpperCase()}`;
        await service.entities.ReferralCommission.create({
          commission_id: commissionId,
          deal_id,
          property_address: property_address || '',
          agent_id: '',
          operator_id,
          referral_agent_name: 'Unverified (recorded by Houszu closed-deal callback)',
          status: 'recorded',
          closing_date: closing_date ? new Date(closing_date).toISOString() : new Date().toISOString(),
          notes: `Informational closing record only — no compensation entitlement. referral_amount_due_to_brent=${referral_amount_due_to_brent}. Legacy referral compensation is paused (Referral Rebuild Phase 1).`
        });
      }

      console.log(
        `[syncClosedDealFromHouszu] deal=${deal_id} recorded without credit (legacy compensation paused)`
      );

      return Response.json({
        success: true,
        recorded: true,
        compensation_credits_created: false,
        code: LEGACY_COMPENSATION_PAUSED_CODE,
        message:
          'Closing information recorded. ' + LEGACY_COMPENSATION_PAUSED_MESSAGE
      });
    } catch (err) {
      console.error('[syncClosedDealFromHouszu] Failed to record closing info:', err?.message);
      // Explicit non-success so the sender retries — never acknowledge an
      // unrecorded event as successfully processed.
      return Response.json(
        {
          success: false,
          error: 'recording_failed',
          message:
            'Closing information could not be recorded and no credit was created. This event was NOT processed — safe to retry.'
        },
        { status: 500 }
      );
    }
  }

  // ── Compensation enabled path (only reachable when the central control is
  // deliberately re-enabled; kept for operational continuity) ──
  // Estate Sale Company Owner receives 30% of amount due to Brent Cramp
  const operatorCredit = Math.round(referral_amount_due_to_brent * 0.30);

  // Calculate available_after (10 days from closing)
  const closingDateObj = new Date(closing_date);
  const availableAfter = new Date(closingDateObj.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString();

  // Create wallet transaction
  const transactionId = `TXN-${Date.now()}-${operator_id.slice(-6).toUpperCase()}`;
  await service.entities.WalletTransaction.create({
    transaction_id: transactionId,
    operator_id,
    deal_id,
    property_address: property_address || '',
    type: 'credit',
    amount: operatorCredit,
    status: 'pending',
    available_after: availableAfter,
    description: 'Platform credit (30% of referral amount) — pending 10-day hold'
  });

  // Update or create Estate Sale Company Owner wallet
  const wallets = await service.entities.OperatorWallet.filter({ operator_id });
  const now = new Date().toISOString();

  if (wallets.length > 0) {
    const wallet = wallets[0];
    await service.entities.OperatorWallet.update(wallet.id, {
      pending_balance: (wallet.pending_balance || 0) + operatorCredit,
      total_credits: (wallet.total_credits || 0) + operatorCredit,
      last_updated: now
    });
  } else {
    await service.entities.OperatorWallet.create({
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