// Chapter 19 P1 — deterministic staffing helpers (no server truth is stored
// here; everything derives from canonical records). Honest states only:
// a missing assignment is UNASSIGNED, unknown availability is UNKNOWN.

export const RESPONSIBILITY_TYPES = [
  { key: 'ENTRY', label: 'Entry / Greeter', tokens: ['entry', 'greeter', 'customer'] },
  { key: 'CHECKOUT', label: 'Checkout', tokens: ['pos', 'checkout', 'cashier'] },
  { key: 'FLOOR_ZONE', label: 'Floor Zone', tokens: ['staging', 'floor', 'display'] },
  { key: 'HIGH_VALUE', label: 'High Value Watch', tokens: ['high value', 'security', 'jewelry'] },
  { key: 'NEGOTIATION', label: 'Negotiation', tokens: ['negotiation', 'sales', 'offers'] },
  { key: 'FURNITURE', label: 'Furniture / Heavy Items', tokens: ['furniture', 'heavy lifting', 'moving', 'mover'] },
  { key: 'PICKUP', label: 'Pickup / Releases', tokens: ['pickup', 'release'] },
  { key: 'CUSTOMER_ISSUES', label: 'Customer Issues', tokens: ['customer', 'service', 'issues'] },
  { key: 'SALE_FLOOR_RECOVERY', label: 'Sale Floor Recovery', tokens: ['recovery', 'restock', 'physical'] },
  { key: 'OTHER', label: 'Other', tokens: [] },
];

export const TYPE_LABEL = Object.fromEntries(RESPONSIBILITY_TYPES.map((t) => [t.key, t.label]));

// P1-2 — which sale-day functions SHOULD be covered, derived from recorded
// sale/item truth. Required only when the records say the situation exists.
export function requiredResponsibilities({ sale = {}, items = [] }) {
  const reqs = [];
  const zones = (sale.prep_zones || []);
  const flow = sale.customer_flow || {};

  if (flow.checkout_location) {
    reqs.push({ type: 'CHECKOUT', reason: `Checkout is set up at ${flow.checkout_location}.` });
  }
  if (flow.entry_note) {
    reqs.push({ type: 'ENTRY', reason: `Entry is planned (${flow.entry_note}).` });
  }
  if (items.some((i) => i.inventory_level === 'HIGH_VALUE')) {
    reqs.push({ type: 'HIGH_VALUE', reason: 'The sale includes High Value merchandise.' });
  }
  zones
    .filter((z) => z.staging_purpose === 'SALE_FLOOR' && (z.access_class || 'UNCLASSIFIED') === 'OPEN_TO_CUSTOMERS')
    .forEach((z) => reqs.push({ type: 'FLOOR_ZONE', zone_id: z.zone_id, zone_name: z.name, reason: `Open sale floor zone: ${z.name}.` }));

  const soldPendingPickup = items.filter((i) => i.status === 'sold' && !i.pickup_completed_at).length;
  if (soldPendingPickup > 0) {
    reqs.push({ type: 'PICKUP', reason: `${soldPendingPickup} sold item(s) awaiting buyer pickup.` });
  }
  if (items.some((i) => (i.pickup_requirements || {}).additional_people || (i.pickup_requirements || {}).equipment_needed)) {
    reqs.push({ type: 'FURNITURE', reason: 'Large merchandise needs two-person or equipped removal.' });
  }
  return reqs;
}

export function assignmentCovers(assignments, req) {
  return (assignments || []).some(
    (a) => (a.status || 'ACTIVE') === 'ACTIVE' && a.responsibility_type === req.type
      && (req.type !== 'FLOOR_ZONE' || !req.zone_id || a.zone_id === req.zone_id)
  );
}

export function coverageGaps(required, assignments) {
  return (required || []).filter((r) => !assignmentCovers(assignments, r));
}

// P1-7 — UNKNOWN availability is honest: never assumed available or not.
export function availabilityState(member, saleDates = []) {
  const dates = (saleDates || []).map((d) => d && d.date).filter(Boolean);
  const windows = member.availability || [];
  if (dates.length === 0) return 'NO_SALE_DATES';
  if (windows.length === 0) return 'UNKNOWN';
  const covered = dates.some((date) =>
    windows.some((w) => w.start_date && w.start_date <= date && (!w.end_date || date <= w.end_date))
  );
  return covered ? 'AVAILABLE' : 'NOT_AVAILABLE';
}

export const AVAILABILITY_BADGE = {
  AVAILABLE: 'bg-green-100 text-green-700 border-green-300',
  NOT_AVAILABLE: 'bg-red-100 text-red-700 border-red-300',
  UNKNOWN: 'bg-slate-100 text-slate-500 border-slate-300',
  NO_SALE_DATES: 'bg-slate-100 text-slate-500 border-slate-300',
};

// P1-6 — skill match is keyword-based guidance on what the operator recorded;
// it is never a certification of competence.
export function membersWithSkill(members, typeKey) {
  const type = RESPONSIBILITY_TYPES.find((t) => t.key === typeKey);
  if (!type || type.tokens.length === 0) return [];
  return (members || []).filter((m) => {
    const detailed = (m.skills_detail || []).some((s) =>
      type.tokens.some((tok) => (s.skill || '').toLowerCase().includes(tok))
    );
    const legacy = (m.skills || []).some((s) =>
      type.tokens.some((tok) => (s || '').toLowerCase().includes(tok))
    );
    return detailed || legacy;
  });
}

// P1-4 — planning assumption vs the deal's estimated hours (advisory compare).
export function laborCompare({ assignments = [], deal = null }) {
  const planned = (assignments || [])
    .filter((a) => (a.status || 'ACTIVE') === 'ACTIVE')
    .reduce((sum, a) => sum + (a.planned_hours || 0), 0);
  const estimated = ((deal && deal.labor_estimates) || []).reduce((sum, r) => sum + (r.hours || 0), 0);
  let status = 'UNKNOWN';
  if (estimated > 0) status = planned > estimated * 1.25 ? 'REVIEW' : 'OK';
  return { planned, estimated, status };
}