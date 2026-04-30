import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, AlertCircle, Repeat, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { format, addMonths, startOfMonth } from 'date-fns';

const CATEGORY_OPTIONS = [
  { value: 'advertising_marketing', label: 'Advertising & Marketing' },
  { value: 'auto_expenses', label: 'Auto & Vehicle' },
  { value: 'bank_fees', label: 'Bank Fees' },
  { value: 'education_training', label: 'Education & Training' },
  { value: 'equipment_tools', label: 'Equipment & Tools' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'internet_phone', label: 'Internet & Phone' },
  { value: 'legal_professional', label: 'Legal & Professional' },
  { value: 'meals_entertainment', label: 'Meals & Entertainment' },
  { value: 'office_supplies', label: 'Office Supplies' },
  { value: 'rent_lease', label: 'Rent & Lease' },
  { value: 'repairs_maintenance', label: 'Repairs & Maintenance' },
  { value: 'software_subscriptions', label: 'Software & Subscriptions' },
  { value: 'taxes_licenses', label: 'Taxes & Licenses' },
  { value: 'travel', label: 'Travel' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'wages_payroll', label: 'Wages & Payroll' },
  { value: 'other', label: 'Other' }
];

const BAR_COLORS = ['#0891b2', '#06b6d4', '#22d3ee', '#67e8f9', '#a5f3fc', '#cffafe'];

// Get monthly equivalent amount based on frequency
function getMonthlyAmount(expense) {
  const freq = expense.recurring_frequency;
  if (freq === 'quarterly') return expense.amount / 3;
  if (freq === 'annually') return expense.amount / 12;
  return expense.amount; // monthly (default)
}

// Check if a quarterly/annual expense falls in a given month index (0 = current month)
function occursInMonth(expense, monthIndex) {
  const freq = expense.recurring_frequency;
  if (freq === 'monthly') return true;

  // Use the expense_date as the reference month
  const refDate = new Date(expense.expense_date);
  const targetDate = addMonths(startOfMonth(new Date()), monthIndex);

  if (freq === 'quarterly') {
    const monthsDiff =
      (targetDate.getFullYear() - refDate.getFullYear()) * 12 +
      (targetDate.getMonth() - refDate.getMonth());
    return monthsDiff >= 0 && monthsDiff % 3 === 0;
  }

  if (freq === 'annually') {
    return (
      targetDate.getMonth() === refDate.getMonth() &&
      targetDate.getFullYear() >= refDate.getFullYear()
    );
  }

  return false;
}

export default function CashFlowProjection({ expenses }) {
  const recurringExpenses = useMemo(
    () => expenses.filter(e => e.is_recurring),
    [expenses]
  );

  // Build 6-month projection
  const projection = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const monthDate = addMonths(startOfMonth(new Date()), i);
      const monthLabel = format(monthDate, 'MMM yyyy');

      const items = recurringExpenses
        .filter(e => occursInMonth(e, i))
        .map(e => ({ ...e, projectedAmount: e.amount }));

      const total = items.reduce((sum, e) => sum + e.amount, 0);
      return { month: monthLabel, total, items };
    });
  }, [recurringExpenses]);

  const totalSixMonths = projection.reduce((s, m) => s + m.total, 0);
  const monthlyRecurring = recurringExpenses.reduce((s, e) => s + getMonthlyAmount(e), 0);
  const highestMonth = projection.reduce((max, m) => (m.total > max.total ? m : max), projection[0]);

  if (recurringExpenses.length === 0) {
    return (
      <Card className="border-dashed border-2 border-slate-300">
        <CardContent className="p-8 text-center">
          <Repeat className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No recurring expenses yet</p>
          <p className="text-sm text-slate-400 mt-1">Add recurring expenses to see your 6-month cash flow projection.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-purple-600 mb-1">Monthly Recurring</p>
            <p className="text-3xl font-bold text-purple-700">${monthlyRecurring.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-slate-500 mt-1">{recurringExpenses.length} active subscriptions/bills</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-cyan-50 to-blue-50 border-cyan-200">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-600 mb-1">6-Month Total</p>
            <p className="text-3xl font-bold text-cyan-700">${totalSixMonths.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-slate-500 mt-1">Projected committed spend</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
          <CardContent className="p-5">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 mb-1">Highest Month</p>
                <p className="text-2xl font-bold text-amber-700">${highestMonth?.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                <p className="text-xs text-slate-500 mt-1">{highestMonth?.month}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            6-Month Projected Cash Outflow
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={projection} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 13 }} />
              <YAxis tickFormatter={v => `$${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v}`} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => [`$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 'Projected']} />
              <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                {projection.map((_, i) => (
                  <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Month-by-month breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-cyan-600" />
            Monthly Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {projection.map((month, i) => (
              <div key={month.month} className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }} />
                    <span className="font-semibold text-slate-800">{month.month}</span>
                    {i === 0 && <Badge className="bg-green-100 text-green-700 border-green-300 text-xs">Current</Badge>}
                  </div>
                  <span className="font-bold text-slate-900">${month.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
                {month.items.length > 0 && (
                  <div className="divide-y divide-slate-100">
                    {month.items.map(item => (
                      <div key={item.id} className="flex items-center justify-between px-4 py-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Repeat className="w-3 h-3 text-purple-400 flex-shrink-0" />
                          <span className="text-slate-700">{item.vendor_name}</span>
                          <span className="text-slate-400 text-xs hidden sm:inline">
                            {CATEGORY_OPTIONS.find(c => c.value === item.category)?.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.recurring_frequency !== 'monthly' && (
                            <Badge variant="outline" className="text-xs capitalize">{item.recurring_frequency}</Badge>
                          )}
                          <span className="font-medium text-slate-800">${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}