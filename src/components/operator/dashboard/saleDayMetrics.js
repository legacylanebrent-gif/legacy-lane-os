import { base44 } from '@/api/base44Client';

export const rows = (res) => (Array.isArray(res) ? res : res?.items || []);

export function localDateKey(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const dayKey = (value) => (value ? String(value).slice(0, 10) : '');

// Sale-day numbers for ONE sale, derived from the operator's own records.
export async function loadSaleDayMetrics(saleId) {
  const today = localDateKey();
  const startIso = new Date(`${today}T00:00:00`).toISOString();

  const [txns, soldItems, issues, tasks] = await Promise.all([
    base44.entities.Transaction.filter(
      { sale_id: saleId, transaction_date: { $gte: today } },
      { limit: 250 }
    ),
    base44.entities.Item.filter(
      { estate_sale_id: saleId, status: 'sold', sold_date: { $gte: startIso } },
      { limit: 250 }
    ),
    base44.entities.SaleIssue.filter(
      { sale_id: saleId, status: { $in: ['OPEN', 'WAITING'] } },
      { limit: 100 }
    ),
    base44.entities.SaleTask.filter(
      { sale_id: saleId, status: { $in: ['not_started', 'in_progress'] } },
      { limit: 200 }
    ),
  ]);

  const todayTxns = rows(txns).filter((t) => dayKey(t.transaction_date) === today);
  const openTasks = rows(tasks);
  const openIssues = rows(issues);

  return {
    cashToday: todayTxns.reduce((sum, t) => sum + (Number(t.total) || 0), 0),
    ticketsToday: todayTxns.length,
    itemsSoldToday: rows(soldItems).length,
    openIssues: openIssues.length,
    urgentIssues: openIssues.filter((i) => i.urgency === 'URGENT').length,
    openTasks: openTasks.length,
    overdueTasks: openTasks.filter((t) => t.due_date && dayKey(t.due_date) < today).length,
  };
}

// This month vs last month of the operator's recorded transactions.
export async function loadOperatorMoney(userId) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const thisKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastKey = `${last.getFullYear()}-${pad(last.getMonth() + 1)}`;

  const res = await base44.entities.Transaction.filter(
    { operator_id: userId, transaction_date: { $gte: localDateKey(last) } },
    { limit: 500, sort: '-transaction_date' }
  );

  let thisMonth = 0;
  let lastMonth = 0;
  let txCount = 0;
  rows(res).forEach((t) => {
    const key = dayKey(t.transaction_date).slice(0, 7);
    const amount = Number(t.total) || 0;
    if (key === thisKey) {
      thisMonth += amount;
      txCount += 1;
    } else if (key === lastKey) {
      lastMonth += amount;
    }
  });

  return { thisMonth, lastMonth, txCount };
}

// Sale-day position of a sale: live / upcoming / ended, plus day N of M.
export function saleTiming(sale) {
  const dates = (sale?.sale_dates || []).map((d) => d?.date).filter(Boolean).sort();
  if (!dates.length) return { state: 'undated' };
  const today = localDateKey();
  const start = dates[0];
  const end = dates[dates.length - 1];
  const dayMs = 86400000;
  const total = Math.round((new Date(`${end}T00:00:00`) - new Date(`${start}T00:00:00`)) / dayMs) + 1;

  if (today >= start && today <= end) {
    const dayNo = Math.min(
      Math.round((new Date(`${today}T00:00:00`) - new Date(`${start}T00:00:00`)) / dayMs) + 1,
      total
    );
    return { state: 'live', dayNo, total, start, end };
  }
  const days = Math.round((new Date(`${start}T00:00:00`) - new Date(`${today}T00:00:00`)) / dayMs);
  return { state: days > 0 ? 'upcoming' : 'ended', days, total, start, end };
}