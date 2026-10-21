// Chapter 8 P1 — shared equipment constants and DETERMINISTIC state logic.
// One model for EquipmentAsset / SaleKitTemplate / SaleEquipmentAssignment surfaces.

export const EQUIPMENT_CATEGORIES = [
  'CHECKOUT', 'SIGNAGE', 'STAGING', 'DISPLAY', 'SECURITY',
  'TECHNOLOGY', 'LIGHTING', 'CLEANING', 'PACKING', 'STORAGE', 'OTHER',
];

// Kit/consumable entries may use the asset categories plus a SUPPLIES bucket.
export const KIT_CATEGORY_OPTIONS = [...EQUIPMENT_CATEGORIES, 'SUPPLIES'];

export const ASSET_STATUSES = ['AVAILABLE', 'AT_SALE', 'MAINTENANCE', 'RETIRED'];

export const ASSET_CONDITIONS = ['GOOD', 'FAIR', 'REPAIR_NEEDED', 'REPLACE_SOON'];

export const ENTRY_TYPES = ['REUSABLE_EQUIPMENT', 'CONSUMABLE', 'REQUIREMENT'];

export const ENTRY_TYPE_LABELS = {
  REUSABLE_EQUIPMENT: 'Reusable equipment',
  CONSUMABLE: 'Consumable / supply',
  REQUIREMENT: 'Requirement',
};

export const PACKOUT_STATES = ['PENDING', 'RETURNED', 'DAMAGED', 'MISSING', 'LEFT_INTENTIONALLY'];

export const PACKOUT_LABELS = {
  PENDING: 'Not back yet',
  RETURNED: 'Returned',
  DAMAGED: 'Damaged',
  MISSING: 'Missing',
  LEFT_INTENTIONALLY: 'Left intentionally',
};

// Deterministic pack-out -> asset status. A MISSING asset never silently
// returns to AVAILABLE (it stays AT_SALE until the operator resolves it);
// LEFT_INTENTIONALLY retires the asset from company stock.
export const PACKOUT_ASSET_STATUS = {
  RETURNED: 'AVAILABLE',
  DAMAGED: 'MAINTENANCE',
  MISSING: 'AT_SALE',
  LEFT_INTENTIONALLY: 'RETIRED',
};

export const DISPLAY_ATTENTION_OPTIONS = ['NONE', 'HIGH_VALUE', 'CONTROLLED_DISPLAY', 'CHECKOUT_HOLD', 'STAFF_ATTENTION'];

export const DISPLAY_ATTENTION_LABELS = {
  NONE: 'None',
  HIGH_VALUE: 'High value',
  CONTROLLED_DISPLAY: 'Controlled display',
  CHECKOUT_HOLD: 'Checkout hold',
  STAFF_ATTENTION: 'Staff attention',
};

export const asList = (res) => (Array.isArray(res) ? res : (res?.items || []));