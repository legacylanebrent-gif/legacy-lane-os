import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Lock, DollarSign, Receipt, Users, Package } from 'lucide-react';
import { summarizeSale, bundleItemsFromNotes, money } from './summaryModel';

export default function SaleSummaryTab({ sale, transactions }) {
  const [expenses, setExpenses] = useState([]);
  const [rate, setRate] = useState(sale?.commission_rate ?? '');
  const [savingRate, setSavingRate] = useState(false);

  useEffect(() => {
    if (sale?.id) loadExpenses();
  }, [sale?.id]);

  const loadExpenses = async () => {
    const data = await base44.entities.Expense.filter({ sale_id: sale.id }, '-created_date', 500);
    setExpenses(data || []);
  };

  const summary = summarizeSale({ transactions, expenses, commissionRate: rate });

  const saveRate = async () => {
    if (rate === '' || Number(rate) === Number(sale?.commission_rate)) return;
    setSavingRate(true);
    await base44.entities.EstateSale.update(sale.id, { commission_rate: Number(rate) });
    setSavingRate(false);
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lock className="w-4 h-4 text-slate-500" />
            Sale Summary
            <Badge className="ml-auto bg-slate-100 text-slate-600">Operator only</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-1 text-sm text-green-700 mb-1">
                <DollarSign className="w-4 h-4" /> Total Transactions
              </div>
              <div className="text-2xl font-bold text-green-700">{money(summary.gross)}</div>
            </div>
            <div className="p-4 bg-red-50 rounded-lg">
              <div className="flex items-center gap-1 text-sm text-red-700 mb-1">
                <Receipt className="w-4 h-4" /> Sale Expenses
              </div>
              <div className="text-2xl font-bold text-red-700">{money(summary.expenseTotal)}</div>
            </div>
          </div>

          <div>
            <Label>Operator Split (%)</Label>
            <Input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              onBlur={saveRate}
              disabled={savingRate}
              placeholder="e.g. 35"
            />
            <p className="text-xs text-slate-500 mt-1">
              Saved to this sale. The owner's share is calculated on gross sales.
            </p>
          </div>

          <div className="border-t pt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-700 flex items-center gap-1">
                <Users className="w-4 h-4" /> Operator share at {summary.rate}% of gross
              </span>
              <span className="font-semibold text-slate-900">{money(summary.operatorShare)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-700">Operator net after sale expenses</span>
              <span className={`font-bold ${summary.operatorNet < 0 ? 'text-red-600' : 'text-green-700'}`}>
                {money(summary.operatorNet)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm pt-2 border-t">
              <span className="text-slate-700">Owner share of gross (no expense deductions)</span>
              <span className="font-bold text-slate-900">{money(summary.ownerShare)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">Items Sold ({transactions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-sm text-slate-500">No transactions recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {transactions.map((t) => {
                const bundleItems = bundleItemsFromNotes(t.notes);
                return (
                  <div key={t.id} className="p-4 border rounded-lg space-y-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2">
                        {bundleItems.length > 0 && <Package className="w-4 h-4 text-purple-600 mt-0.5" />}
                        <div>
                          <p className="font-medium text-slate-900">{t.item_name}</p>
                          <p className="text-xs text-slate-500">
                            Qty {t.quantity || 1}
                            {t.payment_method ? ` · ${t.payment_method.replace('_', ' ')}` : ''}
                          </p>
                        </div>
                      </div>
                      <p className="font-semibold text-green-700 whitespace-nowrap">
                        {money(t.total ?? (Number(t.price) || 0) * (Number(t.quantity) || 1))}
                      </p>
                    </div>
                    {bundleItems.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        <span className="text-xs text-slate-500 mr-1">Includes:</span>
                        {bundleItems.map((item, idx) => (
                          <Badge key={idx} className="bg-purple-50 text-purple-700 font-normal">
                            {item}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}