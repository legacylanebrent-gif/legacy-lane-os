/**
 * Generate and download an ICS calendar file for an estate sale.
 */
export function downloadSaleCalendar(sale) {
  if (!sale || !sale.sale_dates || sale.sale_dates.length === 0) return;

  const title = sale.title || 'Estate Sale';
  const description = sale.description || '';
  const address = sale.property_address
    ? `${sale.property_address.street || ''}, ${sale.property_address.city || ''}, ${sale.property_address.state || ''} ${sale.property_address.zip || ''}`.trim()
    : '';

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//EstateSalen.com//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  (sale.sale_dates || []).forEach((sd) => {
    if (!sd.date) return;
    const dateParts = sd.date.split('-');
    const year = dateParts[0];
    const month = dateParts[1];
    const day = dateParts[2];

    const startTime = sd.start_time || '09:00';
    const endTime = sd.end_time || '16:00';

    const startPad = (t) => {
      const [h, m] = t.split(':');
      return `${h.padStart(2, '0')}${(m || '00').padStart(2, '0')}00`;
    };

    const dtStart = `${year}${month}${day}T${startPad(startTime)}`;
    const dtEnd = `${year}${month}${day}T${startPad(endTime)}`;

    const uid = `${sale.id}-${year}${month}${day}@estatesalen.com`;

    lines.push(
      'BEGIN:VEVENT',
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${title}`,
      description ? `DESCRIPTION:${description.replace(/\n/g, '\\n')}` : '',
      address ? `LOCATION:${address}` : '',
      `UID:${uid}`,
      'END:VEVENT'
    );
  });

  lines.push('END:VCALENDAR');

  const icsContent = lines.filter(Boolean).join('\r\n');
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}