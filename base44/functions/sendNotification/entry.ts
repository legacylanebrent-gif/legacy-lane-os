import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { 
      user_id, 
      type, 
      title, 
      message, 
      link_to_page,
      link_params 
    } = await req.json();

    if (!user_id || !type || !title || !message) {
      return Response.json(
        { error: 'Missing required fields: user_id, type, title, message' },
        { status: 400 }
      );
    }

    // Get user preferences
    const preferences = await base44.asServiceRole.entities.NotificationPreference.filter({ 
      user_id 
    });

    const userPrefs = preferences.length > 0 ? preferences[0] : null;

    // Create in-app notification if enabled
    const shouldSendInApp = !userPrefs || userPrefs[`${type}_in_app`] !== false;
    let notificationId = null;

    if (shouldSendInApp) {
      const notification = await base44.asServiceRole.entities.Notification.create({
        user_id,
        type,
        title,
        message,
        link_to_page,
        link_params,
        read: false
      });
      notificationId = notification.id;
    }

    // Get user info for email/SMS
    const users = await base44.asServiceRole.entities.User.filter({ id: user_id });
    const user = users.length > 0 ? users[0] : null;

    // Send email if enabled
    const shouldSendEmail = userPrefs && userPrefs[`${type}_email`] === true;
    if (shouldSendEmail && user?.email) {
      try {
        const emailHtml = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
<tr><td style="background:linear-gradient(135deg,#1e293b 0%,#334155 100%);padding:28px 32px;text-align:center;">
  <div style="font-family:Georgia,serif;font-size:26px;font-weight:bold;color:#ffffff;letter-spacing:1px;">Legacy Lane</div>
  <div style="font-size:12px;color:#f97316;margin-top:4px;letter-spacing:2px;text-transform:uppercase;">OS Platform</div>
</td></tr>
<tr><td style="padding:36px 32px;">
  <h2 style="margin:0 0 16px 0;font-size:22px;color:#1e293b;font-family:Georgia,serif;">${title}</h2>
  <p style="margin:0 0 24px 0;font-size:15px;color:#475569;line-height:1.7;">Hi ${user.full_name || 'there'},</p>
  <p style="margin:0 0 24px 0;font-size:15px;color:#475569;line-height:1.7;">${message}</p>
  ${link_to_page ? `<div style="text-align:center;margin:28px 0;">
    <a href="https://app.legacylane.com/${link_to_page}" style="display:inline-block;background:#f97316;color:#ffffff;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:700;text-decoration:none;">View in Legacy Lane OS</a>
  </div>` : ''}
</td></tr>
<tr><td style="background:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;text-align:center;">
  <p style="margin:0 0 6px 0;font-size:13px;color:#64748b;">Legacy Lane OS &nbsp;|&nbsp; Referral Exchange Platform</p>
  <p style="margin:0;font-size:12px;color:#94a3b8;">This is an automated message. Please do not reply directly to this email.</p>
</td></tr>
</table></td></tr></table>
</body></html>`;

        await base44.asServiceRole.integrations.Core.SendEmail({
          to: user.email,
          from_name: 'Legacy Lane OS',
          subject: title,
          body: emailHtml
        });
      } catch (error) {
        console.error('Failed to send email:', error);
      }
    }

    // Send SMS if enabled (placeholder - requires SMS integration)
    const shouldSendSMS = userPrefs && userPrefs[`${type}_sms`] === true;
    if (shouldSendSMS && user?.phone) {
      // TODO: Implement SMS sending via Twilio or similar service
      console.log('SMS notification would be sent to:', user.phone);
    }

    return Response.json({ 
      success: true,
      notification_id: notificationId,
      channels_sent: {
        in_app: shouldSendInApp,
        email: shouldSendEmail,
        sms: shouldSendSMS
      }
    });

  } catch (error) {
    console.error('Error sending notification:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});