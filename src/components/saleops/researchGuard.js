// Chapter 14 P1-13/P1-14 — RESEARCH BEFORE PRICING guard (pure helpers).
// Doctrine: if merchandise is explicitly RESEARCH REQUIRED, ordinary
// pricing/publication must not proceed as though research is resolved.
// Two honest ways forward, both human:
//   1. Resolve the research (existing ResearchFlagDialog "Clear flag").
//   2. Authorized operator override — explicit, with who/when/reason recorded
//      on the Item (research_override_*). Casual employees cannot bypass:
//      the override writes a name, reason, and timestamp every time.

// Chapter 16 P1-10 — READY_TO_PRICE is the operator's "sufficient evidence for a
// HUMAN pricing decision" state. It is NOT an attention state: it releases the
// ordinary pricing/publication guard like CLEAR does (and is still separate
// from verification_status, which never changes here).
const UNBLOCKED = ['CLEAR', 'READY_TO_PRICE'];

export function researchBlocked(item) {
  if (!item || UNBLOCKED.includes(item.research_status || 'CLEAR')) return { blocked: false, overridden: false };
  if (item.research_override_at) return { blocked: false, overridden: true };
  return { blocked: true, overridden: false };
}

export function overridePayload(reason, userId, userName) {
  return {
    research_override_by: userId,
    research_override_by_name: userName,
    research_override_reason: reason,
    research_override_at: new Date().toISOString(),
  };
}