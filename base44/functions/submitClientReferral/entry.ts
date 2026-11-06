import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { buildAgentReferralEmail } from '../../shared/agentReferralEmail.ts';

const MAX_AGENTS = 20;
const SEND_BATCH = 5;

const TIMELINES = ['within_30_days', 'one_to_three_months', 'three_to_six_months', 'six_plus_months', 'unknown'];

function normCity(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function asList(result) {
  if (Array.isArray(result)) return result;
  if (result && Array.isArray(result.items)) return result.items;
  return [];
}

function b64(value) {
  return btoa(unescape(encodeURIComponent(String(value))));
}

function buildRawMessage({ from, to, subject, replyTo, text, html }) {
  const boundary = `b44_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  return [
    `From: EstateSalen <${from}>`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${b64(subject)}?=`,
    replyTo ? `Reply-To: ${replyTo}` : '',
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    b64(text),
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    b64(html),
    '',
    `--${boundary}--`,
  ].filter((line) => line !== null).join('\r\n');
}

// Agents "assigned to the city": directory agents whose listed city / geocoded
// city / service areas include it, plus approved agent territory applications
// that cover it. Deduplicated by email.
async function collectAgentsForCity(base44, city, state) {
  const cityKey = normCity(city);
  const stateKey = String(state || '').trim().toUpperCase();
  const found = new Map();

  const add = (name, email) => {
    const clean = String(email || '').trim().toLowerCase();
    if (!clean || !clean.includes('@')) return;
    if (!found.has(clean)) found.set(clean, { name: String(name || '').trim(), email: clean });
  };

  const directory = asList(
    await base44.asServiceRole.entities.RealEstateAgentDirectory.filter(
      stateKey ? { state: stateKey } : {},
      { limit: 2000 }
    )
  );
  for (const agent of directory) {
    if (stateKey && agent.state && String(agent.state).toUpperCase() !== stateKey) continue;
    const cities = [agent.city, agent.geocoded_city, ...(agent.service_areas || [])];
    if (!cities.some((value) => normCity(value) === cityKey)) continue;
    add(agent.agent_name, agent.email);
  }

  const applications = asList(
    await base44.asServiceRole.entities.AgentTerritoryApplication.filter({ status: 'approved' }, { limit: 1000 })
  );
  for (const application of applications) {
    const cities = [
      ...(application.territory_cities || []),
      ...String(application.cities_requested || '').split(/[,;]/),
    ];
    if (!cities.some((value) => normCity(value) === cityKey)) continue;
    add(application.name, application.email);
  }

  return [...found.values()];
}

async function getGmailSender(base44) {
  const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');
  // gmail.send does not grant profile reads, so the mailbox address comes from
  // the OAuth userinfo endpoint (email scope), which is the address Gmail accepts as From.
  const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(10000),
  });
  const profile = await profileRes.json();
  return { accessToken, fromEmail: profile?.email || '' };
}

