import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ADMIN_EMAIL = Deno.env.get('LEGACY_LANE_ADMIN_ALERT_EMAIL');
const TWILIO_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
const TWILIO_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
const TWILIO_FROM = Deno.env.get('TWILIO_FROM_NUMBER');

Deno.serve(async (req) => {
  if (req.method !== 'POST') return Response.json({ error: 'Method Not Allowed' }, { status: 405 });

  const base44 = createClientFromRequest(req);
  const { lead_import_id } = await req.json();
  if (!lead_import_id) return Response.json({ error: 'lead_import_id required' }, { status: 400 });

  const leads = await base44.asServiceRole.entities.FacebookLeadImport.list('-created_at', 200);
  const lead = leads.find(l => l.id === lead_import_id);
  if (!lead) return Response.json({ error: 'Lead not found' }, { status: 404 });

  const subject = `🎯 New Facebook Lead — Legacy Lane OS`;
  const body = `
New Facebook Lead Received

Name: ${lead.full_name || 'Unknown'}
Email: ${lead.email || 'Not provided'}
Phone: ${lead.phone || 'Not provided'}
Company: ${lead.company_name || 'Not provided'}
Campaign ID: ${lead.campaign_id || 'N/A'}
Source: Facebook Lead Ad
Received: ${lead.created_at}

Suggested Next Action:
1. Log in to Legacy Lane OS Admin
2. Review the lead in the Facebook Ads Autopilot tab
3. Approve and send the AI-drafted response

— Legacy Lane OS Automation
  `.trim();

  const results = {};

  // Send email alert
  if (ADMIN_EMAIL) {
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: ADMIN_EMAIL,
        subject,
        body,
        from_name: 'Legacy Lane OS',
      });
      results.email = 'sent';
    } catch (e) {
      results.email = 'failed: ' + e.message;
    }
  } else {
    results.email = 'skipped (no LEGACY_LANE_ADMIN_ALERT_EMAIL configured)';
  }

  // Send SMS via Twilio
  if (TWILIO_SID && TWILIO_TOKEN && TWILIO_FROM && ADMIN_EMAIL) {
    // Try to get admin phone from settings
    const settings = await base44.asServiceRole.entities.AdminAISettings.list('-created_date', 1);
    const adminPhone = settings[0]?.admin_alert_phone;
    if (adminPhone) {
      try {
        const smsBody = `Legacy Lane OS: New Facebook Lead — ${lead.full_name || 'Unknown'} (${lead.email || lead.phone || 'No contact'}). Check Admin dashboard.`;
        const twilioRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({ From: TWILIO_FROM, To: adminPhone, Body: smsBody }),
        });
        const smsData = await twilioRes.json();
        results.sms = smsData.sid ? 'sent' : ('failed: ' + smsData.message);
      } catch (e) {
        results.sms = 'failed: ' + e.message;
      }
    } else {
      results.sms = 'skipped (no admin_alert_phone in settings)';
    }
  }

  // Update alert status
  await base44.asServiceRole.entities.FacebookLeadImport.update(lead_import_id, {
    admin_alert_status: results.email === 'sent' ? 'sent' : 'failed',
  });

  console.log(`[sendFacebookLeadAdminAlert] Lead ${lead_import_id}: email=${results.email}`);
  return Response.json({ success: true, results });
});