// Shared punch list helpers: labels, pasted-text parsing, the Base44 AI fix
// prompt, and the support-ticket projection.

export const CATEGORY_LABELS = {
  public_experience: 'Public Experience',
  consumer: 'Consumer',
  operator: 'Operator',
  vendor: 'Vendor',
  reseller: 'Reseller',
  agent: 'Agent',
  admin: 'Admin',
  seo_marketing: 'SEO & Marketing',
  payments: 'Payments',
  security: 'Security',
  data: 'Data',
  other: 'Other',
};

export const SEVERITY_LABELS = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export const STATUS_LABELS = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  blocked: 'Blocked',
  wont_fix: "Won't Fix",
};

export const SOURCE_LABELS = {
  manual: 'Added by hand',
  bulk_paste: 'Pasted list',
  support_ticket: 'Support ticket',
  ai_coach: 'AI Coach',
};

const MAX_TITLE = 120;

// Splits pasted text into one task per line, stripping bullets and numbering.
export function parsePastedLines(text) {
  const seen = new Set();
  return String(text || '')
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-*•–—]|\d+[.)])\s*/, '').trim())
    .filter(Boolean)
    .filter((line) => {
      const key = line.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function titleFromLine(line) {
  const clean = String(line || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= MAX_TITLE) return clean;
  const cut = clean.slice(0, MAX_TITLE);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 60 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

function reporterLine(item) {
  if (item.source === 'support_ticket') {
    const who = item.requested_by_name ? ` by ${item.requested_by_name}` : '';
    const ref = item.source_ref ? ` ${item.source_ref}` : '';
    return `REPORTED: Support ticket${ref}${who}.`;
  }
  if (item.source === 'ai_coach') {
    const who = item.requested_by_name ? ` by ${item.requested_by_name}` : '';
    const account = item.requested_by_account_type
      ? ` (${String(item.requested_by_account_type).replace(/_/g, ' ')})`
      : '';
    return `REPORTED:${who}${account} from the in-app AI Coach.`;
  }
  return '';
}

// The exact text an admin copies into the Base44 AI chat to get the item fixed.
export function buildAiFixPrompt(item) {
  const area = CATEGORY_LABELS[item.category] || 'Other';
  const severity = SEVERITY_LABELS[item.severity] || 'Medium';
  const reported = reporterLine(item);

  return `Fix this in my EstateSalen app (Base44).

ISSUE: ${item.title}
AREA: ${area}
SEVERITY: ${severity}${reported ? `\n${reported}` : ''}

WHAT IS HAPPENING:
${item.description || 'No extra detail was provided — work from the issue title and the area above.'}

WHAT A FIX LOOKS LIKE:
- Fix the root cause, not just the visible symptom.
- Leave everything else in the app working exactly as it does today.
- Match the existing design and code patterns already in the app.
- Make the change complete end to end: every button, save and state on the affected flow must work.

Please implement the fix now and tell me what you changed.`;
}

const TICKET_CATEGORY_MAP = {
  technical_issue: 'other',
  billing_payment: 'payments',
  account_access: 'other',
  feature_request: 'other',
  sales_management: 'operator',
  marketplace_issue: 'consumer',
  course_access: 'other',
  lead_management: 'operator',
  vendor_services: 'vendor',
  general_inquiry: 'other',
  other: 'other',
};

const PRIORITY_SEVERITY_MAP = {
  urgent: 'critical',
  high: 'high',
  medium: 'medium',
  low: 'low',
};

// A support ticket is also a fix item for the admin punch list.
export function buildPunchItemFromTicket(ticket, user) {
  const reporter = ticket.user_name || user?.full_name || 'A user';
  const account = ticket.account_type ? ` (${String(ticket.account_type).replace(/_/g, ' ')})` : '';
  const ticketRef = ticket.ticket_number || ticket.id;

  return {
    title: ticket.subject,
    description: `${ticket.description}\n\nSupport ticket ${ticketRef} — reported by ${reporter}${account}.`,
    category: TICKET_CATEGORY_MAP[ticket.category] || 'other',
    severity: PRIORITY_SEVERITY_MAP[ticket.priority] || 'medium',
    status: 'open',
    source: 'support_ticket',
    source_ref: ticketRef,
    requested_by_id: ticket.user_id || user?.id,
    requested_by_name: ticket.user_name || user?.full_name,
    requested_by_email: ticket.user_email || user?.email,
    requested_by_account_type: ticket.account_type,
  };
}