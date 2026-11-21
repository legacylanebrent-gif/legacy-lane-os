// Built-in every-sale equipment list. This is the short, practical kit an
// estate sale always needs, so an operator never retypes the same equipment
// sale after sale. Quantities are a suggested starting count the operator can
// change; nothing here is a company asset or a charge.

export const DEFAULT_EQUIPMENT = [
  // Checkout
  { key: 'checkout-table', name: 'Checkout table', category: 'CHECKOUT', entry_type: 'REUSABLE_EQUIPMENT', qty: 1 },
  { key: 'cash-box', name: 'Cash box / till', category: 'CHECKOUT', entry_type: 'REUSABLE_EQUIPMENT', qty: 1 },
  { key: 'card-reader', name: 'Card reader', category: 'CHECKOUT', entry_type: 'REUSABLE_EQUIPMENT', qty: 1 },
  { key: 'calculator', name: 'Calculator', category: 'CHECKOUT', entry_type: 'REUSABLE_EQUIPMENT', qty: 1 },
  { key: 'deposit-bag', name: 'Cash deposit bag', category: 'CHECKOUT', entry_type: 'REUSABLE_EQUIPMENT', qty: 1 },

  // Staging & display
  { key: 'folding-tables', name: 'Folding tables (6 ft)', category: 'STAGING', entry_type: 'REUSABLE_EQUIPMENT', qty: 4 },
  { key: 'table-covers', name: 'Table covers', category: 'STAGING', entry_type: 'REUSABLE_EQUIPMENT', qty: 4 },
  { key: 'chairs', name: 'Chairs (staff)', category: 'STAGING', entry_type: 'REUSABLE_EQUIPMENT', qty: 2 },
  { key: 'clothing-racks', name: 'Clothing racks', category: 'DISPLAY', entry_type: 'REUSABLE_EQUIPMENT', qty: 2 },
  { key: 'hangers', name: 'Hangers (box)', category: 'DISPLAY', entry_type: 'CONSUMABLE', qty: 1 },
  { key: 'display-risers', name: 'Display risers / shelves', category: 'DISPLAY', entry_type: 'REUSABLE_EQUIPMENT', qty: 2 },

  // Technology & power
  { key: 'checkout-device', name: 'Checkout tablet / device', category: 'TECHNOLOGY', entry_type: 'REUSABLE_EQUIPMENT', qty: 1 },
  { key: 'extension-cords', name: 'Extension cords', category: 'TECHNOLOGY', entry_type: 'REUSABLE_EQUIPMENT', qty: 2 },
  { key: 'power-strips', name: 'Power strips', category: 'TECHNOLOGY', entry_type: 'REUSABLE_EQUIPMENT', qty: 2 },
  { key: 'chargers', name: 'Device chargers / power bank', category: 'TECHNOLOGY', entry_type: 'REUSABLE_EQUIPMENT', qty: 1 },

  // Signage & security
  { key: 'sale-signs', name: 'Sale signs (directional)', category: 'SIGNAGE', entry_type: 'REUSABLE_EQUIPMENT', qty: 6 },
  { key: 'staff-only-signs', name: '"Staff Only" signs', category: 'SIGNAGE', entry_type: 'REUSABLE_EQUIPMENT', qty: 3 },
  { key: 'stanchions', name: 'Stanchions / rope barriers', category: 'SECURITY', entry_type: 'REUSABLE_EQUIPMENT', qty: 2 },

  // Supplies
  { key: 'price-labels', name: 'Price labels / stickers', category: 'SUPPLIES', entry_type: 'CONSUMABLE', qty: 1 },
  { key: 'markers', name: 'Markers', category: 'SUPPLIES', entry_type: 'CONSUMABLE', qty: 3 },
  { key: 'packing-tape', name: 'Packing tape', category: 'SUPPLIES', entry_type: 'CONSUMABLE', qty: 2 },
  { key: 'shopping-bags', name: 'Shopping bags', category: 'SUPPLIES', entry_type: 'CONSUMABLE', qty: 1 },
  { key: 'zip-ties', name: 'Zip ties', category: 'SUPPLIES', entry_type: 'CONSUMABLE', qty: 1 },
  { key: 'bubble-wrap', name: 'Bubble wrap / packing paper', category: 'SUPPLIES', entry_type: 'CONSUMABLE', qty: 1 },

  // Cleaning
  { key: 'trash-bags', name: 'Trash bags', category: 'CLEANING', entry_type: 'CONSUMABLE', qty: 1 },
  { key: 'broom', name: 'Broom & dustpan', category: 'CLEANING', entry_type: 'REUSABLE_EQUIPMENT', qty: 1 },
  { key: 'paper-towels', name: 'Paper towels & cleaner', category: 'CLEANING', entry_type: 'CONSUMABLE', qty: 1 },
  { key: 'hand-sanitizer', name: 'Hand sanitizer', category: 'CLEANING', entry_type: 'CONSUMABLE', qty: 1 },

  // Other
  { key: 'hand-truck', name: 'Hand truck / dolly', category: 'OTHER', entry_type: 'REUSABLE_EQUIPMENT', qty: 1 },
  { key: 'step-ladder', name: 'Step ladder', category: 'OTHER', entry_type: 'REUSABLE_EQUIPMENT', qty: 1 },
  { key: 'tool-kit', name: 'Tool kit', category: 'OTHER', entry_type: 'REUSABLE_EQUIPMENT', qty: 1 },
  { key: 'first-aid', name: 'First aid kit', category: 'OTHER', entry_type: 'REQUIREMENT', qty: 1 },
  { key: 'crew-water', name: 'Water / cooler for crew', category: 'OTHER', entry_type: 'CONSUMABLE', qty: 1 },
];

export const DEFAULT_EQUIPMENT_CATEGORIES = [...new Set(DEFAULT_EQUIPMENT.map(d => d.category))];