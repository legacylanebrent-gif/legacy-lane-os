// What the payment signs print: which methods the operator actually accepts,
// the Zelle, Venmo and Cash App QR codes from the business profile (a sale's
// own payment settings win when the seller uploaded one there), and which cards
// are and are not accepted. Apple Pay has no QR of its own — it prints as an
// accepted method only. Nothing here is invented: a method, handle or QR that is
// not on the profile or the sale is simply left off the sign.

export const CARD_BRANDS = [
  { value: 'visa', label: 'Visa' },
  { value: 'mastercard', label: 'Mastercard' },
  { value: 'discover', label: 'Discover' },
  { value: 'american_express', label: 'American Express' },
  { value: 'debit', label: 'Debit Cards' },
];

export const PAYMENT_METHOD_LABELS = {
  cash: 'Cash',
  check: 'Check',
  credit_card: 'Credit Card',
  zelle: 'Zelle',
  venmo: 'Venmo',
  paypal: 'PayPal',
  cashapp: 'Cash App',
  apple_pay: 'Apple Pay',
  stripe: 'Stripe',
  square: 'Square',
  other: 'Other',
};

const norm = (value) => String(value || '').toLowerCase();

export const methodLabel = (value) => PAYMENT_METHOD_LABELS[norm(value)] || String(value || '');

export const cardBrandLabel = (value) =>
  CARD_BRANDS.find((b) => b.value === norm(value))?.label || String(value || '');

/**
 * Resolve everything a payment sign needs.
 * @param {object} user         the signed-in operator (business profile)
 * @param {object} saleOptions  optional SalePaymentOptions record for this sale
 */
export function resolvePaymentSignData(user, saleOptions) {
  const saleMethods = Array.isArray(saleOptions?.methods) ? saleOptions.methods.map(norm) : [];
  const profileMethods = Array.isArray(user?.payment_methods_accepted)
    ? user.payment_methods_accepted.map(norm)
    : [];
  const methods = saleMethods.length ? saleMethods : profileMethods;

  const selectedBrands = (Array.isArray(user?.accepted_card_brands) ? user.accepted_card_brands : []).map(norm);
  const accepted = CARD_BRANDS.filter((b) => selectedBrands.includes(b.value)).map((b) => b.label);
  // Nothing chosen yet means nothing is known — never print a brand as refused.
  const declined = accepted.length
    ? CARD_BRANDS.filter((b) => !selectedBrands.includes(b.value)).map((b) => b.label)
    : [];

  return {
    methods,
    acceptsCards: methods.includes('credit_card'),
    cards: { accepted, declined },
    zelle: {
      handle: saleOptions?.zelle_handle || user?.zelle_phone_or_email || '',
      qrUrl: saleOptions?.zelle_qr_url || user?.zelle_qr_code || '',
    },
    venmo: {
      handle: saleOptions?.venmo_handle || user?.venmo_username || '',
      qrUrl: saleOptions?.venmo_qr_url || user?.venmo_qr_code || '',
    },
    cashapp: {
      handle: user?.cashapp_tag || '',
      qrUrl: user?.cashapp_qr_code || '',
    },
    // Apple Pay is tap to pay on the customer's own phone, so there is no QR
    // or handle to print — only whether it is accepted.
    acceptsApplePay: methods.includes('apple_pay'),
  };
}