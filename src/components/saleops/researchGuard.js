// Chapter 14 P1-13/P1-14 — RESEARCH BEFORE PRICING guard (pure helpers).
// Doctrine: if merchandise is explicitly RESEARCH REQUIRED, ordinary
// pricing/publication must not proceed as though research is resolved.
// Two honest ways forward, both human:
//   1. Resolve the research (existing ResearchFlagDialog "Clear flag").
//   2. Authorized operator override — explicit, with who/when/reason recorded
//      on the Item (research_override_*). Casual employees cannot bypass:
//      the override writes a name, reason, and timestamp every time.

export function researchBlocked(item) {
  if (!item || (item.research_status || 'CLEAR') === 'CLEAR') return { blocked: false, overridden: false };
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