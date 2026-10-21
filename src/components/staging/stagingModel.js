// Chapter 17 P1 — DETERMINISTIC STAGING MODEL. Staging is friction removal:
// every helper here derives from canonical records ONLY (zones, Items, tasks,
// issues, labor). No AI determines readiness, no fake percentages, no second
// status/pickup/pricing truth. UNKNOWN IS DATA — absence is reported honestly.

export const STAGING_PURPOSES = [
  { key: 'SALE_FLOOR', label: 'Sale floor' },
  { key: 'PREP_ONLY', label: 'Prep only' },
  { key: 'STORAGE', label: 'Storage' },
  { key: 'CHECKOUT', label: 'Checkout' },
  { key: 'OTHER', label: 'Other' },
];

export const LIGHTING_STATES = [
  { key: 'unknown', label: 'Unknown' },
  { key: 'ok', label: 'Adequate' },
  { key: 'insufficient', label: 'Insufficient' },
  { key: 'additional_needed', label: 'Additional light needed' },
];

export const SALE_DAY_STATUSES = [
  { key: 'READY', label: 'Ready' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'DEPLETED', label: 'Depleted' },
  { key: 'CONSOLIDATE', label: 'Consolidate' },
  { key: 'CLOSED', label: 'Closed' },
];

// P1-7 — category plan references the EXISTING Item.category vocabulary.
export const ZONE_CATEGORY_OPTIONS = [
  'kitchen_dining', 'books_media', 'tools_hardware', 'clothing_accessories',
  'electronics', 'collectibles', 'holiday_seasonal', 'garden_outdoor',
  'furniture', 'home_decor', 'linens_placeholder', 'other',
].filter(c => c !== 'linens_placeholder').concat(['rugs_textiles', 'lighting_lamps', 'toys_games']);

export const categoryLabel = (c) => (c || '').replace(/_/g, ' ');

// P1-35 — deterministic per-zone STAGING CHECKLIST points (judgment items that
// cannot be derived). Executed through the existing SaleTask system, exactly
// like the Security:/Checkout Setup: checklist prefixes.
export const ZONE_STAGING_POINTS = [
  { key: 'walkway', label: 'Walkway clear through the zone' },
  { key: 'organized', label: 'Merchandise reasonably organized' },
  { key: 'visible', label: 'Important items visible (nothing important hidden under/behind other merchandise)' },
  { key: 'signs', label: 'Required signs placed' },
  { key: 'removal', label: 'Large-item removal / pickup concerns addressed' },
];

export const zoneStagingTaskName = (zone, point) => `Staging: ${zone.name} — ${point.label}`;

export const stagingChecklistName = (zone) => `Staging: ${zone.name}`;

// P1-4 / P1-34 — the pre-opening CUSTOMER-FLOW WALKTHROUGH, executed as
// SaleTasks (deterministic, no AI).
export const STAGING_WALKTHROUGH_TASKS = [
  { name: 'Staging Walkthrough: Where customers enter', description: 'Is the entrance obvious from the street/porch? Entry note recorded and sign placed? Record the entry in the Customer Flow card.', category: 'Execution' },
  { name: 'Staging Walkthrough: Where customers exit / where large purchases leave', description: 'Is the exit/large-item route clear of displays and queues? Record it in the Customer Flow card.', category: 'Execution' },
  { name: 'Staging Walkthrough: Checkout location identified', description: 'Is checkout placed where the line will not block merchandise, entry, or stairs? Record the checkout location.', category: 'Execution' },
  { name: 'Staging Walkthrough: Open rooms are clear for customers', description: 'Every zone planned as sale floor has customer access established (not UNCLASSIFIED).', category: 'Execution' },
  { name: 'Staging Walkthrough: Restricted areas marked and signed', description: 'Restricted areas are signed DO NOT ENTER / NOT FOR SALE without revealing private reasons.', category: 'Execution' },
  { name: 'Staging Walkthrough: Stairs and narrow passages reviewed', description: 'Record bottlenecks as SaleIssues (category customer_flow) where two people cannot pass or a queue will conflict with a doorway/stairs.', category: 'Execution' },
  { name: 'Staging Walkthrough: Queue space identified', description: 'Where the line forms, and what it must not block (entry, stairs, high-value display).', category: 'Execution' },
  { name: 'Staging Walkthrough: Furniture removal routes conflict-checked', description: 'A large item can physically leave (doorways, turns, stairs) without dismantling a display or crossing the checkout line.', category: 'Execution' },
  { name: 'Staging Walkthrough: Prices readable', description: 'Labels on merchandise, category pricing signs on grouped merchandise. No individually tracked item without a price.', category: 'Execution' },
  { name: 'Staging Walkthrough: Merchandise displayed on furniture does not hide the furniture', description: 'If merchandise sits on a for-sale piece, make it obvious the furniture itself is also for sale (sign/label).', category: 'Execution' },
  { name: 'Staging Walkthrough: First-time buyer test', description: 'Walk in as a first-time buyer: can you tell where to enter, where to shop, where NOT to go, where checkout is, how sold items are marked, and how to get out with a large purchase?', category: 'Execution' },
];

