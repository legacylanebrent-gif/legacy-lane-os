import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ════════════════════════════════════════════════════════════
// PropStream Agent "Congrats on your new listing" Email Drafter
// Runs twice daily (9am / 9pm ET). Looks for PropStream agent
// leads imported in the last 12 hours, drafts a personalized
// congrats email, matches a reputable local operator, and pushes
// each draft to Customer.io (identify + track event) so a CIO
// campaign can blast the personalized email.
// ════════════════════════════════════════════════════════════

// ────────────────────────────────────────────────────────────
// EMAIL COPY — editable. Swap in your own wording any time.
// `ctx` = { firstName, listingAddress, city, state, operatorLine }
// ────────────────────────────────────────────────────────────
const EMAIL_SUBJECT = (ctx) => `Congrats on your new listing in ${ctx.city}!`;

const EMAIL_BODY = (ctx) => `Hi ${ctx.firstName},

Congratulations on your new listing${ctx.listingAddress ? ` at ${ctx.listingAddress}` : ''} in ${ctx.city}, ${ctx.state} — great to see your business growing!

At EstateSalen, we partner with reputable estate sale companies across the country. We'd love to bridge you with a trusted operator who services ${ctx.city} — someone who can help your seller with a full or partial estate sale, cleanout, or downsizing, and who can send referral business your way.
${ctx.operatorLine}

We also generate Territory and City leads every single day through EstateSalen.com — from estate sale companies listing on our platform, organic search traffic, and our paid ad campaigns. When a family in ${ctx.city} needs help, those leads come to us first, and we route them to the right local professionals.

If you'd like an introduction to a vetted operator in ${ctx.city} — or want to start receiving our local lead flow — just reply to this email.

Best,
The EstateSalen Team
estatesalen.com`;

const EVENT_NAME = 'propstream_agent_new_listing_congrats';

// ── Customer.io (Pipelines / CDP) helpers ──
function getCioConfig() {
  return {
    enabled: Deno.env.get('CUSTOMERIO_ENABLED') === 'true',
    pipelinesWriteKey: Deno.env.get('CUSTOMERIO_PIPELINES_WRITE_KEY') || '',
  };
}

async function cioIdentify(userId, email, traits, config) {
  if (!config.enabled || !config.pipelinesWriteKey) return { skipped: true };
  const res = await fetch('https://cdp.customer.io/v1/identify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${btoa(config.pipelinesWriteKey + ':')}` },
    body: JSON.stringify({ userId, traits: { email, ...traits } }),
  });
  if (!res.ok) throw new Error(`CIO identify failed ${res.status}: ${await res.text()}`);
  return { sent: true };
}

async function cioTrack(userId, email, eventName, data, config) {
  if (!config.enabled || !config.pipelinesWriteKey) return { skipped: true };
  const res = await fetch('https://cdp.customer.io/v1/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${btoa(config.pipelinesWriteKey + ':')}` },
    body: JSON.stringify({ userId: userId || email, event: eventName, properties: { ...data, triggered_at: new Date().toISOString() } }),
  });
  if (!res.ok) throw new Error(`CIO track failed ${res.status}: ${await res.text()}`);
  return { sent: true };
}

// Parse "123 Main St - $450000 (Austin, TX)" → { address, territory, state }
function parsePropertyAddress(raw) {
  const out = { address: raw || '', territory: '', state: '' };
  if (!raw) return out;
  const dashIdx = raw.indexOf(' - $');
  let addressPart = raw, rest = '';
  if (dashIdx >= 0) { addressPart = raw.slice(0, dashIdx); rest = raw.slice(dashIdx + 4); }
  out.address = addressPart.trim();
  const parenIdx = rest.lastIndexOf('(');
  if (parenIdx >= 0) {
    const inside = rest.slice(parenIdx + 1).replace(/\)$/, '').trim();
    const parts = inside.split(',').map(s => s.trim());
    out.territory = parts[0] || '';
    out.state = parts[1] || '';
  }
  return out;
}

function firstNameOf(full) {
  if (!full) return 'there';
  return full.trim().split(/\s+/)[0];
}

