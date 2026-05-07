/**
 * Returns true if the sale address should be visible to consumers/guests.
 * Address is revealed 24 hours before the first sale date/start time.
 */
export function isSaleAddressVisible(sale) {
  if (!sale?.sale_dates || sale.sale_dates.length === 0) return false;

  const firstDate = sale.sale_dates[0];
  if (!firstDate?.date) return false;

  let startDateTime;
  if (firstDate.start_time) {
    startDateTime = new Date(`${firstDate.date}T${convertTo24Hour(firstDate.start_time)}`);
  } else {
    startDateTime = new Date(firstDate.date);
    startDateTime.setHours(0, 0, 0, 0);
  }

  const now = new Date();
  const twentyFourHoursBefore = new Date(startDateTime.getTime() - 24 * 60 * 60 * 1000);
  return now >= twentyFourHoursBefore;
}

function convertTo24Hour(time) {
  if (!time) return '00:00';
  if (!time.includes('AM') && !time.includes('PM') && !time.includes('am') && !time.includes('pm')) {
    return time.length >= 4 ? time : time.padStart(5, '0');
  }
  const [t, modifier] = time.split(' ');
  let [hours, minutes] = t.split(':');
  if (modifier?.toUpperCase() === 'PM' && hours !== '12') hours = String(parseInt(hours) + 12);
  if (modifier?.toUpperCase() === 'AM' && hours === '12') hours = '00';
  return `${hours.padStart(2, '0')}:${(minutes || '00').padStart(2, '0')}`;
}