async function sendAgentEmail({ accessToken, fromEmail, agent, lead, operatorName, operatorEmail }) {
  const { subject, html, text, replyTo } = buildAgentReferralEmail({
    agentName: agent.name,
    clientName: lead.client_name,
    clientEmail: lead.client_email,
    clientPhone: lead.client_phone,
    propertyAddress: lead.property_address,
    propertyCity: lead.property_city,
    propertyState: lead.property_state,
    propertyZip: lead.property_zip,
    county: lead.county,
    timeline: lead.timeline,
    needNotes: lead.need_notes,
    operatorName,
    operatorEmail,
  });

  const raw = buildRawMessage({
    from: fromEmail,
    to: agent.email,
    subject,
    replyTo: replyTo || operatorEmail,
    text,
    html,
  });

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: btoa(unescape(encodeURIComponent(raw))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    console.error(`submitClientReferral: Gmail send failed for ${agent.email} (${res.status}) ${detail.slice(0, 200)}`);
    return false;
  }
  return true;
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Sign in required' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const clientName = String(body.client_name || '').trim();
    const clientEmail = String(body.client_email || '').trim();
    const clientPhone = String(body.client_phone || '').trim();
    const propertyAddress = String(body.property_address || '').trim();
    const propertyCity = String(body.property_city || '').trim();
    const propertyState = String(body.property_state || '').trim().toUpperCase();
    const propertyZip = String(body.property_zip || '').trim();
    const county = String(body.county || '').trim();
    const needNotes = String(body.need_notes || '').trim();
    const timeline = TIMELINES.includes(body.timeline) ? body.timeline : 'unknown';
    const shareConsent = body.share_consent === true;

    if (!clientName || !propertyAddress || !propertyCity || !propertyState) {
      return Response.json({ error: 'Client name, property address, city and state are required.' }, { status: 400 });
    }
    if (!clientEmail && !clientPhone) {
      return Response.json({ error: 'Add a client email or phone so agents can reach them.' }, { status: 400 });
    }
    if (!shareConsent) {
      return Response.json({ error: 'Confirm the client agreed to share their information with agents.' }, { status: 400 });
    }

    const operatorName = user.full_name || user.email || 'An Estate Sale Company Owner';
    const now = new Date().toISOString();

    const lead = await base44.asServiceRole.entities.ReferralLead.create({
      lead_id: crypto.randomUUID(),
      property_address: propertyAddress,
      property_city: propertyCity,
      property_state: propertyState,
      property_zip: propertyZip,
      county,
      client_name: clientName,
      client_email: clientEmail,
      client_phone: clientPhone,
      source_user_id: user.id,
      source_type: 'Estate Sale Company Owner',
      source_channel: 'operator_form',
      submitted_by_name: operatorName,
      agent_lead: true,
      timeline,
      need_notes: needNotes,
      status: 'new',
      agent_notify_status: 'not_sent',
      agent_notified_count: 0,
    });

    let notified = 0;
    let notifyStatus = 'not_sent';
    let note = '';

    try {
      const agents = await collectAgentsForCity(base44, propertyCity, propertyState);

      if (agents.length === 0) {
        notifyStatus = 'no_agents';
        note = `No agents are listed as serving ${propertyCity}, ${propertyState}. The referral was saved.`;
      } else {
        const targets = agents.slice(0, MAX_AGENTS);
        const { accessToken, fromEmail } = await getGmailSender(base44);
        if (!accessToken || !fromEmail) throw new Error('The sending mailbox is not connected.');

        for (let i = 0; i < targets.length; i += SEND_BATCH) {
          const batch = targets.slice(i, i + SEND_BATCH);
          const results = await Promise.allSettled(
            batch.map((agent) =>
              sendAgentEmail({ accessToken, fromEmail, agent, lead, operatorName, operatorEmail: user.email })
            )
          );
          notified += results.filter((result) => result.status === 'fulfilled' && result.value === true).length;
        }

        if (notified === 0) {
          notifyStatus = 'failed';
          note = 'The referral was saved, but the agent notification could not be sent.';
        } else if (notified < agents.length) {
          notifyStatus = 'partial';
          note = `${notified} of ${agents.length} agents serving ${propertyCity} were notified.`;
        } else {
          notifyStatus = 'sent';
          note = `${notified} agent${notified === 1 ? '' : 's'} serving ${propertyCity} ${notified === 1 ? 'was' : 'were'} notified.`;
        }
      }
    } catch (notifyError) {
      notifyStatus = 'failed';
      note = 'The referral was saved, but the agent notification could not be sent.';
      console.error('submitClientReferral: notification error:', notifyError?.message);
    }

    await base44.asServiceRole.entities.ReferralLead.update(lead.id, {
      agent_notified_count: notified,
      agent_notified_at: now,
      agent_notify_status: notifyStatus,
      agent_notify_note: note,
    });

    return Response.json({
      ok: true,
      lead_id: lead.lead_id,
      agents_notified: notified,
      notify_status: notifyStatus,
      note,
    });
  } catch (error) {
    console.error('submitClientReferral error:', error?.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}