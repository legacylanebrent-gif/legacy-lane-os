// Shared helpers for pricing signs.
//
//  • How a price cell prints (a range, a "starts at" value, or wording such as
//    "30% OFF" / "Price separately").
//  • Which rows actually print — an item the operator deselected never reaches
//    the page.
//  • How a saved per sale sign becomes a printable template, so a custom or
//    modified sign prints through the same renderer as the library.

export const money = (value) => {
  if (value === '' || value === null || value === undefined) return '';
  const num = Number(value);
  if (!Number.isFinite(num)) return '';
  return `$${Number.isInteger(num) ? num : num.toFixed(2)}`;
};

export const priceRowText = (row) => {
  if (!row) return '';
  if (row.mode === 'text') return row.text || row.price || '';
  if (row.mode === 'starts_at') {
    const starts = money(row.starts_at);
    return starts ? `Starts at ${starts}` : '';
  }
  const min = money(row.min);
  const max = money(row.max);
  if (min && max) return `${min} – ${max}`;
  if (min) return `Starts at ${min}`;
  if (max) return `Up to ${max}`;
  return row.price || '';
};

export const printableRows = (rows) => (rows || []).filter((row) => row && row.included !== false);

export const customSignToTemplate = (record) => ({
  id: record.id,
  name: record.name,
  category: 'pricing',
  layout: 'price-pages',
  pages: [{
    eyebrow: 'Price Guide',
    heading: record.heading || record.name,
    rows: printableRows(record.rows),
  }],
});