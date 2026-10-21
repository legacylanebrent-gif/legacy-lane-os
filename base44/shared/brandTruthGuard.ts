// ── BRAND-TRUTH CLAIMS GUARDRAIL (Chapter 7 P1) ──────────────────────────────
// Doctrine: MARKETING MAY INTERPRET VERIFIED FACTS. IT MAY NOT INVENT THEM.
//
// ONE shared validation layer for every EstateSalen marketing AI surface.
// base44/shared/llbbAiContent.ts and base44/functions/aiCoach import this
// module directly. src/lib/brandTruth.js is the browser-side mirror for
// client-side InvokeLLM surfaces — kept in sync BY POLICY: never fork the rules.
//
// Verified facts shape: { business: { years_experience }, verified_credentials: [] }
// A missing fact is UNKNOWN: any claim about it is unsupported and must be
// omitted, qualified, or asked of the operator — never guessed.
export const CREDENTIAL_WORDS = ['licensed', 'bonded', 'insured', 'certified', 'certification', 'appraiser', 'realtor', 'broker'];

export const YEARS_RE = /\b\d+\s*\+?\s*(?:years|yrs)\b/i;

export const SUPERLATIVE_RE = /\b(#1|number one|numéro one|best in|the best|largest|biggest|guaranteed|guarantee|award[- ]winning|top[- ]rated)\b/i;

export const MONEY_RE = /\$\s?\d|\b\d+\s*(?:percent|%|commission)\b/i;

export const VOLUME_RE = /\b\d{2,}\s*\+?\s*(?:sales|estates|families|clients|homes|items|buyers)\b/i;

export const TESTIMONIAL_RE = /\b(five[- ]star|5[- ]star|★★★★★|rave review|glowing review|testimonials?)\b/i;

// Returns a violation label for the FIRST unsupported claim found, or null.
// Same contract as the llbbAiContent validator it replaces — input shape:
// { business: { years_experience }, verified_credentials: [] }
export function textViolations(text, input) {
  const t = String(text || '');
  const inp = input || {};
  const business = inp.business || {};
  const verified = (inp.verified_credentials || []).map(v => String(v).toLowerCase());
  for (const w of CREDENTIAL_WORDS) {
    if (new RegExp('\\b' + w + '\\b', 'i').test(t) && !verified.some(v => v.includes(w))) return `credential claim "${w}"`;
  }
  if (YEARS_RE.test(t) && !business.years_experience) return 'years-in-business claim';
  if (SUPERLATIVE_RE.test(t)) return 'unsupported superlative/guarantee';
  if (MONEY_RE.test(t)) return 'price/fee claim';
  if (VOLUME_RE.test(t)) return 'sales-volume claim';
  if (TESTIMONIAL_RE.test(t) && !inp.has_approved_testimonials) return 'testimonial claim';
  return null;
}

// Sentence-level sanitizer for marketing copy: removes every sentence that
// carries an unsupported claim. Returns { text, removed: [labels] }.
export function sanitizeMarketingText(rawText, input) {
  const text = String(rawText || '');
  if (!text.trim()) return { text, removed: [] };
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  const kept = [];
  const removed = [];
  for (const s of sentences) {
    const v = textViolations(s, input);
    if (v) removed.push(`${v}: "${s.trim().slice(0, 80)}"`);
    else kept.push(s);
  }
  return { text: kept.join(' '), removed };
}