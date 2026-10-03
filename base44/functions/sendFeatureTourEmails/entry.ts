import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ─────────────────────────────────────────────
// sendFeatureTourEmails
// Daily processor for the 10-day operator feature-tour email sequence.
// For each active FeatureTourEnrollment, sends one email per day based on the
// number of whole days since enrollment:
//   Day 1  — Sale creation & management (full operation, not just listings)
//   Day 2  — AI marketing automation
//   Day 3  — Online marketplace (sell after the doors close)
//   Day 4  — Lead generation & CRM (free leads, daily)
//   Day 5  — Buyer matching & ISO Wanted Items
//   Day 6  — VIP events & buyer loyalty
//   Day 7  — POS checkout + sale signage & print
//   Day 8  — Buyer experience + mobile app
//   Day 9  — Business operations + 10 AI SuperAgents
//   Day 10 — Pricing & value close (urgency + money-back guarantee)
// Sends at most ONE email per enrollment per run; marks completed after 10.
// ─────────────────────────────────────────────

const APP_URL = 'https://estatesalen.com';
const DAY_MS = 24 * 60 * 60 * 1000;

const CTA_BUTTON = (label, href) => `
  <p style="margin:28px 0;">
    <a href="${APP_URL}${href}"
       style="background-color:#f97316;color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">
      ${label}
    </a>
  </p>`;

const FOOTER = `
  <p style="color:#64748b;font-size:13px;">
    You're receiving this because you started a free trial on EstateSalen.com.
    Manage your email preferences any time in your profile settings.
  </p>`;

const HIGHLIGHT = (emoji, text) => `
  <p style="background-color:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:12px;color:#9a3412;">${emoji} ${text}</p>`;

