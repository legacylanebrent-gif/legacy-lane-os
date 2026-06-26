import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ADMIN_ROLES = ['super_admin', 'platform_ops', 'admin', 'support_agent', 'marketing_ops', 'data_analyst'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const {
      leadId,
      companyCount,
      contactName,
      contactEmail,
      contactPhone,
      propertyAddress,
      selectedState,
      selectedCounty,
      situation,
      timeline
    } = await req.json();

    // ── 1. Find all admin users ──
    let admins = [];
    try {
      const allUsers = await base44.asServiceRole.entities.User.list('-created_date', 500);
      admins = allUsers.filter(u =>
        ADMIN_ROLES.includes(u.primary_account_type) || u.role === 'admin'
      );
    } catch (e) {
      console.error('Failed to fetch admin users:', e);
    }

    const notifTitle = '🔔 New Website Lead Submitted';
    const notifMessage = `${contactName || 'A visitor'} just submitted an estate sale request for ${selectedCounty || 'N/A'}, ${selectedState || 'N/A'}. ${companyCount || 0} estate sale companies available in the area. Speed to lead is critical — review and assign now!`;

    // ── 2. Create in-app notifications + send emails to each admin ──
    for (const admin of admins) {
      // In-app notification
      try {
        await base44.asServiceRole.entities.Notification.create({
          user_id: admin.id,
          type: 'new_lead',
          title: notifTitle,
          message: notifMessage,
          link_to_page: 'AdminLeadsWebsite',
          read: false
        });
      } catch (e) {
        console.error('Failed to create notification for admin:', admin.id, e);
      }

      // Email notification
      if (admin.email) {
        try {
          const adminEmailHtml = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
<tr><td style="background:linear-gradient(135deg,#1e293b 0%,#334155 100%);padding:24px 32px;">
  <div style="font-family:Georgia,serif;font-size:24px;font-weight:bold;color:#fff;">EstateSalen</div>
  <div style="font-size:12px;color:#f97316;margin-top:4px;letter-spacing:2px;text-transform:uppercase;">New Lead Alert</div>
</td></tr>
<tr><td style="padding:32px;">
  <h2 style="margin:0 0 16px;font-size:22px;color:#1e293b;font-family:Georgia,serif;">New Website Lead Submitted</h2>
  <p style="font-size:15px;color:#475569;line-height:1.7;">${notifMessage}</p>
  <table style="width:100%;margin:24px 0;border-collapse:collapse;">
    <tr><td style="padding:8px 0;color:#64748b;font-size:14px;width:140px;">Contact Name:</td><td style="padding:8px 0;color:#1e293b;font-size:14px;font-weight:600;">${contactName || 'N/A'}</td></tr>
    <tr><td style="padding:8px 0;color:#64748b;font-size:14px;">Phone:</td><td style="padding:8px 0;color:#1e293b;font-size:14px;font-weight:600;">${contactPhone || 'N/A'}</td></tr>
    <tr><td style="padding:8px 0;color:#64748b;font-size:14px;">Email:</td><td style="padding:8px 0;color:#1e293b;font-size:14px;font-weight:600;">${contactEmail || 'N/A'}</td></tr>
    <tr><td style="padding:8px 0;color:#64748b;font-size:14px;">Property:</td><td style="padding:8px 0;color:#1e293b;font-size:14px;font-weight:600;">${propertyAddress || 'N/A'}</td></tr>
    <tr><td style="padding:8px 0;color:#64748b;font-size:14px;">Location:</td><td style="padding:8px 0;color:#1e293b;font-size:14px;font-weight:600;">${selectedCounty || 'N/A'}, ${selectedState || 'N/A'}</td></tr>
    <tr><td style="padding:8px 0;color:#64748b;font-size:14px;">Situation:</td><td style="padding:8px 0;color:#1e293b;font-size:14px;font-weight:600;">${situation || 'N/A'}</td></tr>
    <tr><td style="padding:8px 0;color:#64748b;font-size:14px;">Timeline:</td><td style="padding:8px 0;color:#1e293b;font-size:14px;font-weight:600;">${timeline || 'N/A'}</td></tr>
    <tr><td style="padding:8px 0;color:#64748b;font-size:14px;">Companies Available:</td><td style="padding:8px 0;color:#f97316;font-size:14px;font-weight:700;">${companyCount || 0}</td></tr>
  </table>
  <p style="font-size:13px;color:#ef4444;font-weight:600;margin:16px 0 0;">⚠ Speed to lead is critical. Please review and assign this lead immediately.</p>
</td></tr>
</table></td></tr></table>
</body></html>`;

          await base44.asServiceRole.integrations.Core.SendEmail({
            to: admin.email,
            from_name: 'EstateSalen',
            subject: `🔔 New Website Lead: ${contactName || 'Unknown'} in ${selectedCounty || 'N/A'}, ${selectedState || 'N/A'}`,
            body: adminEmailHtml
          });
        } catch (e) {
          console.error('Failed to send email to admin:', admin.email, e);
        }
      }
    }

    // ── 3. Alert the Lead Conversion Agent ──
    try {
      if (base44.asServiceRole?.agents?.createConversation) {
        const conversation = await base44.asServiceRole.agents.createConversation({
          agent_name: 'LeadConversionAgent',
          metadata: {
            name: `New Website Lead: ${contactName || 'Unknown'}`,
            lead_id: leadId || null
          }
        });
        await base44.asServiceRole.agents.addMessage(conversation, {
          role: 'user',
          content: `New website lead just came in!\n\nName: ${contactName || 'N/A'}\nLocation: ${selectedCounty || 'N/A'}, ${selectedState || 'N/A'}\nPhone: ${contactPhone || 'N/A'}\nEmail: ${contactEmail || 'N/A'}\nProperty: ${propertyAddress || 'N/A'}\nSituation: ${situation || 'N/A'}\nTimeline: ${timeline || 'N/A'}\nCompanies Available: ${companyCount || 0}\n\nSpeed to lead is critical. Please score this lead and initiate follow-up immediately.`
        });
      }
    } catch (e) {
      console.error('Failed to alert Lead Conversion agent:', e);
    }

    // ── 4. Send acknowledgment email to the lead ──
    if (contactEmail) {
      try {
        const leadEmailHtml = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
<tr><td style="background:linear-gradient(135deg,#1e293b 0%,#334155 100%);padding:28px 32px;text-align:center;">
  <div style="font-family:Georgia,serif;font-size:26px;font-weight:bold;color:#fff;">EstateSalen</div>
  <div style="font-size:12px;color:#f97316;margin-top:4px;letter-spacing:2px;text-transform:uppercase;">We've Got You Covered</div>
</td></tr>
<tr><td style="padding:36px 32px;">
  <h2 style="margin:0 0 16px;font-size:24px;color:#1e293b;font-family:Georgia,serif;">We Received Your Request, ${contactName ? contactName.split(' ')[0] : 'there'}!</h2>
  <p style="font-size:15px;color:#475569;line-height:1.7;">Thank you for reaching out to EstateSalen. We've received your estate sale request and our team is already on it.</p>
  
  <div style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:10px;padding:20px;margin:24px 0;">
    <p style="margin:0 0 8px;font-size:14px;color:#0f766e;font-weight:600;">📍 Your Request Summary:</p>
    <p style="margin:0;font-size:14px;color:#475569;line-height:1.6;">
      <strong>Location:</strong> ${selectedCounty || 'N/A'}, ${selectedState || 'N/A'}<br/>
      <strong>Property:</strong> ${propertyAddress || 'N/A'}<br/>
      <strong>Situation:</strong> ${situation || 'Not specified'}<br/>
      <strong>Timeline:</strong> ${timeline || 'Not specified'}
    </p>
  </div>

  <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:20px;margin:24px 0;">
    <p style="margin:0 0 8px;font-size:14px;color:#c2410c;font-weight:600;">🏢 Estate Sale Companies Notified:</p>
    <p style="margin:0;font-size:15px;color:#475569;line-height:1.6;">
      We've identified <strong style="color:#f97316;font-size:18px;">${companyCount || 0}</strong> estate sale ${companyCount === 1 ? 'company' : 'companies'} in ${selectedCounty || 'your area'}, ${selectedState || 'N/A'} that may be able to help with your estate sale. ${companyCount > 0 ? 'You can expect to hear from them within 24-48 hours.' : 'We are actively expanding our network in your area and will work to connect you with available companies.'}
    </p>
  </div>

  <p style="font-size:15px;color:#475569;line-height:1.7;">If you have any questions in the meantime, feel free to reply to this email or visit EstateSalen.com for more resources.</p>
  
  <p style="font-size:15px;color:#475569;line-height:1.7;">We're here to make this transition as smooth as possible for you.</p>
  
  <p style="font-size:15px;color:#1e293b;line-height:1.7;margin-top:24px;">Warm regards,<br/><strong>The EstateSalen Team</strong></p>
</td></tr>
<tr><td style="background:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;text-align:center;">
  <p style="margin:0;font-size:13px;color:#64748b;">EstateSalen.com &nbsp;|&nbsp; Your Life Transition Partner</p>
  <p style="margin:4px 0 0;font-size:12px;color:#94a3b8;">This is an automated confirmation. Please do not reply directly to this email.</p>
</td></tr>
</table></td></tr></table>
</body></html>`;

        await base44.asServiceRole.integrations.Core.SendEmail({
          to: contactEmail,
          from_name: 'EstateSalen',
          subject: 'We Received Your Estate Sale Request!',
          body: leadEmailHtml
        });
      } catch (e) {
        console.error('Failed to send acknowledgment email to lead:', contactEmail, e);
      }
    }

    return Response.json({
      success: true,
      admins_notified: admins.length,
      lead_email_sent: !!contactEmail
    });
  } catch (error) {
    console.error('notifyWebsiteLead error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});