/**
 * Formats a raw phone number string into (XXX) XXX-XXXX format.
 * Handles 10-digit US numbers. Strips non-digits first.
 * Returns the original string if it can't be formatted cleanly.
 */
export function formatPhone(raw) {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  }
  if (digits.length === 11 && digits[0] === '1') {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 11)}`;
  }
  // Return as-is for unusual lengths
  return raw;
}