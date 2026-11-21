// The three answers an operator gives for a room, and how each one carries
// over to the team's room list (prep zone) on the sale.

export const ROOM_SCOPE_OPTIONS = [
  {
    key: 'all_items',
    label: 'All items for sale',
    helper: 'Everything in this room is priced and for sale.',
    access_class: 'OPEN_TO_CUSTOMERS',
    staging_purpose: 'SALE_FLOOR',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  {
    key: 'some_items',
    label: 'Some items for sale',
    helper: 'Customers may come in, but only marked items are for sale.',
    access_class: 'OPEN_TO_CUSTOMERS',
    staging_purpose: 'SALE_FLOOR',
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  {
    key: 'do_not_enter',
    label: 'Do not enter',
    helper: 'Customers stay out. Nothing in this room is for sale.',
    access_class: 'CLOSED_RESTRICTED',
    staging_purpose: 'OTHER',
    badge: 'bg-red-100 text-red-800 border-red-200',
  },
];

export const ROOM_NAME_SUGGESTIONS = [
  'Living Room', 'Kitchen', 'Dining Room', 'Primary Bedroom',
  'Bedroom', 'Bathroom', 'Garage', 'Basement', 'Office', 'Attic', 'Shed',
];

export const scopeOption = (key) =>
  ROOM_SCOPE_OPTIONS.find(o => o.key === key) || ROOM_SCOPE_OPTIONS[0];

export const newZoneId = () =>
  `zone_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// The room the team sees in the room list. Same name, same answer, one record.
export function zoneFromRoom({ name, saleScope, workerNotes }) {
  const opt = scopeOption(saleScope);
  return {
    zone_id: newZoneId(),
    name,
    source_type: 'MANUAL',
    prep_status: 'untouched',
    access_class: opt.access_class,
    staging_purpose: opt.staging_purpose,
    security_flags: [],
    notes: workerNotes || '',
    removal_route_note: '',
    protection_note: '',
  };
}