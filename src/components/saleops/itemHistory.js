import { base44 } from '@/api/base44Client';

// Chapter 15 P1-30 — item change history REUSES the Activity entity (item_id link).
// There is no ItemHistory entity. History is best-effort: it must never block the
// operational save that produced it.
export async function logItemEvent({ saleId, operatorId, itemId, subject, description }) {
  try {
    const user = await base44.auth.me();
    await base44.entities.Activity.create({
      user_id: user.id,
      activity_type: 'note',
      sale_id: saleId || undefined,
      operator_id: operatorId || undefined,
      item_id: itemId,
      subject,
      description,
      status: 'completed',
    });
  } catch (e) {
    console.warn('Item history log skipped:', e?.message);
  }
}

// Convenience wrapper for the consequential changes Chapter 15 tracks:
// inventory level, price, availability/sale state, verification, custody movement.
export function logItemChange(kind, item, detail, { saleId, operatorId } = {}) {
  const labels = {
    level: 'Inventory level changed',
    price: 'Price changed',
    status: 'Sale state changed',
    verification: 'Verification changed',
    custody: 'Custody movement',
    created: 'Item created',
  };
  if (!item?.id) return Promise.resolve();
  return logItemEvent({
    saleId,
    operatorId,
    itemId: item.id,
    subject: `${labels[kind] || 'Item change'} — ${item.title || 'Item'}`,
    description: detail,
  });
}