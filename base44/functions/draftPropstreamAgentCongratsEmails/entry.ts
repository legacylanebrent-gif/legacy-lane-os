import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ════════════════════════════════════════════════════════════
// PropStream Agent "Congrats on your new listing" Email Drafter
// Runs twice daily (9am / 9pm ET). Looks for PropStream agent
// leads imported in the last 12 hours, groups them by agent
// (one email per agent — multiple listings combined into one),
// and picks the email variant:
//   • FULL     — agent NOT contacted in the last 30 days
//   • REMINDER — agent already contacted in the last 30 days
// Drafts a personalized email, matches a reputable local
// operator, and pushes each draft to Customer.io (identify +
// track event) so a CIO campaign can blast the personalized
// email. Each send is logged to MarketingEventLog so future
// runs know who was contacted.
// ════════════════════════════════════════════════════════════

const EVENT_NAME = 'propstream_agent_new_listing_congrats';
const CONTACT_WINDOW_DAYS = 30;

// ────────────────────────────────────────────────────────────
// EMAIL COPY — editable. Swap in your own wording any time.
// ctx = { firstName, isMultiple, listingCount, cityList,
//         listingDetail, primaryCity, operatorLine }
// ────────────────────────────────────────────────────────────
const EMAIL_SUBJECT = (ctx) => {
  const prefix = ctx.variant === 'reminder' ? 'Following up — ' : '';
  const listingWord = ctx.isMultiple ? `${ctx.listingCount} new listings` : 'new listing';
  return `${prefix}Congrats on your ${listingWord} in ${ctx.primaryCity}!`;
};

const EMAIL_BODY_FULL = (ctx) => `Hi ${ctx.firstName},

Congratulations on your ${ctx.isMultiple ? `${ctx.listingCount} new listings` : 'new listing'} in ${ctx.cityList}${ctx.listingDetail} — great to see your business growing!

At EstateSalen, we partner with reputable estate sale companies across the country. We'd love to bridge you with a trusted operator who services ${ctx.primaryCity} — someone who can help your seller${ctx.isMultiple ? 's' : ''} with a full or partial estate sale, cleanout, or downsizing, and who can send referral business your way.
${ctx.operatorLine}

We also generate Territory and City leads every single day through EstateSalen.com — from estate sale companies listing on our platform, organic search traffic, and our paid ad campaigns. When a family in ${ctx.primaryCity} needs help, those leads come to us first, and we route them to the right local professionals.

If you'd like an introduction to a vetted operator in ${ctx.primaryCity} — or want to start receiving our local lead flow — just reply to this email.

Best,
The EstateSalen Team
estatesalen.com`;

const EMAIL_BODY_REMINDER = (ctx) => `Hi ${ctx.firstName},

Just a quick note — congrats on your ${ctx.isMultiple ? `${ctx.listingCount} new listings` : 'new listing'} in ${ctx.cityList}${ctx.listingDetail}!

As a reminder, EstateSalen links your sellers up with reputable estate sale companies for full or partial estate sales, cleanouts, and downsizing — and we can connect you with a vetted operator in ${ctx.primaryCity}.
${ctx.operatorLine}

We're still generating Territory and City leads daily through EstateSalen.com (operator listings, organic search, and paid ads) and routing them to the right local pros.

Want an intro to an operator in ${ctx.primaryCity}, or want to receive our local lead flow? Just reply to this email.

Best,
The EstateSalen Team
estatesalen.com`;

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

