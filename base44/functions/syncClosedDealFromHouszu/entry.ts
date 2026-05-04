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

  const { deal_id, operator_id, property_address, referral_amount_due_to_brent, closing_date } = body;

  if (!deal_id || !operator_id || referral_amount_due_to_brent === undefined) {
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

  // Operator receives 30% of amount due to Brent Cramp
  const operatorCredit = Math.round(referral_amount_due_to_brent * 0.30);

  // Calculate available_after (10 days from closing)
  const closingDateObj = new Date(closing_date);
  const availableAfter = new Date(closingDateObj.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString();

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
    description: 'Platform credit (30% of referral amount) — pending 10-day hold'
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

  // Notify operator of new pending credit
  try {
    const users = await base44.asServiceRole.entities.User.filter({ id: operator_id });
    const operatorUser = users[0];
    const creditFormatted = `$${(operatorCredit / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    const availableDate = new Date(availableAfter).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    if (operatorUser?.email) {
      const emailHtml = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
<tr><td style="background:linear-gradient(135deg,#1e293b 0%,#334155 100%);padding:28px 32px;text-align:center;">
  <div style="font-family:Georgia,serif;font-size:26px;font-weight:bold;color:#ffffff;letter-spacing:1px;">Legacy Lane</div>
  <div style="font-size:12px;color:#f97316;margin-top:4px;letter-spacing:2px;text-transform:uppercase;">OS Platform &nbsp;·&nbsp; Wallet</div>
</td></tr>
<tr><td style="padding:36px 32px;">
  <div style="text-align:center;margin-bottom:24px;">
    <div style="font-size:40px;">🎉</div>
  </div>
  <h2 style="margin:0 0 8px 0;font-size:22px;color:#1e293b;font-family:Georgia,serif;text-align:center;">New Platform Credit Earned</h2>
  <p style="margin:0 0 24px 0;font-size:15px;color:#475569;line-height:1.7;text-align:center;">Hi ${operatorUser.full_name || 'there'},<br/>A deal just closed and platform credits have been added to your wallet.</p>

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:24px;">
    <tr><td style="padding:10px 16px;font-size:13px;color:#64748b;font-weight:600;width:45%;">Property</td><td style="padding:10px 16px;font-size:14px;color:#1e293b;">${property_address || 'N/A'}</td></tr>
    <tr style="background:#fff;"><td style="padding:10px 16px;font-size:13px;color:#64748b;font-weight:600;">Deal ID</td><td style="padding:10px 16px;font-size:13px;color:#1e293b;font-family:monospace;">${deal_id}</td></tr>
    <tr><td style="padding:10px 16px;font-size:13px;color:#64748b;font-weight:600;">Credits Added</td><td style="padding:10px 16px;font-size:22px;font-weight:800;color:#f97316;">${creditFormatted}</td></tr>
    <tr style="background:#fff;"><td style="padding:10px 16px;font-size:13px;color:#64748b;font-weight:600;">Status</td><td style="padding:10px 16px;"><span style="background:#fffbeb;color:#d97706;border:1px solid #fde68a;border-radius:20px;padding:3px 12px;font-size:12px;font-weight:700;">Pending — 10-day hold</span></td></tr>
    <tr><td style="padding:10px 16px;font-size:13px;color:#64748b;font-weight:600;">Available On</td><td style="padding:10px 16px;font-size:14px;color:#1e293b;">${availableDate}</td></tr>
  </table>

  <p style="margin:0 0 24px 0;font-size:13px;color:#64748b;line-height:1.6;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;">
    <strong>Important:</strong> These are Legacy Lane platform credits — not real estate commissions. Credits are held for 10 days before becoming available for withdrawal. Amounts may be subject to 1099 reporting.
  </p>

  <div style="text-align:center;margin:28px 0;">
    <a href="https://app.legacylane.com/OperatorWalletDashboard" style="display:inline-block;background:#f97316;color:#ffffff;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:700;text-decoration:none;">View My Wallet</a>
  </div>
</td></tr>
<tr><td style="background:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;text-align:center;">
  <p style="margin:0 0 6px 0;font-size:13px;color:#64748b;">Legacy Lane OS &nbsp;|&nbsp; Referral Exchange Platform</p>
  <p style="margin:0;font-size:12px;color:#94a3b8;">This is an automated message. Questions? <a href="mailto:support@legacylane.com" style="color:#f97316;text-decoration:none;">support@legacylane.com</a></p>
</td></tr>
</table></td></tr></table>
</body></html>`;

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: operatorUser.email,
        from_name: 'Legacy Lane OS',
        subject: `${creditFormatted} in platform credits added to your wallet`,
        body: emailHtml,
      });
    }
  } catch (err) {
    console.warn('[syncClosedDealFromHouszu] Email notify failed:', err.message);
  }

  return Response.json({
    success: true,
    operator_credit: operatorCredit,
    status: 'pending'
  });
});