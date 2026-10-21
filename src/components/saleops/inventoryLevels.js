// Chapter 15 P1 — inventory level model. ONE Item entity, four workflow DEPTHS.
// Level is workflow depth, never value-only truth (P1-2), never automatic: these are
// deterministic GUIDANCE helpers; the human operator always chooses.

export const LEVELS = ['QUICK', 'STANDARD', 'RESEARCH', 'HIGH_VALUE'];

export const LEVEL_META = {
  QUICK: {
    label: 'Quick',
    description: 'Ordinary low-value merchandise. Minimal documentation — record it fast and keep moving.',
    hint: 'Title, price, zone. Nothing else forced.',
  },
  STANDARD: {
    label: 'Standard',
    description: 'Normal sale merchandise with fuller identification and a QR label.',
    hint: 'Photos, condition, dimensions where relevant.',
  },
  RESEARCH: {
    label: 'Research',
    description: 'Research workflow is prominent: evidence, notes, verification before pricing.',
    hint: 'Marks/serial evidence, research notes, verification status.',
  },
  HIGH_VALUE: {
    label: 'High Value',
    description: 'Stronger operational controls: custody, controlled location, pickup control. Not an appraisal.',
    hint: 'Custody chain, controlled location, offers/pickup attention.',
  },
};

export function levelRank(level) {
  const i = LEVELS.indexOf(level);
  return i < 0 ? 1 : i; // unknown levels behave as STANDARD
}

// P1-9 — deterministic operator guidance. These DEFAULTS are the smallest built-in rule
// set; the operator's Company.inventory_rules overrides them. Every rule produces a
// SUGGESTION the human may accept or ignore — never automatic truth.
export const DEFAULT_RULES = [
  { rule_id: 'def-books', category: 'books_media', max_price: 20, suggested_level: 'QUICK', note: 'Ordinary low-value media — QUICK keeps it fast.', enabled: true },
  { rule_id: 'def-kitchen', category: 'kitchen_dining', max_price: 15, suggested_level: 'QUICK', note: 'Ordinary low-value kitchenware — QUICK keeps it fast.', enabled: true },
  { rule_id: 'def-clothing', category: 'clothing_accessories', max_price: 15, suggested_level: 'QUICK', note: 'Ordinary low-value clothing — QUICK keeps it fast.', enabled: true },
  { rule_id: 'def-furniture', category: 'furniture', suggested_level: 'STANDARD', note: 'Furniture usually earns fuller identification and a QR label.', enabled: true },
  { rule_id: 'def-art', category: 'art', suggested_level: 'RESEARCH', note: 'Signed or attributed art deserves evidence before pricing.', enabled: true },
  { rule_id: 'def-antiques', category: 'antiques', suggested_level: 'RESEARCH', note: 'Antiques often warrant a closer look before pricing.', enabled: true },
  { rule_id: 'def-collectibles', category: 'collectibles', suggested_level: 'RESEARCH', note: 'Collectibles — consider marks/edition evidence before pricing.', enabled: true },
  { rule_id: 'def-jewelry', category: 'jewelry', suggested_level: 'HIGH_VALUE', note: 'Jewelry is pickup-controlled and specialist-adjacent — consider HIGH VALUE.', enabled: true },
  { rule_id: 'def-coins', category: 'coins_currency', suggested_level: 'HIGH_VALUE', note: 'Coins/currency are controlled merchandise — consider HIGH VALUE.', enabled: true },
  { rule_id: 'def-vehicles', category: 'vehicles', suggested_level: 'RESEARCH', note: 'Vehicles warrant verification (VIN, title considerations).', enabled: true },
  { rule_id: 'def-highprice', min_price: 500, suggested_level: 'HIGH_VALUE', note: 'Higher-value merchandise — consider custody and pickup control.', enabled: true },
];

// First matching rule wins; category rules are checked before pure price rules,
// most specific (both category AND price constraints) first.
export function suggestLevel({ category, price, rules }) {
  const all = [...(rules || []), ...DEFAULT_RULES].filter(r => r.enabled !== false);
  const matches = all.filter(r => {
    if (r.category && r.category !== category) return false;
    const p = Number(price);
    if (r.min_price != null && !(p >= r.min_price)) return false;
    if (r.max_price != null && !(p > 0 && p <= r.max_price)) return false;
    if (!r.category && r.min_price == null && r.max_price == null) return false;
    return true;
  });
  matches.sort((a, b) => (b.category ? 1 : 0) - (a.category ? 1 : 0));
  const rule = matches[0];
  if (!rule) return null;
  return { level: rule.suggested_level, note: rule.note || '', rule_id: rule.rule_id };
}

// P1-59 — deterministic readiness cues. NO percentages, ever.
export function readinessCues(item) {
  const cues = [];
  if (!item) return cues;
  if (item.research_status && item.research_status !== 'CLEAR' && !item.research_override_at) {
    cues.push({ key: 'RESEARCH_REQUIRED', label: 'Research required', tone: 'amber' });
    return cues; // research blocks the rest of the honest path
  }
  if (item.price == null || item.price <= 0) {
    cues.push({ key: 'NEEDS_PRICE', label: 'Needs price', tone: 'amber' });
  }
  const level = item.inventory_level || 'STANDARD';
  const hasPhotos = (item.images || []).length > 0 || (item.photo_library || []).length > 0;
  if (levelRank(level) >= 1 && !hasPhotos && item.status !== 'sold') {
    cues.push({ key: 'NEEDS_PHOTO', label: 'Needs a photo', tone: 'slate' });
  }
  if (item.status === 'sold' && !item.pickup_completed_at) {
    cues.push({ key: 'PICKUP_INFORMATION_NEEDED', label: 'Pickup information needed', tone: 'blue' });
  }
  if (cues.length === 0 && item.status === 'available') {
    cues.push({ key: 'READY_FOR_SALE', label: 'Ready for sale', tone: 'green' });
  }
  return cues;
}

// P1-15 — combined location display: "Garage — Back Wall".
export function locationDisplay(item, zones) {
  const zone = (zones || []).find(z => z.zone_id === item?.zone_id);
  const parts = [];
  if (zone) parts.push(zone.name);
  if (item?.location_detail) parts.push(item.location_detail);
  return parts.join(' — ');
}

export function formatItemNumber(n) {
  return n == null ? '' : `#${String(n).padStart(4, '0')}`;
}