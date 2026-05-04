import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const META_ACCESS_TOKEN = Deno.env.get('META_ACCESS_TOKEN');
const META_AD_ACCOUNT_ID = Deno.env.get('META_AD_ACCOUNT_ID');

async function hashSHA256(value) {
  const normalized = value.trim().toLowerCase();
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return Response.json({ error: 'Method Not Allowed' }, { status: 405 });

  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user || user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

  // Check settings
  const settings = await base44.asServiceRole.entities.AdminAISettings.list('-created_date', 1);
  const s = settings[0] || {};
  if (!s.allow_meta_audience_sync) {
    return Response.json({ error: 'Meta audience sync is disabled in Admin Settings.' }, { status: 403 });
  }

  if (!META_ACCESS_TOKEN || !META_AD_ACCOUNT_ID) {
    return Response.json({ error: 'META_ACCESS_TOKEN and META_AD_ACCOUNT_ID secrets are not configured.' }, { status: 500 });
  }

  // Pull leads
  const leads = await base44.asServiceRole.entities.FutureOperatorLead.list('-created_at', 1000);
  if (leads.length === 0) return Response.json({ success: true, message: 'No leads to sync', synced: 0 });

  // Hash customer data per Meta requirements
  const users = [];
  for (const lead of leads) {
    const entry = {};
    if (lead.email) entry.EMAIL = await hashSHA256(lead.email);
    if (lead.phone) entry.PHONE = await hashSHA256(lead.phone.replace(/\D/g, ''));
    if (Object.keys(entry).length > 0) users.push(entry);
  }

  // Check if audience already exists
  const audienceName = 'Legacy Lane Future Operators';
  let audienceId = leads.find(l => l.meta_custom_audience_id)?.meta_custom_audience_id;

  if (!audienceId) {
    // Create new custom audience
    const createRes = await fetch(`https://graph.facebook.com/v19.0/${META_AD_ACCOUNT_ID}/customaudiences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: audienceName,
        subtype: 'CUSTOM',
        description: 'Legacy Lane OS Future Operator leads for targeting',
        customer_file_source: 'USER_PROVIDED_ONLY',
        access_token: META_ACCESS_TOKEN,
      }),
    });
    const createData = await createRes.json();
    if (createData.error) return Response.json({ error: 'Meta API error: ' + createData.error.message }, { status: 500 });
    audienceId = createData.id;
  }

  // Add users to audience
  const addRes = await fetch(`https://graph.facebook.com/v19.0/${audienceId}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      payload: { schema: ['EMAIL', 'PHONE'], data: users.map(u => [u.EMAIL || '', u.PHONE || '']) },
      access_token: META_ACCESS_TOKEN,
    }),
  });
  const addData = await addRes.json();
  if (addData.error) return Response.json({ error: 'Meta sync error: ' + addData.error.message }, { status: 500 });

  // Update lead records
  const now = new Date().toISOString();
  for (const lead of leads) {
    await base44.asServiceRole.entities.FutureOperatorLead.update(lead.id, {
      audience_sync_status: 'synced',
      meta_custom_audience_id: audienceId,
      last_synced_at: now,
    });
  }

  console.log(`[syncFutureOperatorCustomAudience] Synced ${users.length} users to audience ${audienceId}`);
  return Response.json({ success: true, audience_id: audienceId, synced: users.length, audience_name: audienceName });
});