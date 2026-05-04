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

  // Notify operator via email
  try {
    const users = await base44.asServiceRole.entities.User.filter({ id: txn.operator_id });
    const operatorUser = users[0];
    const amountFormatted = `$${(txn.amount / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
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
    <div style="display:inline-block;background:#f0fdf4;border:2px solid #bbf7d0;border-radius:50%;width:56px;height:56px;line-height:56px;font-size:28px;">✓</div>
  </div>
  <h2 style="margin:0 0 8px 0;font-size:22px;color:#1e293b;font-family:Georgia,serif;text-align:center;">Withdrawal Approved</h2>
  <p style="margin:0 0 24px 0;font-size:15px;color:#475569;line-height:1.7;text-align:center;">Hi ${operatorUser.full_name || 'there'},<br/>Your withdrawal request has been approved and is being processed.</p>

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:24px;">
    <tr><td style="padding:10px 16px;font-size:13px;color:#64748b;font-weight:600;width:45%;">Transaction ID</td><td style="padding:10px 16px;font-size:13px;color:#1e293b;font-family:monospace;">${txn.transaction_id}</td></tr>
    <tr style="background:#fff;"><td style="padding:10px 16px;font-size:13px;color:#64748b;font-weight:600;">Amount Approved</td><td style="padding:10px 16px;font-size:20px;font-weight:800;color:#16a34a;">${amountFormatted}</td></tr>
    <tr><td style="padding:10px 16px;font-size:13px;color:#64748b;font-weight:600;">Status</td><td style="padding:10px 16px;"><span style="background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0;border-radius:20px;padding:3px 12px;font-size:12px;font-weight:700;">Approved</span></td></tr>
  </table>

  <p style="margin:0 0 24px 0;font-size:13px;color:#64748b;line-height:1.6;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;">
    <strong>Note:</strong> These are Legacy Lane platform credits, not real estate commissions. Processing typically takes 3–5 business days. Amounts may be subject to 1099 reporting.
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
        subject: `Withdrawal Approved — ${amountFormatted} is being processed`,
        body: emailHtml,
      });
    }
  } catch (err) {
    console.warn('[adminApproveWithdrawal] Email notify failed:', err.message);
  }

  return Response.json({
    success: true
  });
});