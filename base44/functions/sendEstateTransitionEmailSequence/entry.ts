import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const FROM_EMAIL = 'EstateSalen <hello@estatesalen.com>';
const BASE_URL = 'https://www.estatesalen.com';

const DISCLAIMER = `
---
This email is for educational purposes only. EstateSalen does not provide legal, tax, or financial advice.
For legal questions about probate, estate taxes, or property transfer, please consult a licensed attorney in your state.
Unsubscribe | EstateSalen.com
`;

function firstName(lead) {
  return lead.first_name || 'there';
}

function buildEmails(lead) {
  const name = firstName(lead);
  const state = lead.state || 'your state';
  const hasRealEstate = lead.has_real_estate;
  const needsEstateSale = lead.needs_estate_sale;
  const needsCleanout = lead.needs_cleanout;
  const needsRealtor = lead.needs_realtor;
  const wantsCash = lead.wants_cash_offer;

  // Build personalized CTA based on lead data
  const primaryCTA = needsEstateSale
    ? `Find an estate sale company in ${state}: ${BASE_URL}/estate-sale-companies`
    : hasRealEstate && (needsRealtor || wantsCash)
      ? `Find a probate-friendly realtor in ${state}: ${BASE_URL}/probate-realtors`
      : `Use our free estate settlement planner: ${BASE_URL}/estate-settlement-planner`;

  return [
    // ── Email 1: Checklist ──
    {
      delay_days: 0,
      subject: 'Your Estate Settlement Checklist',
      body: `Hi ${name},

Thank you for reaching out. Settling an estate — whether it's yours, a loved one's, or one you've inherited — can feel overwhelming. We're here to make it practical, step by step.

Here are your next practical steps:

1. SECURE THE PROPERTY
   Lock the home, collect keys from family members, and cancel or forward mail.

2. LOCATE IMPORTANT DOCUMENTS
   Will, trust documents, deed to property, financial accounts, insurance policies, and government IDs.

3. NOTIFY THE RIGHT PEOPLE
   Bank, Social Security, pension providers, insurance companies, and the post office.

4. UNDERSTAND WHAT YOU HAVE
   Walk through the property and take photos of all rooms. Note valuables, furniture, collections, jewelry, and vehicles.

5. DECIDE WHO WILL HELP
   Executor, attorney, estate sale company, realtor, and cleanout crew — not everyone needs all of these.

Your free estate settlement checklist: ${BASE_URL}/estate-checklist
Your personalized planner: ${BASE_URL}/estate-settlement-planner

${primaryCTA}

We'll send you a few more practical guides over the coming days.

The EstateSalen Team
${DISCLAIMER}`,
    },

    // ── Email 2: Documents and Sorting ──
    {
      delay_days: 2,
      subject: 'The first things to organize before selling estate contents',
      body: `Hi ${name},

Before you hold an estate sale or start cleaning out the home, a little preparation goes a long way.

DOCUMENTS TO FIND FIRST
- The will (or trust document) — this determines who has authority
- Property deed — needed if there's a house involved
- Vehicle titles — cars require title transfer
- Insurance policies — some items may be covered
- Account statements — these help identify assets

TAKE PHOTOS BEFORE ANYTHING MOVES
Walk every room with your phone. Photograph:
- Every room from multiple angles
- All jewelry, silver, and valuables
- Antiques, art, and collectibles
- Collections (coins, stamps, figurines, vintage items)
- Any items with brand names, maker's marks, or labels

This protects you legally and helps estate sale professionals price items accurately.

FAMILY COMMUNICATION
Decide early: will family members be allowed to take personal items before the sale? Document everything in writing to avoid disputes.

ITEM SORTING CATEGORIES
- Keep (sentimental, needed by heirs)
- Sell (estate sale or online)
- Donate (furniture, clothing, household goods)
- Discard (damaged, hazardous, or unwanted)
- Appraise (anything potentially high-value)

How to identify what's valuable at an estate sale: ${BASE_URL}/items
Free identification and value guides: ${BASE_URL}/learn

${primaryCTA}

The EstateSalen Team
${DISCLAIMER}`,
    },

    // ── Email 3: Keep, Sell, Donate, Clean Out ──
    {
      delay_days: 4,
      subject: 'Should you keep, sell, donate, or clean out the home?',
      body: `Hi ${name},

One of the most common questions families ask: "What do we do with everything?"

Here's a practical framework:

KEEP
Sentimental items, family heirlooms, items heirs want. Make a list — first come, first served creates conflict. Consider a family meeting.

SELL — Estate Sale
Best for: homes with significant furniture, collectibles, antiques, kitchenware, tools, jewelry, or personal property.
An estate sale company handles pricing, setup, advertising, and the sale weekend. They typically take a commission of the proceeds.
${needsEstateSale ? `We can connect you with estate sale companies in ${state}: ${BASE_URL}/estate-sale-companies` : `Find estate sale companies near you: ${BASE_URL}/estate-sale-companies`}

SELL — Online
Valuable items (coins, art, vintage collectibles) may sell for more on eBay, Facebook Marketplace, or specialty auction houses. Estate sale companies often handle this too.

DONATE
Furniture, clothing, household goods, and books can go to Habitat for Humanity ReStores, Goodwill, local churches, or veterans' organizations. Some will pick up for free.

CLEANOUT
After a sale or donation, what remains typically goes to a junk removal or estate cleanout company. They haul everything that's left.
${needsCleanout ? `We can match you with cleanout vendors in ${state}: ${BASE_URL}/estate-sale-companies` : ''}

WHAT NOT TO DO
Don't throw away what might be valuable. Don't give everything away before a professional walk-through. Don't rush — mistakes are costly.

The EstateSalen Team
${DISCLAIMER}`,
    },

    // ── Email 4: Real Estate Planning ──
    {
      delay_days: 7,
      subject: 'If there is a house involved, start planning early',
      body: `Hi ${name},

${hasRealEstate ? `You mentioned there's a property involved. Here's what you need to know.` : `Many estate situations involve a property. Even if you're not sure yet, here's what to think about.`}

BEFORE YOU LIST THE HOUSE
1. Complete probate or confirm authority to sell
2. Clear the contents (estate sale or cleanout first)
3. Address obvious repairs or deferred maintenance
4. Get a property valuation — not just a Zillow estimate

YOUR OPTIONS

Option A: Traditional Listing with a Realtor
Best when the property is in good condition and you have time. A probate-friendly realtor understands the paperwork, timelines, and court requirements (where applicable).
${needsRealtor ? `Find a probate realtor in ${state}: ${BASE_URL}/probate-realtors` : `Browse probate realtors: ${BASE_URL}/probate-realtors`}

Option B: Cash Offer from an Investor
Best when the property needs repairs, you want to close quickly, or you want to avoid showings and open houses.
${wantsCash ? `Request a cash offer for the property: ${BASE_URL}/estate-settlement-planner` : `Learn about investor offers: ${BASE_URL}/inherited-property`}

Option C: Sell As-Is
Some realtors specialize in as-is estate sales. The price may be lower, but the process is simpler.

TIMING MATTERS
If there's a mortgage on the property, carrying costs (mortgage, taxes, insurance, utilities) add up fast. The sooner the property is addressed, the better.

Inherited home guide: ${BASE_URL}/inherited-property
Probate real estate guide for ${state}: ${BASE_URL}/probate

The EstateSalen Team
${DISCLAIMER}`,
    },

    // ── Email 5: Provider Match ──
    {
      delay_days: 10,
      subject: 'Need help finding an estate sale company or probate-friendly agent?',
      body: `Hi ${name},

By now, you may have a clearer picture of what you need. Here's how we can connect you with the right professionals in ${state}.

ESTATE SALE COMPANIES
We work with vetted estate sale operators who specialize in probate, inherited homes, and downsizing situations. They handle setup, pricing, advertising, the sale, and cleanup.
${BASE_URL}/estate-sale-companies

PROBATE-FRIENDLY REALTORS
These agents understand probate timelines, court approvals (where required), and inherited property paperwork. They can also coordinate with the estate sale process.
${BASE_URL}/probate-realtors

CLEANOUT AND JUNK REMOVAL
If you need the home cleared after the sale, or if an estate sale isn't the right fit, cleanout vendors can remove everything quickly and responsibly.
${BASE_URL}/estate-cleanout

INVESTOR CASH OFFERS
If speed matters more than top dollar, investor buyers can close in days without inspections, repairs, or showings.
${BASE_URL}/estate-settlement-planner

To get matched with providers in your area, use our estate settlement planner — it takes about 3 minutes:
${BASE_URL}/estate-settlement-planner

The EstateSalen Team
${DISCLAIMER}`,
    },

    // ── Email 6: Realtor vs Investor ──
    {
      delay_days: 14,
      subject: 'Would a realtor sale or investor offer make more sense?',
      body: `Hi ${name},

If there's a property involved in this estate, you'll eventually face this question: should you list it with a realtor, or accept a cash offer from an investor?

Here's an honest comparison:

REALTOR LISTING
✓ Typically gets the highest sale price
✓ Access to the MLS and broad buyer pool
✓ Good for properties in decent condition
✓ Works well when you have 60-90+ days
✗ Requires showings, staging, negotiations
✗ Subject to buyer financing falling through
✗ May require repairs before listing

INVESTOR / CASH OFFER
✓ Close in 7-21 days
✓ No repairs, no showings, no contingencies
✓ Ideal when property needs significant work
✓ Works well for out-of-state heirs who can't manage the process
✗ Typically 10-20% below market value
✗ Fewer protections for seller

THE HYBRID APPROACH
Some families do an estate sale first (clear the contents, generate cash), then list the empty property. The empty home often shows better and sells faster.

WHAT WE RECOMMEND
If you have time and the property is in reasonable shape: list with a probate-friendly realtor.
If you need speed, the property needs major repairs, or you're managing from out of state: get a cash offer.
If you're not sure: get both quotes and compare.

Start with our free planner to get matched with both: ${BASE_URL}/estate-settlement-planner

The EstateSalen Team
${DISCLAIMER}`,
    },
  ];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { lead_id, send_immediately = false } = body;

    if (!lead_id) {
      return Response.json({ error: 'lead_id is required' }, { status: 400 });
    }

    // Fetch the lead
    const leads = await base44.asServiceRole.entities.EstateTransitionLead.filter({ id: lead_id });
    const lead = leads[0];
    if (!lead) {
      return Response.json({ error: 'Lead not found' }, { status: 404 });
    }

    if (!lead.email) {
      return Response.json({ error: 'Lead has no email address', lead_id }, { status: 400 });
    }

    const emails = buildEmails(lead);
    const results = [];

    if (send_immediately) {
      // Send first email now; rest are queued via activity log for scheduled sending
      const firstEmail = emails[0];
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: lead.email,
        subject: firstEmail.subject,
        body: firstEmail.body,
      });
      results.push({ email_number: 1, subject: firstEmail.subject, status: 'sent' });

      // Log remaining emails as pending in activity log
      for (let i = 1; i < emails.length; i++) {
        const e = emails[i];
        await base44.asServiceRole.entities.LeadActivityLog.create({
          lead_id,
          activity_type: 'follow_up',
          activity_notes: `EMAIL_QUEUED|delay_days:${e.delay_days}|subject:${e.subject}`,
        });
        results.push({ email_number: i + 1, subject: e.subject, status: 'queued', delay_days: e.delay_days });
      }
    } else {
      // Queue all emails in activity log for scheduled sending
      for (let i = 0; i < emails.length; i++) {
        const e = emails[i];
        await base44.asServiceRole.entities.LeadActivityLog.create({
          lead_id,
          activity_type: 'follow_up',
          activity_notes: `EMAIL_QUEUED|delay_days:${e.delay_days}|subject:${e.subject}`,
        });
        results.push({ email_number: i + 1, subject: e.subject, status: 'queued', delay_days: e.delay_days });
      }
    }

    // Log sequence started
    await base44.asServiceRole.entities.LeadActivityLog.create({
      lead_id,
      activity_type: 'email_sent',
      activity_notes: `Email sequence started. ${emails.length} emails queued. send_immediately=${send_immediately}`,
    });

    return Response.json({
      lead_id,
      email: lead.email,
      emails_queued: emails.length,
      results,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});