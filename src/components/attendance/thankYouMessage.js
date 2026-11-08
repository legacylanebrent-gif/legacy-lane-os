import { format } from 'date-fns';

// Plain, honest building blocks for the post-sale thank-you message.
// Nothing here sends anything — it only assembles operator-written copy.

export function attendeeNames(checkins = []) {
  const names = checkins
    .filter((c) => c && c.check_in_type === 'sale_visit')
    .map((c) => (c.notes || '').replace('QR check-in by ', '').trim())
    .filter((n) => n && n !== 'Manual count' && n !== 'Exit counted');
  return [...new Set(names)];
}

export function saleAddressText(sale) {
  const a = sale?.property_address || {};
  return [a.street, [a.city, a.state].filter(Boolean).join(', '), a.zip]
    .filter(Boolean)
    .join(', ');
}

export function saleScheduleText(sale) {
  const dates = (sale?.sale_dates || [])
    .filter((d) => d?.date)
    .slice()
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  if (dates.length === 0) return '';

  return dates
    .map((d) => {
      const day = format(new Date(`${d.date}T12:00:00`), 'EEEE, MMMM d, yyyy');
      const times = [d.start_time, d.end_time].filter(Boolean).join(' – ');
      return times ? `${day} · ${times}` : day;
    })
    .join('\n');
}

export function salePublicUrl(id, origin) {
  if (!id) return '';
  const base = origin || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}/EstateSaleDetail?id=${id}`;
}

export function buildThankYouMessage({ draft, nextSale, sale, origin }) {
  const blocks = [];

  if (draft.greeting?.trim()) blocks.push(draft.greeting.trim());
  if (draft.body?.trim()) blocks.push(draft.body.trim());

  if (nextSale) {
    const lines = [`Next up: ${nextSale.title}`];
    const schedule = saleScheduleText(nextSale);
    const address = saleAddressText(nextSale);
    if (schedule) lines.push(schedule);
    if (address) lines.push(address);
    if (draft.includeLink) {
      const url = salePublicUrl(nextSale.id, origin);
      if (url) lines.push(url);
    }
    blocks.push(lines.join('\n'));
  }

  const signOff = (draft.signOff || '').trim()
    || sale?.company_name
    || sale?.operator_name
    || '';
  if (signOff) blocks.push(signOff);

  return blocks.join('\n\n');
}

export function buildThankYouSubject({ sale, nextSale }) {
  const host = sale?.company_name || sale?.operator_name || '';
  if (nextSale) return `Thank you for visiting ${sale?.title || 'our sale'} — next up: ${nextSale.title}`;
  return `Thank you for visiting ${sale?.title || 'our sale'}${host ? ` from ${host}` : ''}`;
}