// Parse "123 Main St - $450000 (Austin, TX)" → { address, city, state }
function parsePropertyAddress(raw) {
  const out = { address: raw || '', city: '', state: '' };
  if (!raw) return out;
  const dashIdx = raw.indexOf(' - $');
  let addressPart = raw, rest = '';
  if (dashIdx >= 0) { addressPart = raw.slice(0, dashIdx); rest = raw.slice(dashIdx + 4); }
  out.address = addressPart.trim();
  const parenIdx = rest.lastIndexOf('(');
  if (parenIdx >= 0) {
    const inside = rest.slice(parenIdx + 1).replace(/\)$/, '').trim();
    const parts = inside.split(',').map(s => s.trim());
    out.city = parts[0] || '';
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

// Emails we already sent a congrats to in the last CONTACT_WINDOW_DAYS days
async function getContactedEmails(base44) {
  const since = new Date(Date.now() - CONTACT_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const contacted = new Set();
  const PAGE = 5000;
  let skip = 0;
  while (true) {
    const batch = await base44.asServiceRole.entities.MarketingEventLog.filter({ event_name: EVENT_NAME, status: 'sent' }, '-created_date', PAGE, skip);
    if (!batch || batch.length === 0) break;
    for (const e of batch) {
      if (e.consumer_email && new Date(e.created_date) >= since) {
        contacted.add(e.consumer_email.toLowerCase().trim());
      }
    }
    if (new Date(batch[batch.length - 1].created_date) < since) break;
    if (batch.length < PAGE) break;
    skip += PAGE;
  }
  return contacted;
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

    // 2. Group by agent email — one email per agent, all their listings combined
    const byAgent = new Map();
    let skipped = 0;
    for (const lead of newLeads) {
      const email = (lead.agent_email || '').toLowerCase().trim();
      if (!email) { skipped++; continue; }
      if (!byAgent.has(email)) byAgent.set(email, { email, agent_name: lead.agent_name, records: [], addresses: [] });
      const g = byAgent.get(email);
      g.records.push(lead);
      for (const addr of (lead.property_addresses || [])) {
        if (addr && !g.addresses.includes(addr)) g.addresses.push(addr);
      }
    }

    // 3. Who was already contacted in the last 30 days?
    const contactedEmails = await getContactedEmails(base44);

    const config = getCioConfig();
    const drafted = [];
    let sent = 0, failed = 0;

    for (const [, g] of byAgent) {
      const firstRecord = g.records[0];

      // Parse all listings for this agent
      let listings = g.addresses.map(parsePropertyAddress).filter(l => l.address);
      if (listings.length === 0) {
        listings = [{ address: '', city: firstRecord.territory_name || '', state: firstRecord.brokerage_state || firstRecord.state || '' }];
      }
      const isMultiple = listings.length >= 2;
      const listingCount = listings.length;

      const primaryCity = listings[0].city || firstRecord.territory_name || '';
      const primaryState = listings[0].state || firstRecord.brokerage_state || firstRecord.state || '';
      const primaryCityLabel = primaryCity || primaryState || 'your area';

      // cityList for "in {cityList}": primary city (or state / area)
      const cityList = primaryCityLabel;

      // listingDetail: single → " at 123 Main St"; multiple → ":\n\n• ..."
      let listingDetail = '';
      if (isMultiple) {
        listingDetail = ':\n\n' + listings.map(l => {
          const loc = [l.city, l.state].filter(Boolean).join(', ');
          return `• ${l.address}${loc ? ` — ${loc}` : ''}`;
        }).join('\n');
      } else if (listings[0].address) {
        listingDetail = ` at ${listings[0].address}`;
      }

      // 4. Variant: reminder if contacted in last 30 days, else full
      const variant = contactedEmails.has(g.email) ? 'reminder' : 'full';

      // 5. Match a reputable local operator
      const operator = await findOperatorForCity(base44, primaryCity, primaryState);
      const operatorLine = operator
        ? `\nWe have a vetted operator ready in ${primaryCityLabel}: ${operator.company_name}${operator.phone ? ` (${operator.phone})` : ''}. Reply "connect" and we'll make the introduction.`
        : `\nWe're actively building out our ${primaryCityLabel} operator network — reply "connect" and we'll match you with a vetted local operator.`;

      const ctx = {
        variant,
        firstName: firstNameOf(g.agent_name),
        isMultiple,
        listingCount,
        cityList,
        listingDetail,
        primaryCity: primaryCityLabel,
        operatorLine,
      };

      const subject = EMAIL_SUBJECT(ctx);
      const emailBody = variant === 'reminder' ? EMAIL_BODY_REMINDER(ctx) : EMAIL_BODY_FULL(ctx);

      const draft = {
        agent_email: g.email,
        agent_name: g.agent_name,
        variant,
        isMultiple,
        listingCount,
        listings: listings.map(l => ({ address: l.address, city: l.city, state: l.state })),
        primaryCity: primaryCityLabel,
        matched_operator: operator ? { id: operator.id, company_name: operator.company_name, phone: operator.phone } : null,
        email_subject: subject,
        email_body: emailBody,
      };
      drafted.push(draft);

      if (dryRun) continue;

      // 6. Push to Customer.io + log the send
      const userId = `propstream_agent:${g.email}`;
      let logStatus = 'sent';
      try {
        await cioIdentify(userId, g.email, {
          first_name: ctx.firstName,
          agent_name: g.agent_name,
          brokerage_name: firstRecord.brokerage_name || '',
          city: primaryCity, state: primaryState,
          source: 'propstream_agent_lead',
          updated_at: new Date().toISOString(),
        }, config);
        await cioTrack(userId, g.email, EVENT_NAME, {
          variant,
          agent_name: g.agent_name,
          listing_count: listingCount,
          listings: listings.map(l => ({ address: l.address, city: l.city, state: l.state })),
          primary_city: primaryCity,
          state: primaryState,
          matched_operator_name: operator?.company_name || '',
          matched_operator_phone: operator?.phone || '',
          email_subject: subject,
          email_body: emailBody,
        }, config);
        sent++;
      } catch (err) {
        console.error(`CIO send failed for ${g.email}: ${err.message}`);
        logStatus = 'failed';
        failed++;
      }

      // Log so future runs know this agent was contacted
      try {
        await base44.asServiceRole.entities.MarketingEventLog.create({
          event_name: EVENT_NAME,
          consumer_email: g.email,
          consumer_user_id: userId,
          payload_json: { variant, listing_count: listingCount, primary_city: primaryCity, state: primaryState, matched_operator_name: operator?.company_name || '' },
          provider: 'customerio',
          provider_response: { status: logStatus },
          status: logStatus,
          created_at: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error(`MarketingEventLog create failed for ${g.email}: ${logErr.message}`);
      }
    }

    return Response.json({
      success: true,
      window_hours: windowHours,
      new_lead_records: newLeads.length,
      unique_agents: byAgent.size,
      drafted: drafted.length,
      sent_to_customerio: sent,
      failed,
      skipped_no_email: skipped,
      dry_run: dryRun,
      drafts: dryRun
        ? drafted
        : drafted.map(d => ({ agent_email: d.agent_email, variant: d.variant, listings: d.listingCount, city: d.primaryCity, matched_operator: d.matched_operator?.company_name || null })),
    });
  } catch (error) {
    console.error('draftPropstreamAgentCongratsEmails error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});