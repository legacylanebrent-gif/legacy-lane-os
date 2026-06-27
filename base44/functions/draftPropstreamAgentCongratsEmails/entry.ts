import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ════════════════════════════════════════════════════════════
// PropStream Agent "Congrats on your new listing" — DRAFT ONLY
// Runs twice daily (9am / 9pm ET). Looks for PropStream agent
// leads imported in the last 12 hours, groups them by agent
// (one draft per agent — multiple listings combined), picks the
// variant (full vs reminder based on prior SENT drafts in the
// last 30 days), and stores each as a DRAFT in
// PropstreamAgentEmailDraft. It does NOT send anything.
// An admin reviews the drafts and clicks "Send to Customer.io"
// (see sendPropstreamAgentEmailDraft) — no auto-blasting.
// ════════════════════════════════════════════════════════════

const CONTACT_WINDOW_DAYS = 30;

// ────────────────────────────────────────────────────────────
// EMAIL COPY — editable. Swap in your own wording any time.
// ctx = { firstName, isMultiple, listingCount, cityList,
//         listingDetail, primaryCity, operatorLine, variant }
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

// ── helpers ──
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

// Agents we already SENT a congrats to in the last 30 days (from the draft table)
async function getContactedEmails(base44) {
  const since = new Date(Date.now() - CONTACT_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const contacted = new Set();
  const PAGE = 5000;
  let skip = 0;
  while (true) {
    const batch = await base44.asServiceRole.entities.PropstreamAgentEmailDraft.filter({ status: 'sent' }, '-created_date', PAGE, skip);
    if (!batch || batch.length === 0) break;
    for (const d of batch) {
      const when = d.sent_at ? new Date(d.sent_at) : new Date(d.created_date);
      if (when >= since && d.agent_email) contacted.add(d.agent_email.toLowerCase().trim());
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

    // 2. Group by agent email — one draft per agent, all their listings combined
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

    // 3. Who was already contacted (sent a draft) in the last 30 days?
    const contactedEmails = await getContactedEmails(base44);

    let created = 0, updated = 0;
    const preview = [];

    for (const [, g] of byAgent) {
      const firstRecord = g.records[0];

      let listings = g.addresses.map(parsePropertyAddress).filter(l => l.address);
      if (listings.length === 0) {
        listings = [{ address: '', city: firstRecord.territory_name || '', state: firstRecord.brokerage_state || firstRecord.state || '' }];
      }

      // Merge with any existing UNSent draft for this agent (one pending draft per agent)
      let existingId = null;
      const existing = await base44.asServiceRole.entities.PropstreamAgentEmailDraft.filter({ agent_email: g.email, status: 'draft' }, '-created_date', 1);
      if (existing && existing.length > 0) {
        existingId = existing[0].id;
        const existingAddrs = new Set((existing[0].listings || []).map(l => l.address));
        listings = [...(existing[0].listings || []), ...listings.filter(l => !existingAddrs.has(l.address))];
      }

      const isMultiple = listings.length >= 2;
      const listingCount = listings.length;
      const primaryCity = listings[0].city || firstRecord.territory_name || '';
      const primaryState = listings[0].state || firstRecord.brokerage_state || firstRecord.state || '';
      const primaryCityLabel = primaryCity || primaryState || 'your area';
      const cityList = primaryCityLabel;

      let listingDetail = '';
      if (isMultiple) {
        listingDetail = ':\n\n' + listings.map(l => {
          const loc = [l.city, l.state].filter(Boolean).join(', ');
          return `• ${l.address}${loc ? ` — ${loc}` : ''}`;
        }).join('\n');
      } else if (listings[0].address) {
        listingDetail = ` at ${listings[0].address}`;
      }

      const variant = contactedEmails.has(g.email) ? 'reminder' : 'full';

      const operator = await findOperatorForCity(base44, primaryCity, primaryState);
      const operatorLine = operator
        ? `\nWe have a vetted operator ready in ${primaryCityLabel}: ${operator.company_name}${operator.phone ? ` (${operator.phone})` : ''}. Reply "connect" and we'll make the introduction.`
        : `\nWe're actively building out our ${primaryCityLabel} operator network — reply "connect" and we'll match you with a vetted local operator.`;

      const ctx = { variant, firstName: firstNameOf(g.agent_name), isMultiple, listingCount, cityList, listingDetail, primaryCity: primaryCityLabel, operatorLine };
      const subject = EMAIL_SUBJECT(ctx);
      const emailBody = variant === 'reminder' ? EMAIL_BODY_REMINDER(ctx) : EMAIL_BODY_FULL(ctx);

      const draftData = {
        agent_email: g.email,
        agent_name: g.agent_name,
        variant,
        is_multiple: isMultiple,
        listing_count: listingCount,
        listings: listings.map(l => ({ address: l.address, city: l.city, state: l.state })),
        primary_city: primaryCityLabel,
        state: primaryState,
        matched_operator_id: operator?.id || '',
        matched_operator_name: operator?.company_name || '',
        matched_operator_phone: operator?.phone || '',
        email_subject: subject,
        email_body: emailBody,
        status: 'draft',
      };

      if (dryRun) {
        preview.push({ agent_email: g.email, variant, is_multiple: isMultiple, listing_count: listingCount, primary_city: primaryCityLabel, matched_operator: operator?.company_name || null, email_subject: subject });
        continue;
      }

      if (existingId) {
        await base44.asServiceRole.entities.PropstreamAgentEmailDraft.update(existingId, draftData);
        updated++;
      } else {
        await base44.asServiceRole.entities.PropstreamAgentEmailDraft.create(draftData);
        created++;
      }
    }

    return Response.json({
      success: true,
      window_hours: windowHours,
      new_lead_records: newLeads.length,
      unique_agents: byAgent.size,
      drafts_created: created,
      drafts_updated: updated,
      skipped_no_email: skipped,
      dry_run: dryRun,
      drafts: dryRun ? preview : undefined,
    });
  } catch (error) {
    console.error('draftPropstreamAgentCongratsEmails error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});