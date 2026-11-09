// Payment rules for DIY / guest sellers.
//
// A guest seller has no card processing, so a card method can never be offered
// to shoppers at their sale. Their offline methods are limited to these four.
export const GUEST_PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'zelle', label: 'Zelle' },
  { value: 'venmo', label: 'Venmo' },
];

export const GUEST_PAYMENT_VALUES = GUEST_PAYMENT_METHODS.map((m) => m.value);

export const isGuestSeller = (user) => user?.primary_account_type === 'diy_seller';

export const guestPaymentMethods = (list = []) =>
  (list || []).filter((m) => GUEST_PAYMENT_VALUES.includes(m));

export const labelForMethod = (value) =>
  GUEST_PAYMENT_METHODS.find((m) => m.value === value)?.label ||
  String(value || '').replace(/_/g, ' ');