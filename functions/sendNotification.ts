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
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: user.email,
          subject: title,
          body: `${message}\n\nLog in to view more details: https://app.legacylane.com`
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