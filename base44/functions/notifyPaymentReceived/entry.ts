import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json().catch(() => ({}));
    
    const operatorId = payload.operator_id || payload.event?.entity_id;
    const paymentAmount = payload.amount;
    const paymentType = payload.payment_type || 'commission';
    
    if (!operatorId) {
      return Response.json({ error: 'operator_id required' }, { status: 400 });
    }

    const operator = await base44.asServiceRole.entities.User.get(operatorId);
    if (!operator) {
      return Response.json({ error: 'Operator not found' }, { status: 404 });
    }

    const prefs = await base44.asServiceRole.entities.NotificationPreference.filter({ user_id: operatorId });
    const pref = prefs.length > 0 ? prefs[0] : null;

    const title = '💵 Payment Received';
    const message = `You received a ${paymentType} payment of $${paymentAmount || 'TBA'}.`;
    const link = `/OperatorWalletDashboard`;

    let sent = 0;

    // In-app notification
    if (!pref || pref.reward_in_app !== false) {
      await base44.asServiceRole.entities.Notification.create({
        user_id: operatorId,
        type: 'reward',
        title,
        message,
        link_to_page: 'OperatorWalletDashboard',
        related_entity_type: 'Payment',
        read: false
      });
      sent++;
    }

    // Email notification
    if (pref?.reward_email && operator.email) {
      const body = `
<h2 style="color:#1e293b;font-family:Georgia,serif;">${title}</h2>
<p style="color:#475569;">Hi ${operator.full_name || 'there'},</p>
<p style="color:#475569;">${message}</p>
<p style="margin:16px 0;">
  <a href="https://estatesalen.com/OperatorWalletDashboard" style="background:#f97316;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:600;">View Wallet</a>
</p>
      `.trim();

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: operator.email,
        subject: title,
        body
      });
      sent++;
    }

    return Response.json({ sent, operator_id: operatorId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});