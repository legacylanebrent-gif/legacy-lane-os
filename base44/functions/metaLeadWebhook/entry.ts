import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const VERIFY_TOKEN = Deno.env.get('META_LEADGEN_VERIFY_TOKEN');
const META_ACCESS_TOKEN = Deno.env.get('META_ACCESS_TOKEN');
const WEBHOOK_SECRET = Deno.env.get('META_LEADGEN_WEBHOOK_SECRET');

async function verifySignature(body, signatureHeader) {
  if (!WEBHOOK_SECRET || !signatureHeader) return false;
  const sig = signatureHeader.replace('sha256=', '');
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(WEBHOOK_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  const computed = Array.from(new Uint8Array(mac)).map(b => b.toString(16).padStart(2, '0')).join('');
  return computed === sig;
}

async function getLeadDetails(leadId) {
  if (!META_ACCESS_TOKEN) return null;
  const res = await fetch(`https://graph.facebook.com/v19.0/${leadId}?access_token=${META_ACCESS_TOKEN}`);
  return res.json();
}

Deno.serve(async (req) => {
  // GET: webhook verification
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('[metaLeadWebhook] Webhook verified');
      return new Response(challenge, { status: 200 });
    }
    return new Response('Forbidden', { status: 403 });
  }

  if (req.method !== 'POST') return Response.json({ error: 'Method Not Allowed' }, { status: 405 });

  const rawBody = await req.text();
  const signature = req.headers.get('x-hub-signature-256');
  const valid = await verifySignature(rawBody, signature);
  if (!valid && WEBHOOK_SECRET) {
    console.warn('[metaLeadWebhook] Invalid signature');
    return Response.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let payload;
  try { payload = JSON.parse(rawBody); } catch (_) { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const base44 = createClientFromRequest(req);
  const now = new Date().toISOString();
  const results = [];

  for (const entry of (payload.entry || [])) {
    for (const change of (entry.changes || [])) {
      if (change.field !== 'leadgen') continue;
      const { leadgen_id, campaign_id, ad_id, form_id } = change.value || {};

      // Get lead details from Meta
      const leadData = await getLeadDetails(leadgen_id);
      const fields = {};
      for (const f of (leadData?.field_data || [])) {
        fields[f.name] = Array.isArray(f.values) ? f.values[0] : f.values;
      }

      const fullName = fields['full_name'] || fields['name'] || '';
      const email = fields['email'] || '';
      const phone = fields['phone_number'] || fields['phone'] || '';
      const company = fields['company_name'] || fields['company'] || '';

      // Save lead import
      const lead = await base44.asServiceRole.entities.FacebookLeadImport.create({
        meta_lead_id: leadgen_id,
        campaign_id,
        ad_id,
        form_id,
        full_name: fullName,
        email,
        phone,
        company_name: company,
        raw_payload: leadData || {},
        lead_stage: 'new_facebook_lead',
        ai_response_status: 'not_started',
        admin_alert_status: 'not_sent',
        created_at: now,
      });

      // Also upsert into FutureOperatorLead
      await base44.asServiceRole.entities.FutureOperatorLead.create({
        owner_name: fullName,
        email,
        phone,
        company_name: company,
        source: 'facebook_lead_ad',
        lead_stage: 'facebook_lead',
        created_at: now,
        updated_at: now,
      });

      // Trigger admin alert
      await base44.asServiceRole.functions.invoke('sendFacebookLeadAdminAlert', { lead_import_id: lead.id });

      // Check settings for auto-response
      const settings = await base44.asServiceRole.entities.AdminAISettings.list('-created_date', 1);
      const s = settings[0] || {};
      if (s.allow_ai_lead_auto_response) {
        await base44.asServiceRole.functions.invoke('generateFacebookLeadAIResponse', { lead_import_id: lead.id, auto_send: true });
      } else {
        await base44.asServiceRole.functions.invoke('generateFacebookLeadAIResponse', { lead_import_id: lead.id, auto_send: false });
      }

      results.push({ lead_id: lead.id, name: fullName, email });
    }
  }

  console.log(`[metaLeadWebhook] Processed ${results.length} leads`);
  return Response.json({ success: true, leads_processed: results.length, results });
});