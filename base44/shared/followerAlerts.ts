// followerAlerts — the one place that builds and delivers a company's official "new sale"
// notification to the people who follow that company.
//
// On-site only by design: following a company alerts people inside EstateSalen through the
// Notification records here. No email is sent from this pipeline.
//
// Two callers share it:
//   notifyCompanyFollowers — the company releases its alert instantly (at publish).
//   dispatchSaleAlerts     — the company releases it at its own chosen time of day.
//
// Idempotent per (follower, sale): the Notification record for that sale IS the receipt, so a
// re-saved sale, a retried dispatch or a duplicate event never alerts the same person twice.

const ET_TZ = 'America/New_York';
export const DEFAULT_ALERT_TIME = '09:00';

/** Today's date key plus current hour/minute in Eastern Time. */
export function etNow(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ET_TZ,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).formatToParts(date).reduce((acc, p) => {
    if (p.type !== 'literal') acc[p.type] = p.value;
    return acc;
  }, {});
  const hour = Number(parts.hour) % 24;
  return {
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number.isFinite(hour) ? hour : 0,
    minute: Number(parts.minute) || 0
  };
}

/** The next moment (ISO) that "HH:MM" Eastern Time comes around, today or tomorrow. */
export function nextEtOccurrence(hhmm) {
  const raw = String(hhmm || DEFAULT_ALERT_TIME);
  const match = /^(\d{1,2}):(\d{2})$/.exec(raw.trim());
  const hour = match ? Math.min(23, Math.max(0, Number(match[1]))) : 9;
  const minute = match ? Math.min(59, Math.max(0, Number(match[2]))) : 0;
  const now = etNow();
  let delta = hour * 60 + minute - (now.hour * 60 + now.minute);
  if (delta <= 0) delta += 24 * 60;
  return new Date(Date.now() + delta * 60000).toISOString();
}

export function salePlace(sale) {
  const address = sale?.property_address || {};
  return [address.city, address.state].filter(Boolean).join(', ');
}

async function loadFollowers(base44, operatorId) {
  const follows = await base44.asServiceRole.entities.CompanyFollow.filter({ operator_id: operatorId });
  // One row per follower: the same person can hold more than one follow record for a company,
  // and a person is alerted once, never once per row.
  const byUser = new Map();
  for (const f of follows || []) {
    if (!f.consumer_user_id || f.consumer_user_id === operatorId) continue;
    const prev = byUser.get(f.consumer_user_id);
    if (!prev || (prev.notify_inapp === false && f.notify_inapp !== false)) {
      byUser.set(f.consumer_user_id, f);
    }
  }
  return [...byUser.values()];
}

/**
 * Delivers the official new-sale notification to a company's followers.
 * instantOnly = true keeps out anyone who asked not to be alerted instantly — they still see
 * the company's sale in EstateSalen's daily roundup instead.
 */
export async function deliverFollowerAlerts(base44, sale, { instantOnly = false } = {}) {
  const followers = await loadFollowers(base44, sale.operator_id);
  if (followers.length === 0) return { followers: 0, notified: 0, reason: 'no followers' };

  const opted = followers.filter((f) => f.notify_inapp !== false);
  if (opted.length === 0) return { followers: followers.length, notified: 0, reason: 'followers turned alerts off' };

  const userIds = opted.map((f) => f.consumer_user_id);
  const prefRows = await base44.asServiceRole.entities.NotificationPreference.filter({ user_id: { $in: userIds } });
  const prefById = {};
  (prefRows || []).forEach((p) => { prefById[p.user_id] = p; });

  const targets = opted.filter((f) => {
    const pref = prefById[f.consumer_user_id];
    if (pref?.sale_update_in_app === false) return false;
    if (instantOnly && pref?.company_sale_alerts_instant === false) return false;
    return true;
  });
  if (targets.length === 0) return { followers: followers.length, notified: 0, reason: 'no one wants this alert' };

  // Receipts already written for this sale — anyone holding one is never alerted twice.
  const prior = await base44.asServiceRole.entities.Notification.filter({
    related_entity_type: 'EstateSale',
    related_entity_id: sale.id
  });
  const alreadyNotified = new Set((prior || []).map((n) => n.user_id));

  const fresh = targets.filter((f) => !alreadyNotified.has(f.consumer_user_id));
  if (fresh.length === 0) return { followers: followers.length, notified: 0, reason: 'already notified' };

  const company = sale.operator_name || 'A company you follow';
  const place = salePlace(sale);
  const records = fresh.map((f) => ({
    user_id: f.consumer_user_id,
    type: 'sale_update',
    title: `New sale from ${company}`,
    message: `${sale.title || 'Estate sale'}${place ? ` in ${place}` : ''}`,
    link_to_page: 'EstateSaleDetail',
    link_params: `id=${sale.id}`,
    related_entity_type: 'EstateSale',
    related_entity_id: sale.id,
    read: false
  }));

  await base44.asServiceRole.entities.Notification.bulkCreate(records);
  return { followers: followers.length, notified: records.length, company };
}