// Summary math for the sale worksheet. The split is the sale's own commission
// rate: the operator earns that percentage of GROSS transactions, the owner
// receives the remainder of gross, and only the operator absorbs sale expenses.
export function bundleItemsFromNotes(notes) {
  if (!notes || !notes.startsWith('Bundle:')) return [];
  return notes
    .replace('Bundle:', '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function summarizeSale({ transactions = [], expenses = [], commissionRate = 0 }) {
  const gross = transactions.reduce((sum, t) => sum + (Number(t.total) || 0), 0);
  const expenseTotal = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const rate = Number(commissionRate) || 0;
  const operatorShare = gross * (rate / 100);
  const ownerShare = gross - operatorShare;
  const operatorNet = operatorShare - expenseTotal;
  return { gross, expenseTotal, rate, operatorShare, ownerShare, operatorNet };
}

export const money = (n) =>
  `$${(Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;