const EMAILS = [
  {
    subject: 'Day 1 — EstateSales.net lists your sales. We run your entire operation.',
    html: (name) => `
      <h2 style="color:#1e293b;">This isn\'t a listing site, ${name}</h2>
      <p>You already know EstateSales.net lists sales. So do we — but that\'s the <em>only</em> thing we copy. Everything around the listing is where EstateSalen.com pulls ahead: a full sale dashboard with AI automation, drag-and-drop photo management, batch photo labeling & pricing, per-sale task lists (setup → cleanup), and client assignment with permissions.</p>
      <p>We also give you sale types they don\'t: one-click <strong>$5 & Under bargain events</strong> and <strong>reseller-only buyout promotions</strong> for bulk liquidation.</p>
      ${CTA_BUTTON('Set Up Your Next Sale', '/MySales')}
      <p style="color:#64748b;font-size:13px;">Your free trial is live — no credit card required. One feature deep-dive per day for the next 10 days.</p>
      ${FOOTER}`,
  },
  {
    subject: 'Day 2 — Your marketing department, included',
    html: (name) => `
      <h2 style="color:#1e293b;">How many hours did your last sale\'s marketing take?</h2>
      <p>On EstateSalen.com, AI writes and publishes it all for you: auto-generated Facebook posts, Instagram captions, email blasts, SMS campaigns, blog articles from your sale items, and video scripts. Then push everything live with <strong>one click to all social media</strong>.</p>
      <p>Plus built-in email & SMS campaign tools, a content calendar, an AI SEO boost per listing, and a Facebook Ad campaign builder — none of which EstateSales.net offers.</p>
      ${CTA_BUTTON('Try the Marketing Tools', '/MySales')}
      <p style="color:#64748b;font-size:13px;">Marketing that used to take hours now takes minutes — included in every plan.</p>
      ${FOOTER}`,
  },
  {
    subject: 'Day 3 — Your revenue no longer ends Sunday night',
    html: (name) => `
      <h2 style="color:#1e293b;">Every unsold item is an online listing — not a donation trip</h2>
      <p>EstateSales.net ends when the doors close. EstateSalen.com keeps selling: list leftovers on our <strong>national marketplace</strong> as fixed-price "Buy Now" listings, run <strong>auctions with proxy auto-bid</strong>, and <strong>ship to buyers nationwide</strong>.</p>
      <p>Pricing is handled too — a <strong>10,000+ item pricing reference database</strong> plus Google Lens AI pricing and AI-generated titles & descriptions mean items go live in minutes, with status synced across every channel.</p>
      ${CTA_BUTTON('Browse the Marketplace', '/BrowseItems')}
      ${FOOTER}`,
  },
  {
    subject: 'Day 4 — Free leads, daily. EstateSales.net sends zero.',
    html: (name) => `
      <h2 style="color:#1e293b;">We pay to promote your business — then send you the customers</h2>
      <p>EstateSales.net has never sent you a client. EstateSalen.com does, every day: <strong>lead capture from our website, ads & finder tool</strong>, scored and routed straight to you, plus <strong>pre-probate territory leads</strong> and <strong>new real-estate listing leads within 48 hours of hitting the market</strong>.</p>
      <p>Manage it all in a <strong>full CRM</strong> — contacts, pipeline, activity timelines, territory heatmap analytics — and <strong>get paid when you refer a listing to a realtor</strong>. Income EstateSales.net can\'t offer.</p>
      ${CTA_BUTTON('Open My CRM', '/CRM')}
      ${FOOTER}`,
  },
  {
    subject: 'Day 5 — Buyers are already hunting for your inventory',
    html: (name) => `
      <h2 style="color:#1e293b;">Your items get matched before the sale even opens</h2>
      <p>Buyers on EstateSalen.com build <strong>ISO Wanted Items™ hunt lists</strong> — and our automated matching notifies them instantly when items in their list show up in your sales. Plus a <strong>daily 5am batch match</strong> and a one-click <strong>Buyer Match button</strong> on your sale cards.</p>
      <p>Elite-tier members get automatic buyer notifications for even more reach.</p>
      ${CTA_BUTTON('Trigger Buyer Matching', '/MySales')}
      <p style="color:#64748b;font-size:13px;">Demand comes to you — no listing "hope" required.</p>
      ${FOOTER}`,
  },
  {
    subject: 'Day 6 — Fill your line before the sign opens',
    html: (name) => `
      <h2 style="color:#1e293b;">Repeat buyers are the cheapest revenue you\'ll ever earn</h2>
      <p>Turn one-time shoppers into a following that shows up early and buys more: <strong>VIP pre-sale events</strong> with early-access invites, <strong>line management & early sign-in</strong>, buyer purchase rewards & points, and <strong>monthly prize drawings — paid for by EstateSalen.com</strong>, not you.</p>
      <p>Buyer watchlists and price-drop alerts keep them coming back to <em>your</em> sales specifically.</p>
      ${CTA_BUTTON('See Early Sign-Ins', '/MyEarlySignIns')}
      ${FOOTER}`,
  },
  {
    subject: 'Day 7 — Sale day, handled: checkout + signage in one place',
    html: (name) => `
      <h2 style="color:#1e293b;">Ditch the spiral notebook and the label maker</h2>
      <p>Sale day runs entirely inside EstateSalen.com: <strong>QR code in-person checkout</strong>, cart building with inventory suggestions, pricing database lookups at the register, offer management, a buyout calculator, and one-click <strong>settlement sheets with commission breakdowns</strong>.</p>
      <p>Before doors open, print <strong>90+ ready-to-print signs with your logo</strong>, <strong>price tags generated from your item photos</strong> (title & description included), category signs, and banners.</p>
      ${CTA_BUTTON('Preview the POS', '/CheckoutStation')}
      ${FOOTER}`,
  },
  {
    subject: 'Day 8 — Where your next customer is scrolling right now',
    html: (name) => `
      <h2 style="color:#1e293b;">Buyers follow their favorite companies here — make sure yours is one</h2>
      <p>Shoppers get a native <strong>mobile app (iOS & Android)</strong> with an interactive sale map, GPS route planning for multi-sale weekends, QR check-in rewards, in-app messaging, and sale recap pages. They can <strong>follow your company</strong> and get push notifications the moment you post a new sale — plus ISO hunt lists and live price-drop alerts on watched items.</p>
      <p>EstateSales.net only partially matches this experience. That gap is where your next customer is.</p>
      ${CTA_BUTTON('Polish My Public Profile', '/OperatorProfile')}
      ${FOOTER}`,
  },
  {
    subject: 'Day 9 — A full back-office team that works while you sleep',
    html: (name) => `
      <h2 style="color:#1e293b;">10 AI SuperAgents + the whole back office, one login</h2>
      <p>EstateSalen.com runs your entire company: <strong>team management with role-based access</strong>, <strong>digital contracts with eSigning & expiration alerts</strong>, revenue & commission analytics, expense tracking with a <strong>receipt scanner</strong>, mileage tracking, and tax-ready annual income/expense exports.</p>
      <p>Behind it all, <strong>10 AI SuperAgents work 24/7</strong> — the Marketing Agent drafts campaigns, the Lead Conversion Agent scores & routes leads, the Inventory Pricing Agent researches items in bulk, the Financial Ops Agent tracks money and suggests savings, the Relationship Coach nurtures clients, and the QA Agent audits your listings.</p>
      ${CTA_BUTTON('Open My Business Dashboard', '/OperatorDashboard')}
      <p style="color:#64748b;font-size:13px;">It\'s like hiring a full back-office team for less than one day of temp help.</p>
      ${FOOTER}`,
  },
  {
    subject: 'Day 10 — Your trial is ending: lock in your rate (30-day money-back guarantee)',
    html: (name) => `
      <h2 style="color:#1e293b;">${name}, the only wrong move is going back to doing all this by hand</h2>
      <p>You\'ve seen the whole tour: 115+ tools covering listings, AI marketing, POS checkout, CRM & leads, VIP events, contracts, marketplace, mobile, and a 24/7 AI staff. EstateSalen.com wins more features than any competitor — <strong>at the same price you already pay ... or lower</strong>, as a flat monthly subscription with <strong>no per-listing fees</strong>.</p>
      ${HIGHLIGHT('⏰', 'Your free trial ends soon. Upgrade now to keep your SERP pricing searches, marketing, leads, and buyer matching active — backed by a full 30-day money-back guarantee and priority support.')}
      ${CTA_BUTTON('Upgrade Now — Lock In My Rate', '/OperatorPackages')}
      ${FOOTER}`,
  },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    const enrollments = await base44.asServiceRole.entities.FeatureTourEnrollment.filter({
      status: 'active',
    });

    let sent = 0;
    let completed = 0;
    let skipped = 0;

    for (const enrollment of enrollments) {
      if (!enrollment.email) { skipped++; continue; }
      if (!enrollment.enrolled_at) { skipped++; continue; }

      // Skip if we already sent an email today for this enrollment
      if (enrollment.last_sent_date && enrollment.last_sent_date.slice(0, 10) === today) {
        skipped++;
        continue;
      }

      const daysSince = Math.floor((now - new Date(enrollment.enrolled_at)) / DAY_MS);
      const emailIndex = enrollment.emails_sent || 0;

      // Due when a full day has passed since the previous email (email N due on day N+1)
      if (daysSince < emailIndex + 1) { skipped++; continue; }
      if (emailIndex >= EMAILS.length) {
        await base44.asServiceRole.entities.FeatureTourEnrollment.update(enrollment.id, {
          status: 'completed',
        });
        completed++;
        continue;
      }

      const email = EMAILS[emailIndex];
      const firstName = enrollment.first_name || 'there';

      await base44.asServiceRole.entities.FeatureTourEnrollment.update(enrollment.id, {
        last_sent_date: now.toISOString(),
      });
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: enrollment.email,
          subject: email.subject,
          html: email.html(firstName),
        });
        await base44.asServiceRole.entities.FeatureTourEnrollment.update(enrollment.id, {
          emails_sent: emailIndex + 1,
        });
        sent++;
      } catch (emailErr) {
        console.error(`Failed feature-tour email to ${enrollment.email}:`, emailErr.message);
      }
    }

    return Response.json({
      success: true,
      checked: enrollments.length,
      sent,
      completed,
      skipped,
    });
  } catch (error) {
    console.error('sendFeatureTourEmails error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});