// P1-44 — reusable SALE-DAY RECOVERY task template (SaleTask only; no new system).
export const RECOVERY_TASKS = [
  { name: 'Floor recovery: Clear walkways', description: 'Walk the sale floor and clear blocked aisles and doorways.', category: 'Execution' },
  { name: 'Floor recovery: Straighten merchandise', description: 'Straighten displays and tidy tables/racks.', category: 'Execution' },
  { name: 'Floor recovery: Return abandoned items', description: 'Return merchandise shoppers left in other zones to its labeled location or the consolidation area.', category: 'Execution' },
  { name: 'Floor recovery: Check sold signs match digital status', description: 'Sold merchandise still in the house must look SOLD — reprint or place item-tied sold signs where missing.', category: 'Execution' },
  { name: 'Floor recovery: Replace missing signs', description: 'Entrance, directional, category, price, checkout, pickup and restricted-area signs present and readable.', category: 'Execution' },
  { name: 'Floor recovery: Review checkout area', description: 'Queue space clear, supplies stocked, devices charged.', category: 'Execution' },
  { name: 'Floor recovery: Review restricted areas', description: 'Restricted/staff-only areas still protected and signed.', category: 'Execution' },
  { name: 'Floor recovery: Remove empty equipment', description: 'Empty tables/racks flagged for removal or return (update the equipment assignment).', category: 'Execution' },
  { name: 'Floor recovery: Review pickup items', description: 'Sold items awaiting pickup still correctly marked and accessible for their scheduled window.', category: 'Execution' },
  { name: 'Floor recovery: Consolidate depleted displays', description: 'Merge depleted displays into stronger ones; mark the zone CONSOLIDATE where appropriate.', category: 'Execution' },
];

// P1-40 — individually tracked merchandise missing a required price.
// (Item.price is schema-required, so an UNPRICED record carries 0/empty.)
export const missingPriceItems = (items = []) =>
  items.filter(i => i.price == null || Number(i.price) <= 0);

// P1-52 — DETERMINISTIC furniture completeness (deliberately NOT an AI review).
export const furnitureCompleteness = (items = []) =>
  items
    .filter(i => (i.category || '').toLowerCase() === 'furniture')
    .map(i => ({
      id: i.id,
      title: i.title,
      item_number: i.item_number,
      missing: [
        !(i.dimensions && (i.dimensions.height || i.dimensions.width || i.dimensions.depth)) ? 'dimensions' : null,
        !i.condition ? 'condition' : null,
        (i.price == null || Number(i.price) <= 0) ? 'price' : null,
        (!(i.images || []).length && !(i.photo_library || []).length) ? 'photo' : null,
        !(i.pickup_requirements && Object.keys(i.pickup_requirements).length) ? 'pickup requirements' : null,
      ].filter(Boolean),
    }))
    .filter(f => f.missing.length > 0);

// P1-8 — display priority DERIVED from existing Item truth (no new score).
export function displayPriority(item) {
  if (item.controlled_location || item.display_attention === 'CONTROLLED_DISPLAY') return 'SECURE DISPLAY';
  if (item.inventory_level === 'HIGH_VALUE' || item.display_attention === 'HIGH_VALUE' || item.verification_status === 'SPECIALIST_REVIEWED') return 'HIGH VISIBILITY';
  if (item.featured) return 'FEATURED';
  return 'NORMAL';
}

// P1-16 — live operational state DERIVED from canonical truth only.
export function liveItemStatus(item) {
  if (item.pickup_completed_at) return 'RELEASED';
  if (item.status === 'sold') return 'AWAITING PICKUP';
  if (item.display_attention === 'CHECKOUT_HOLD') return 'HOLD';
  if (item.status === 'pending' || item.status === 'reserved') return 'HOLD';
  return 'AVAILABLE';
}

// P1-35/P1-36 — deterministic ROOM COMPLETION. A zone is READY only when the
// derived checks pass AND the operator-added staging checklist is complete.
// No percentage readiness anywhere.
export function zoneStagingReadiness(zone, { items = [], tasks = [] } = {}) {
  const zoneItems = items.filter(i => i.zone_id === zone.zone_id);
  const checklist = tasks.filter(t => (t.name || '').startsWith(stagingChecklistName(zone)));
  const derived = [
    {
      key: 'access',
      label: 'Customer access established',
      satisfied: !!zone.access_class && zone.access_class !== 'UNCLASSIFIED',
    },
    {
      key: 'pricing',
      label: 'Individually tracked merchandise priced',
      satisfied: zoneItems.length === 0 || missingPriceItems(zoneItems).length === 0,
    },
    {
      key: 'lighting',
      label: 'Lighting acceptable',
      satisfied: zone.lighting_concern === 'ok',
    },
  ];
  const checklistState = checklist.length === 0
    ? 'none'
    : checklist.every(t => t.status === 'completed') ? 'done' : 'open';
  const unsatisfied = derived.filter(c => !c.satisfied);
  const ready = unsatisfied.length === 0 && checklistState === 'done';
  return {
    derived,
    checklist,
    checklistState, // none | open | done
    ready,
    reviewState: checklistState === 'none' ? 'NOT REVIEWED' : ready ? 'READY' : 'IN PROGRESS',
  };
}

