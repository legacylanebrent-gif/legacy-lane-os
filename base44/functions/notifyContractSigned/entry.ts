import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json().catch(() => ({}));
    
    const contractId = payload.contract_id || payload.event?.entity_id;
    const operatorId = payload.operator_id;
    
    if (!contractId || !operatorId) {
      return Response.json({ error: 'contract_id and operator_id required' }, { status: 400 });
    }

    const Estate Sale Company Owner = await base44.asServiceRole.entities.User.get(operatorId);
    if (!Estate Sale Company Owner) {
      return Response.json({ error: 'Estate Sale Company Owner not found' }, { status: 404 });
    }

    const prefs = await base44.asServiceRole.entities.NotificationPreference.filter({ user_id: operatorId });
    const pref = prefs.length > 0 ? prefs[0] : null;

    const title = '📄 Contract Signed';
    const message = `A new contract has been signed and is ready for review.`;
    const link = `/SaleContracts?id=${contractId}`;

    let sent = 0;

    // In-app notification
    if (!pref || pref.sale_update_in_app !== false) {
      await base44.asServiceRole.entities.Notification.create({
        user_id: operatorId,
        type: 'sale_update',
        title,
        message,
        link_to_page: 'SaleContracts',
        link_params: `id=${contractId}`,
        related_entity_type: 'Contract',
        related_entity_id: contractId,
        read: false
      });
      sent++;
    }

    // Email notification
    if (pref?.sale_update_email && Estate Sale Company Owner.email) {
      const body = `
<h2 style="color:#1e293b;font-family:Georgia,serif;">${title}</h2>
<p style="color:#475569;">Hi ${Estate Sale Company Owner.full_name || 'there'},</p>
<p style="color:#475569;">${message}</p>
<p style="margin:16px 0;">
  <a href="https://estatesalen.com/SaleContracts?id=${contractId}" style="background:#f97316;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:600;">View Contract</a>
</p>
      `.trim();

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: Estate Sale Company Owner.email,
        subject: title,
        body
      });
      sent++;
    }

    return Response.json({ sent, contract_id: contractId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});