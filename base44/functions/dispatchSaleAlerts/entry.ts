// dispatchSaleAlerts — the scheduled release path for new-sale alerts. Runs every 15 minutes.
//
// Two jobs, both on-site notifications only:
//   1. Company-scheduled alerts: a company that chose a set time of day has its official
//      follower alert queued in SaleAlertDispatch; once due, it goes to every follower who kept
//      alerts on. A sale that is no longer live is cancelled instead of announced.
//   2. EstateSalen daily roundup: once a day, at each customer's chosen hour (Eastern Time),
//      everyone who wants it gets one roundup of the sales published in the last 24 hours.
//
// Both are idempotent: follower alerts use the per-sale Notification receipt, and the roundup
// is keyed to the customer + the day, so repeated runs never double-notify.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { deliverFollowerAlerts, etNow } from '../../shared/followerAlerts.ts';

const DISPATCH_BATCH = 50;
const ROUNDUP_MAX_SALES = 5;
const DEFAULT_ROUNDUP_HOUR = 9;
const LIVE_STATUSES = ['upcoming', 'active'];

async function runDispatches(base44) {
  const out = { due: 0, sent: 0, cancelled: 0, notified: 0 };
  const pending = await base44.asServiceRole.entities.SaleAlertDispatch.filter({ status: 'pending' });
  const now = Date.now();
  const due = (pending || [])
    .filter((d) => d.scheduled_for && new Date(d.scheduled_for).getTime() <= now)
    .slice(0, DISPATCH_BATCH);
  out.due = due.length;

  for (const dispatch of due) {
    const sale = await base44.asServiceRole.entities.EstateSale.get(dispatch.sale_id)
      .catch((e) => (e.status === 404 ? null : Promise.reject(e)));

    if (!sale || !LIVE_STATUSES.includes(sale.status)) {
      await base44.asServiceRole.entities.SaleAlertDispatch.update(dispatch.id, {
        status: 'cancelled',
        note: sale ? `Sale status=${sale.status}; alert not sent` : 'Sale no longer exists'
      });
      out.cancelled++;
      continue;
    }

    const result = await deliverFollowerAlerts(base44, sale, { instantOnly: false });
    await base44.asServiceRole.entities.SaleAlertDispatch.update(dispatch.id, {
      status: 'sent',
      sent_at: new Date().toISOString(),
      recipient_count: result.notified || 0
    });
    out.sent++;
    out.notified += result.notified || 0;
  }

  return out;
}

async function runRoundup(base44) {
  const out = { sent: 0, skipped: 0 };
  const { hour, dateKey } = etNow();

  // One read of today's roundup receipts keeps this from sending twice in the same day.
  const alreadySent = await base44.asServiceRole.entities.Notification.filter({
    related_entity_type: 'DailySaleRoundup',
    related_entity_id: dateKey
  });
  const done = new Set((alreadySent || []).map((n) => n.user_id));

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  // One extra row tells us whether the count is exact or a "5+" figure.
  const page = await base44.asServiceRole.entities.EstateSale.filter(
    { status: { $in: LIVE_STATUSES }, created_date: { $gte: since } },
    { sort: '-created_date', limit: ROUNDUP_MAX_SALES + 1 }
  );
  const found = page?.items || page || [];
  const more = found.length > ROUNDUP_MAX_SALES;
  const sales = found.slice(0, ROUNDUP_MAX_SALES);
  if (sales.length === 0) return { ...out, reason: 'no new sales in the last 24 hours' };

  const prefs = await base44.asServiceRole.entities.NotificationPreference.list('-created_date', 2000);
  const prefById = {};
  (prefs || []).forEach((p) => { prefById[p.user_id] = p; });

  const users = await base44.asServiceRole.entities.User.list();
  const recipients = [];
  for (const user of users || []) {
    if (!user?.id || done.has(user.id)) continue;
    const pref = prefById[user.id];
    if (pref?.daily_sale_roundup === false) continue;
    if (pref?.sale_update_in_app === false) continue;
    const wantedHour = Number.isFinite(Number(pref?.roundup_hour)) ? Number(pref.roundup_hour) : DEFAULT_ROUNDUP_HOUR;
    if (wantedHour !== hour) continue;
    recipients.push(user);
  }
  out.skipped = (users || []).length - recipients.length;
  if (recipients.length === 0) return out;

  const highlights = sales.slice(0, 3).map((s) => s.title || 'Estate sale').join(' · ');
  const count = sales.length;
  const countLabel = more ? `${count}+` : String(count);
  const records = recipients.map((user) => ({
    user_id: user.id,
    type: 'sale_update',
    title: sales.length === 1 ? 'A new estate sale today' : `${countLabel} new estate sales today`,
    message: highlights,
    link_to_page: 'EstateSaleFinder',
    link_params: '',
    related_entity_type: 'DailySaleRoundup',
    related_entity_id: dateKey,
    read: false
  }));

  await base44.asServiceRole.entities.Notification.bulkCreate(records);
  out.sent = records.length;
  return out;
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const job = body?.job;

    const result = {};
    if (job !== 'roundup') result.dispatches = await runDispatches(base44);
    if (job !== 'dispatches') result.roundup = await runRoundup(base44);
    return Response.json(result);
  } catch (error) {
    console.error('dispatchSaleAlerts failed:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}