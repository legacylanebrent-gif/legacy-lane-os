// Chapter 3 P1 — extracted from SaleEditor to keep the page within maintainable size.
export const SALE_STATUSES = ['draft', 'upcoming', 'active', 'completed', 'archived'];

export const formatTimeAMPM = (timeStr) => {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
};