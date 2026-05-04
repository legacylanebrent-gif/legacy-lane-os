import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import OpenAI from 'npm:openai';

const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });
const TWILIO_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
const TWILIO_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
const TWILIO_FROM = Deno.env.get('TWILIO_FROM_NUMBER');

Deno.serve(async (req) => {
  if (req.method !== 'POST') return Response.json({ error: 'Method Not Allowed' }, { status: 405 });

  const base44 = createClientFromRequest(req);
  const { lead_import_id, auto_send } = await req.json();
  if (!lead_import_id) return Response.json({ error: 'lead_import_id required' }, { status: 400 });

  const leads = await base44.asServiceRole.entities.FacebookLeadImport.list('-created_at', 200);
  const lead = leads.find(l => l.id === lead_import_id);
  if (!lead) return Response.json({ error: 'Lead not found' }, { status: 404 });

  const prompt = `You are a friendly business development representative for Legacy Lane OS, an estate sale business management platform.

A new prospect submitted a Facebook Lead Ad form. Draft a personalized, warm follow-up email response.

Lead Info:
- Name: ${lead.full_name || 'there'}
- Company: ${lead.company_name || 'their estate sale company'}
- Email: ${lead.email}
- Phone: ${lead.phone}

Instructions:
- Be warm, professional, and direct
- Mention Legacy Lane OS by name
- Focus on business growth, automation, and the referral partnership program
- Invite them to schedule a demo call
- Do NOT make guarantees about income, referral fees, or commissions
- Do NOT imply they will definitely qualify for any program
- Keep it under 200 words
- Sign off as "The Legacy Lane OS Team"

Return a JSON object:
{
  "subject": string,
  "email_body": string,
  "sms_draft": string (under 160 chars)
}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
  });

  const draft = JSON.parse(response.choices[0].message.content);
  const now = new Date().toISOString();

  await base44.asServiceRole.entities.FacebookLeadImport.update(lead_import_id, {
    ai_response_draft: JSON.stringify(draft),
    ai_response_status: auto_send ? 'not_started' : 'draft_ready',
  });

  // Auto-send if enabled and we have contact info
  let sent = false;
  if (auto_send && lead.email) {
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: lead.email,
        subject: draft.subject,
        body: draft.email_body,
        from_name: 'Legacy Lane OS',
      });
      await base44.asServiceRole.entities.FacebookLeadImport.update(lead_import_id, { ai_response_status: 'sent' });
      sent = true;
    } catch (e) {
      console.error('[generateFacebookLeadAIResponse] Email send failed:', e.message);
      await base44.asServiceRole.entities.FacebookLeadImport.update(lead_import_id, { ai_response_status: 'failed' });
    }
  }

  // Auto SMS if enabled and Twilio configured
  if (auto_send && lead.phone && TWILIO_SID && TWILIO_TOKEN && TWILIO_FROM) {
    try {
      await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ From: TWILIO_FROM, To: lead.phone, Body: draft.sms_draft }),
      });
    } catch (e) {
      console.error('[generateFacebookLeadAIResponse] SMS send failed:', e.message);
    }
  }

  console.log(`[generateFacebookLeadAIResponse] Lead ${lead_import_id}: draft ready, auto_sent=${sent}`);
  return Response.json({ success: true, draft, auto_sent: sent });
});