// P1-42 — deterministic LABOR THRESHOLD: actual prep/staging hours vs the
// deal's projected labor. Warning only; no AI Labor Coach.
export function laborThreshold({ laborEntries = [], deal } = {}) {
  const estimates = (deal?.labor_estimates || []).filter(e => e && Number(e.hours) > 0);
  if (estimates.length === 0) return null;
  const actualByCategory = {};
  for (const e of laborEntries || []) {
    actualByCategory[e.work_category] = (actualByCategory[e.work_category] || 0) + (Number(e.hours) || 0);
  }
  const rows = estimates
    .map(est => {
      const actual = actualByCategory[est.category] || 0;
      return {
        category: est.category,
        estimated: Number(est.hours) || 0,
        actual,
        ratio: (Number(est.hours) || 0) > 0 ? actual / Number(est.hours) : null,
      };
    })
    .filter(r => r.ratio !== null);
  const exceeded = rows.filter(r => r.ratio >= 1);
  const approaching = rows.filter(r => r.ratio >= 0.8 && r.ratio < 1);
  if (exceeded.length === 0 && approaching.length === 0) return null;
  return {
    level: exceeded.length > 0 ? 'exceeded' : 'approaching',
    rows: [...exceeded, ...approaching],
  };
}

// P1-38/P1-39 — OPENING READINESS assembled from canonical records. Blockers
// are reserved for genuinely important conditions; cosmetic polish never blocks.
export function openingReadiness({ sale, zones = [], items = [], issues = [], tasks = [], laborEntries = [], deal } = {}) {
  const blockers = [];
  const warnings = [];

  const openIssues = issues.filter(i => (i.status || 'OPEN') === 'OPEN' || i.status === 'WAITING');
  const openingBlockers = openIssues.filter(i =>
    (i.blocking_areas || []).includes('sale_opening') &&
    ['safety', 'customer_flow', 'property_access'].includes(i.category || 'other'));
  for (const b of openingBlockers) {
    blockers.push(`Open ${((b.category || '').replace(/_/g, ' '))} issue blocks opening: "${b.title}"`);
  }

  const unpriced = missingPriceItems(items);
  if (unpriced.length > 0) blockers.push(`${unpriced.length} individually tracked item${unpriced.length === 1 ? '' : 's'} with no price — price them or record an operator override before opening.`);

  const checkoutTasks = tasks.filter(t => (t.name || '').startsWith('Checkout Setup:'));
  const hasCheckoutLocation = !!(sale?.customer_flow?.checkout_location);
  if (!hasCheckoutLocation && checkoutTasks.length === 0) {
    blockers.push('Checkout not configured — record a checkout location and review checkout setup.');
  } else if (hasCheckoutLocation && checkoutTasks.length > 0 && !checkoutTasks.every(t => t.status === 'completed')) {
    warnings.push('Checkout setup reviewed only partially.');
  }

  const saleFloorZones = zones.filter(z => (z.staging_purpose || '') === 'SALE_FLOOR');
  for (const z of saleFloorZones) {
    if (!z.access_class || z.access_class === 'UNCLASSIFIED') {
      warnings.push(`Zone "${z.name}" is planned as sale floor but customer access is UNCLASSIFIED.`);
    }
    if (z.lighting_concern === 'insufficient' || z.lighting_concern === 'additional_needed') {
      warnings.push(`Lighting concern in "${z.name}" — review before/after opening.`);
    }
    if (z.flow_concerns) {
      warnings.push(`Customer-flow concern recorded in "${z.name}" — confirm it is resolved or signed.`);
    }
  }

  const researchHolds = items.filter(i =>
    i.research_status && !['CLEAR', 'READY_TO_PRICE'].includes(i.research_status) && !i.research_override_at);
  if (researchHolds.length > 0) {
    warnings.push(`${researchHolds.length} item${researchHolds.length === 1 ? '' : 's'} on research hold without an operator override — pricing/publication stays guarded.`);
  }

  const threshold = laborThreshold({ laborEntries, deal });
  if (threshold) {
    warnings.push(threshold.level === 'exceeded'
      ? `Actual labor has EXCEEDED the estimate in ${threshold.rows.length} categor${threshold.rows.length === 1 ? 'y' : 'ies'} — review where hours are going.`
      : `Actual labor is approaching the estimate in ${threshold.rows.length} categor${threshold.rows.length === 1 ? 'y' : 'ies'}.`);
  }

  const verdict = blockers.length > 0
    ? 'NOT READY — BLOCKERS'
    : warnings.length > 0 ? 'READY WITH WARNINGS' : 'READY';

  return { verdict, blockers, warnings, unpricedCount: unpriced.length, threshold };
}