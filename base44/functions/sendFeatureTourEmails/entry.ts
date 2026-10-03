import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ─────────────────────────────────────────────
// sendFeatureTourEmails
// Daily processor for the 10-day operator feature-tour email sequence.
// For each active FeatureTourEnrollment, sends one email per day based on the
// number of whole days since enrollment:
//   Day 1  — Welcome + Dashboard tour
//   Day 2  — Creating your first estate sale
//   Day 3  — Inventory & photo labeling
//   Day 4  — AI-powered pricing (Google Lens)
//   Day 5  — Marketing campaigns (email / SMS / social)
//   Day 6  — POS & checkout (Scan & Cart)
//   Day 7  — Early sign-ins & attendance
//   Day 8  — Team management
//   Day 9  — Marketplace & wanted items
//   Day 10 — Wallet, payouts, reports + upgrade CTA
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

const EMAILS = [
  {
    subject: 'Welcome to EstateSalen — here\'s your dashboard',
    html: (name) => `
      <h2 style="color:#1e293b;">Welcome aboard, ${name}! 🎉</h2>
      <p>Your 14-day free trial is live — no credit card required. Every day for the next 10 days we'll walk you through one key feature so you can run your first estate sale with total confidence.</p>
      <p><strong>Today: Your Dashboard.</strong> This is mission control — upcoming sales, tasks, revenue, and quick actions all in one place.</p>
      ${CTA_BUTTON('Open My Dashboard', '/Dashboard')}
      ${FOOTER}`,
  },
  {
    subject: 'Day 2 — Create your first estate sale',
    html: (name) => `
      <h2 style="color:#1e293b;">Create your first sale, ${name}</h2>
      <p>From your dashboard you can launch a sale in minutes: address, dates, sale type, commission, and payment methods. Your listing automatically gets an SEO-optimized public page shoppers can find on Google.</p>
      ${CTA_BUTTON('Set Up a Sale', '/MySales')}
      ${FOOTER}`,
  },
  {
    subject: 'Day 3 — Inventory & photo labeling made easy',
    html: (name) => `
      <h2 style="color:#1e293b;">Build your inventory with photos</h2>
      <p>Upload photos, name and describe items, and mark featured pieces. Your photo labels double as printable signs, QR codes, and pricing labels for sale day.</p>
      ${CTA_BUTTON('Add Inventory', '/MySales')}
      ${FOOTER}`,
  },
  {
    subject: 'Day 4 — Price items instantly with AI',
    html: (name) => `
      <h2 style="color:#1e293b;">AI-powered pricing at your fingertips</h2>
      <p>Snap a photo and our AI searches live market data (Google Lens + SERP) to suggest real prices for antiques, collectibles, and furniture. This is the feature operators tell us saves them the most time.</p>
      <p style="background-color:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:12px;color:#9a3412;">💡 Heads up: SERP pricing searches unlock when you activate your paid plan — upgrade any time during or after your trial.</p>
      ${CTA_BUTTON('See Plans', '/OperatorPackages')}
      ${FOOTER}`,
  },
  {
    subject: 'Day 5 — Fill your sale with marketing campaigns',
    html: (name) => `
      <h2 style="color:#1e293b;">Market your sale to local shoppers</h2>
      <p>Launch email campaigns, SMS alerts, and social posts to shoppers within your chosen radius. AI can even write your campaign copy and generate sale graphics for you.</p>
      ${CTA_BUTTON('Open Marketing', '/MySales')}
      ${FOOTER}`,
  },
  {
    subject: 'Day 6 — Run your sale-day checkout like a pro',
    html: (name) => `
      <h2 style="color:#1e293b;">POS & checkout, built in</h2>
      <p>On sale day, scan item QR codes with your phone to ring up buyers. Track every transaction — cash, card, Venmo — and your settlement statements build themselves.</p>
      ${CTA_BUTTON('Preview the POS', '/CheckoutStation')}
      ${FOOTER}`,
  },
  {
    subject: 'Day 7 — Early sign-ins & attendance tracking',
    html: (name) => `
      <h2 style="color:#1e293b;">Know exactly who\'s at your door</h2>
      <p>Let shoppers join an early sign-in list for your sales, then scan them in with QR codes on sale day. Queue positions, attendance counts, and repeat-buyer tracking — all automatic.</p>
      ${CTA_BUTTON('See Early Sign-Ins', '/MyEarlySignIns')}
      ${FOOTER}`,
  },
  {
    subject: 'Day 8 — Add your team (free)',
    html: (name) => `
      <h2 style="color:#1e293b;">Run sales with your whole team</h2>
      <p>Invite staff as collaborators on any sale. Assign permissions so cashiers, runners, and managers each see exactly what they need — at no extra cost.</p>
      ${CTA_BUTTON('Manage My Team', '/ManageTeam')}
      ${FOOTER}`,
  },
  {
    subject: 'Day 9 — Sell leftovers on the Marketplace',
    html: (name) => `
      <h2 style="color:#1e293b;">Turn leftovers into revenue</h2>
      <p>Unsold items don\'t have to go to donation. List them on the EstateSalen Marketplace, post them to Wanted-item matches, and let buyers come to you — shipping or local pickup, your choice.</p>
      ${CTA_BUTTON('Browse the Marketplace', '/BrowseItems')}
      ${FOOTER}`,
  },
  {
    subject: 'Day 10 — Wallet, payouts & your upgrade window',
    html: (name) => `
      <h2 style="color:#1e293b;">Track money in and out</h2>
      <p>Your wallet tracks credits, referral fees, and payouts, while reports show revenue, expenses, and profit per sale. That's the full tour — all 10 features!</p>
      <p style="background-color:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:12px;color:#9a3412;">⏰ Your 14-day trial is halfway through. Upgrade now to lock in your rate and keep SERP pricing, marketing, and lead tools active.</p>
      ${CTA_BUTTON('Upgrade Now', '/OperatorPackages')}
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