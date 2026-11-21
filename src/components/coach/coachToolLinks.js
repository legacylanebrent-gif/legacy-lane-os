// Maps a coaching answer to the EstateSalen tool that executes it, so advice can be
// acted on immediately instead of being read and forgotten. Deliberately keyword
// based and conservative: a link appears only when the answer actually talks about
// that work. Never points at a third-party product.

export const COACH_TOOL_LINKS = [
  {
    key: 'marketing_kit',
    label: 'Marketing Kit',
    path: '/MarketingKit',
    hint: 'Build and publish the posts',
    test: /(social (media )?post|instagram|facebook post|facebook page|reel|tiktok|caption|post about|content pack)/i,
  },
  {
    key: 'content_calendar',
    label: 'Content Calendar',
    path: '/ContentCalendar',
    hint: 'Schedule the content',
    test: /(content calendar|schedule (your |the )?(posts|content)|posting schedule|when to post|content plan)/i,
  },
  {
    key: 'marketing_hub',
    label: 'Marketing Hub',
    path: '/OperatorMarketingHub',
    hint: 'Send email or SMS',
    test: /(email campaign|email blast|newsletter|sms|text (message|blast)|mailing list|email sequence)/i,
  },
  {
    key: 'tasks',
    label: 'Sale Tasks',
    path: '/SaleTasks',
    hint: 'Assign the work',
    test: /(task|to-?do|accountab|delegate|checklist|follow[- ]?up plan|assign)/i,
  },
  {
    key: 'crm',
    label: 'CRM',
    path: '/CRM',
    hint: 'Track the contacts',
    test: /(crm|contact list|your contacts|client list|keep track of (leads|clients))/i,
  },
  {
    key: 'lead_funnel',
    label: 'Lead Funnel',
    path: '/LeadFunnel',
    hint: 'Work the leads',
    test: /(real estate agent|agents|attorney|attorneys|probate|lead generation|lead funnel|outreach)/i,
  },
  {
    key: 'referrals',
    label: 'Referral Dashboard',
    path: '/ReferralDashboard',
    hint: 'Track partner referrals',
    test: /(referral|commission|partner(ship)?|referred)/i,
  },
  {
    key: 'pricing',
    label: 'Sale Pricing Tool',
    path: '/SalePricingTool',
    hint: 'Price the items',
    test: /(pricing|price (your|the|items)|what to charge|market value|appraisal)/i,
  },
  {
    key: 'iso',
    label: 'My Searches',
    path: '/IsoCenter',
    hint: 'Match buyers to items',
    test: /(iso\b|in search of|wanted item|buyer wants|collector|reseller)/i,
  },
  {
    key: 'website',
    label: 'My Website',
    path: '/MyWebsite',
    hint: 'Update your site',
    test: /(your website|website|landing page|domain)/i,
  },
  {
    key: 'documents',
    label: 'Business Documents',
    path: '/BusinessDocuments',
    hint: 'Store the templates',
    test: /(contract|agreement|template|policy|sop|paperwork)/i,
  },
  {
    key: 'audience',
    label: 'Buyer Audience',
    path: '/BuyerAudience',
    hint: 'Grow your list',
    test: /(buyer list|audience|past customers|email list|subscribers)/i,
  },
  {
    key: 'reviews',
    label: 'Testimonials',
    path: '/ClientTestimonials',
    hint: 'Collect the proof',
    test: /(review|testimonial|social proof|rating)/i,
  },
  {
    key: 'packages',
    label: 'Subscription Packages',
    path: '/OperatorPackages',
    hint: 'See what is included',
    test: /(upgrade|subscription|package|plan\b)/i,
  },
];

export function toolLinksFor(text, limit = 3) {
  const body = String(text || '');
  if (!body) return [];
  const seen = new Set();
  const out = [];
  for (const rule of COACH_TOOL_LINKS) {
    if (out.length >= limit) break;
    if (seen.has(rule.key)) continue;
    if (rule.test.test(body)) {
      seen.add(rule.key);
      out.push(rule);
    }
  }
  return out;
}

// A short, editable task title from an answer: the first heading, bold lead or
// bullet the coach offered as the next action.
export function suggestTaskTitle(text) {
  const lines = String(text || '').split('\n').map(l => l.trim()).filter(Boolean);
  const candidate = lines.find(l => /^#{2,4}\s+/.test(l))
    || lines.find(l => /^[-*•]\s+/.test(l))
    || lines.find(l => /^\d+[.)]\s+/.test(l))
    || lines[0]
    || '';
  return candidate
    .replace(/^#{2,4}\s+/, '')
    .replace(/^[-*•]\s+/, '')
    .replace(/^\d+[.)]\s+/, '')
    .replace(/\*\*/g, '')
    .slice(0, 120);
}