// Find a reputable operator servicing the listing city
async function findOperatorForCity(base44, city, state) {
  if (!state) return null;
  const candidates = await base44.asServiceRole.entities.MasterOperatorDirectory.filter({ state }, '-sales_posted', 500);
  if (!candidates || candidates.length === 0) return null;
  const tierRank = { elite: 4, platinum: 3, basic: 2, unknown: 1 };
  const cityLower = (city || '').toLowerCase();
  const inCity = cityLower
    ? candidates.filter(o =>
        (o.service_area_cities || []).some(c => c.toLowerCase() === cityLower) ||
        (o.city || '').toLowerCase() === cityLower ||
        (o.geocoded_city || '').toLowerCase() === cityLower)
    : [];
  const pool = inCity.length > 0 ? inCity : candidates;
  pool.sort((a, b) => (tierRank[b.membership_tier] || 0) - (tierRank[a.membership_tier] || 0) || (b.sales_posted || 0) - (a.sales_posted || 0));
  return pool[0];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const windowHours = body.window_hours || 12;
    const dryRun = body.dry_run === true;

    const since = new Date(Date.now() - windowHours * 60 * 60 * 1000);

    // 1. New PropStream agent leads imported in the window (paginated, newest-first, early stop)
    const newLeads = [];
    const PAGE = 5000;
    let skip = 0;
    while (true) {
      const batch = await base44.asServiceRole.entities.PropstreamAgentLead.filter({}, '-created_date', PAGE, skip);
      if (!batch || batch.length === 0) break;
      for (const l of batch) {
        if (new Date(l.created_date) >= since) newLeads.push(l);
      }
      if (new Date(batch[batch.length - 1].created_date) < since) break;
      if (batch.length < PAGE) break;
      skip += PAGE;
    }

    if (newLeads.length === 0) {
      return Response.json({ success: true, message: `No new PropStream agent leads in the last ${windowHours}h`, drafted: 0 });
    }

    const config = getCioConfig();
    const drafted = [];
    let sent = 0, failed = 0, skipped = 0;

    for (const lead of newLeads) {
      if (!lead.agent_email) { skipped++; continue; }

      const firstAddrRaw = (lead.property_addresses && lead.property_addresses[0]) || '';
      const parsed = parsePropertyAddress(firstAddrRaw);
      const city = lead.territory_name || parsed.territory || '';
      const state = lead.brokerage_state || parsed.state || lead.state || '';
      const listingAddress = parsed.address || '';

      const operator = await findOperatorForCity(base44, city, state);
      const operatorLine = operator
        ? `\nWe have a vetted operator ready in ${city || state}: ${operator.company_name}${operator.phone ? ` (${operator.phone})` : ''}. Reply "connect" and we'll make the introduction.`
        : `\nWe're actively building out our ${city || state} operator network — reply "connect" and we'll match you with a vetted local operator.`;

      const ctx = {
        firstName: firstNameOf(lead.agent_name),
        listingAddress,
        city: city || state || 'your area',
        state,
        operatorLine,
      };

      const subject = EMAIL_SUBJECT(ctx);
      const emailBody = EMAIL_BODY(ctx);

      drafted.push({
        agent_lead_id: lead.id,
        agent_name: lead.agent_name,
        agent_email: lead.agent_email,
        city, state, listingAddress,
        matched_operator: operator ? { id: operator.id, company_name: operator.company_name, phone: operator.phone } : null,
        email_subject: subject,
        email_body: emailBody,
      });

      if (dryRun) continue;

      // 2. Push to Customer.io: identify the agent, then track the congrats event with the composed email
      try {
        const userId = `propstream_agent:${lead.id}`;
        await cioIdentify(userId, lead.agent_email, {
          first_name: ctx.firstName,
          agent_name: lead.agent_name,
          brokerage_name: lead.brokerage_name || '',
          city, state,
          source: 'propstream_agent_lead',
          updated_at: new Date().toISOString(),
        }, config);
        await cioTrack(userId, lead.agent_email, EVENT_NAME, {
          agent_name: lead.agent_name,
          listing_address: listingAddress,
          city, state,
          matched_operator_name: operator?.company_name || '',
          matched_operator_phone: operator?.phone || '',
          email_subject: subject,
          email_body: emailBody,
        }, config);
        sent++;
      } catch (err) {
        console.error(`CIO send failed for ${lead.agent_email}: ${err.message}`);
        failed++;
      }
    }

    return Response.json({
      success: true,
      window_hours: windowHours,
      new_leads_found: newLeads.length,
      drafted: drafted.length,
      sent_to_customerio: sent,
      failed,
      skipped,
      dry_run: dryRun,
      drafts: dryRun
        ? drafted
        : drafted.map(d => ({ agent_email: d.agent_email, city: d.city, matched_operator: d.matched_operator?.company_name || null })),
    });
  } catch (error) {
    console.error('draftPropstreamAgentCongratsEmails error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});