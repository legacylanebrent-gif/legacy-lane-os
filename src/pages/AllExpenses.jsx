import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Search, Receipt, Building2, Tag } from 'lucide-react';
import { format } from 'date-fns';
import { expenseCategoryLabel } from '@/components/expenses/expenseCategories';

const OVERHEAD_LABELS = {
  advertising_marketing: 'Advertising & Marketing',
  auto_expenses: 'Auto & Vehicle',
  bank_fees: 'Bank Fees',
  education_training: 'Education & Training',
  equipment_tools: 'Equipment & Tools',
  insurance: 'Insurance',
  internet_phone: 'Internet & Phone',
  legal_professional: 'Legal & Professional',
  meals_entertainment: 'Meals & Entertainment',
  office_supplies: 'Office Supplies',
  rent_lease: 'Rent & Lease',
  repairs_maintenance: 'Repairs & Maintenance',
  software_subscriptions: 'Software & Subscriptions',
  taxes_licenses: 'Taxes & Licenses',
  travel: 'Travel',
  utilities: 'Utilities',
  wages_payroll: 'Wages & Payroll',
  other: 'Other',
};

const money = (n) =>
  `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const overheadLabel = (value) =>
  OVERHEAD_LABELS[value] || (value ? value.replace(/_/g, ' ') : 'Uncategorized');

const startOfRange = (filter) => {
  const now = new Date();
  if (filter === 'this_month') return new Date(now.getFullYear(), now.getMonth(), 1);
  if (filter === 'last_month') return new Date(now.getFullYear(), now.getMonth() - 1, 1);
  if (filter === 'this_year') return new Date(now.getFullYear(), 0, 1);
  return null;
};

export default function AllExpenses() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const user = await base44.auth.me();
      const [overhead, ownSaleExpenses, operatorSaleExpenses, sales] = await Promise.all([
        base44.entities.BusinessExpense.filter({ created_by: user.email }, '-expense_date'),
        base44.entities.Expense.filter({ created_by: user.email }, '-date'),
        base44.entities.Expense.filter({ operator_id: user.id }, '-date'),
        base44.entities.EstateSale.filter({ operator_id: user.id }, '-created_date'),
      ]);

      const saleTitles = {};
      sales.forEach((s) => { saleTitles[s.id] = s.title; });

      const byId = new Map();
      [...ownSaleExpenses, ...operatorSaleExpenses].forEach((e) => byId.set(e.id, e));

      const merged = [
        ...overhead.map((e) => ({
          id: `oh-${e.id}`,
          source: 'overhead',
          date: e.expense_date,
          vendor: e.vendor_name,
          description: e.description,
          category: overheadLabel(e.category),
          amount: Number(e.amount) || 0,
          receipt_url: e.receipt_url,
          saleId: null,
        })),
        ...[...byId.values()].map((e) => ({
          id: `sale-${e.id}`,
          source: 'sale',
          date: e.date,
          vendor: e.vendor || 'Sale expense',
          description: e.description,
          category: expenseCategoryLabel(e.category),
          amount: Number(e.amount) || 0,
          receipt_url: e.receipt_url,
          saleId: e.sale_id,
          saleTitle: saleTitles[e.sale_id] || null,
        })),
      ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

      setRows(merged);
    } catch (error) {
      console.error('Error loading expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const from = startOfRange(dateFilter);
    const term = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (sourceFilter !== 'all' && r.source !== sourceFilter) return false;
      if (from && (!r.date || new Date(r.date) < from)) return false;
      if (term) {
        const haystack = [r.vendor, r.description, r.category, r.saleTitle]
          .filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [rows, sourceFilter, dateFilter, search]);

  const totals = useMemo(() => {
    const sum = (list) => list.reduce((t, r) => t + r.amount, 0);
    return {
      all: sum(filtered),
      sale: sum(filtered.filter((r) => r.source === 'sale')),
      overhead: sum(filtered.filter((r) => r.source === 'overhead')),
    };
  }, [filtered]);

  const exportCsv = () => {
    const csv = [
      ['Date', 'Source', 'Sale', 'Vendor', 'Category', 'Amount', 'Description'].join(','),
      ...filtered.map((r) => [
        r.date || '',
        r.source === 'sale' ? 'Sale cost' : 'Overhead',
        r.source === 'sale' ? (r.saleTitle || 'Sale') : '',
        r.vendor || '',
        r.category || '',
        r.amount.toFixed(2),
        (r.description || '').replace(/\n/g, ' '),
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `all-expenses-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/3" />
          <div className="h-64 bg-slate-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-4xl font-serif font-bold text-slate-900">All Expenses</h1>
          <p className="text-sm sm:text-base text-slate-600">
            Every sale cost and every overhead cost in one list
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={exportCsv} variant="outline" className="whitespace-nowrap">
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
          <Button asChild variant="outline" className="whitespace-nowrap">
            <Link to="/MyBusinessExpenses">Add Overhead</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-600 mb-1">Total</p>
            <p className="text-2xl font-bold text-slate-900">{money(totals.all)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-600 mb-1">Sale costs</p>
            <p className="text-2xl font-bold text-orange-600">{money(totals.sale)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-600 mb-1">Overhead</p>
            <p className="text-2xl font-bold text-cyan-700">{money(totals.overhead)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search vendor, description, category or sale"
                className="pl-9"
              />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <Tabs value={sourceFilter} onValueChange={setSourceFilter}>
                <TabsList className="flex-wrap h-auto">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="sale">Sale costs</TabsTrigger>
                  <TabsTrigger value="overhead">Overhead</TabsTrigger>
                </TabsList>
              </Tabs>
              <Tabs value={dateFilter} onValueChange={setDateFilter}>
                <TabsList className="flex-wrap h-auto">
                  <TabsTrigger value="all">All time</TabsTrigger>
                  <TabsTrigger value="this_month">This month</TabsTrigger>
                  <TabsTrigger value="last_month">Last month</TabsTrigger>
                  <TabsTrigger value="this_year">This year</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <p className="p-8 text-center text-slate-500">
              No expenses match these filters.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {filtered.map((r) => (
                <li key={r.id} className="p-4 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium text-slate-900 break-words">{r.vendor}</p>
                      <p className="font-semibold text-slate-900 whitespace-nowrap">{money(r.amount)}</p>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                      <span>{r.date ? format(new Date(r.date), 'MMM d, yyyy') : 'No date'}</span>
                      <span className="inline-flex items-center gap-1">
                        <Tag className="w-3 h-3" /> {r.category}
                      </span>
                      {r.source === 'sale' ? (
                        r.saleId ? (
                          <Link
                            to={`/SaleEditor?id=${r.saleId}`}
                            className="inline-flex items-center gap-1 text-orange-700 hover:underline"
                          >
                            <Receipt className="w-3 h-3" /> {r.saleTitle || 'View sale'}
                          </Link>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">Sale cost</Badge>
                        )
                      ) : (
                        <span className="inline-flex items-center gap-1 text-cyan-700">
                          <Building2 className="w-3 h-3" /> Overhead
                        </span>
                      )}
                    </div>
                    {r.description && (
                      <p className="mt-1 text-xs text-slate-500 break-words">{r.description}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}