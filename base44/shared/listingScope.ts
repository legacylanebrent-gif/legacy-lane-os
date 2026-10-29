// One implementation of "which of my records does this action apply to?".
// Used by the enrichment job and the export evaluation so both resolve the same
// scope from the same workspace filters, always scoped to the authenticated agent.

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const target = new Date(`${dateStr}T00:00:00Z`).getTime();
  if (Number.isNaN(target)) return null;
  return Math.round((target - Date.now()) / 86400000);
}

function matchesFilter(opp, filter) {
  const matchStatus = opp?.ownership?.match_status || 'unmatched';
  const closed = !!opp.dismissed || !!opp.handled;
  if (filter === 'closed') return closed;
  if (closed) return false;
  if (filter === 'needs_review') return matchStatus === 'possible';
  if (filter === 'verified') return matchStatus === 'verified';
  if (filter === 'unmatched') return ['unmatched', 'no_match', 'failed', 'reference_unavailable'].includes(matchStatus);
  if (filter === 'tasks') return (opp.tasks || []).some((t) => t.status !== 'done');
  if (filter === 'deadlines') {
    const days = daysUntil(opp.deadline || opp.listing?.expected_closing_date);
    return days !== null && days <= 14;
  }
  return true; // work_today
}

function addressText(opp) {
  const a = opp.address || {};
  return [a.street, a.unit, a.city, a.state, a.zip, a.formatted_address].filter(Boolean).join(' ').toLowerCase();
}

export async function resolveScopedOpportunities(base44, user, { scope = 'selected', opportunity_ids = [], filter = 'work_today', q = '', limit = 500 } = {}) {
  const ids = Array.isArray(opportunity_ids) ? opportunity_ids.filter(Boolean).slice(0, limit) : [];

  if (scope === 'selected') {
    if (ids.length === 0) return [];
    let rows = [];
    try {
      rows = await base44.asServiceRole.entities.AgentListingOpportunity.filter({ id: { $in: ids } }, '-created_date', limit, 0);
    } catch (error) {
      console.error('[listingScope] bulk id lookup failed, falling back:', error?.message);
    }
    if ((rows || []).length !== ids.length) {
      const found = new Map((rows || []).map((r) => [r.id, r]));
      const missing = ids.filter((id) => !found.has(id));
      for (const id of missing.slice(0, 50)) {
        try {
          const one = (await base44.asServiceRole.entities.AgentListingOpportunity.filter({ id }))[0];
          if (one) found.set(one.id, one);
        } catch (error) {
          console.error('[listingScope] id lookup failed:', error?.message);
        }
      }
      rows = [...found.values()];
    }
    // Authorization: the record must belong to the calling agent.
    return (rows || []).filter((r) => r.agent_user_id === user.id);
  }

  const all = await base44.asServiceRole.entities.AgentListingOpportunity.filter({ agent_user_id: user.id }, '-created_date', 400, 0);
  const query = String(q || '').toLowerCase().trim();
  return (all || [])
    .filter((opp) => matchesFilter(opp, filter))
    .filter((opp) => (query ? addressText(opp).includes(query) : true))
    .slice(0, limit);
}