import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil, Trash2, Loader2, Receipt, AlertTriangle } from 'lucide-react';
import { EXPENSE_CATEGORY_OPTIONS, expenseCategoryLabel, PAYMENT_METHOD_OPTIONS } from '@/components/expenses/expenseCategories';

// Review every Expense already logged against ONE sale, and correct or remove
// them. Reads and writes the canonical Expense entity — nothing is copied.
export default function SaleExpensesList({ sale, onBack }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => { load(); }, [sale?.id]);

  const load = async () => {
    if (!sale?.id) return;
    setLoading(true);
    try {
      const records = await base44.entities.Expense.filter({ sale_id: sale.id });
      const list = Array.isArray(records) ? records : (records.items || []);
      list.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
      setExpenses(list);
    } catch (e) {
      console.error('Could not load sale expenses:', e);
      setError('Could not load this sale’s expenses.');
    } finally {
      setLoading(false);
    }
  };

  const total = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const saveEdit = async () => {
    if (!editing) return;
    if (!editing.amount) { setError('Enter an amount.'); return; }
    setSaving(true);
    setError(null);
    try {
      await base44.entities.Expense.update(editing.id, {
        category: editing.category,
        amount: parseFloat(editing.amount),
        date: editing.date,
        vendor: editing.vendor || '',
        description: editing.description || '',
        payment_method: editing.payment_method || 'credit_card',
      });
      setEditing(null);
      await load();
    } catch (e) {
      console.error('Could not save expense:', e);
      setError('Could not save that change.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (expense) => {
    if (!window.confirm(`Delete this ${expenseCategoryLabel(expense.category)} expense of $${Number(expense.amount || 0).toFixed(2)}?`)) return;
    setDeletingId(expense.id);
    setError(null);
    try {
      await base44.entities.Expense.delete(expense.id);
      setExpenses(prev => prev.filter(e => e.id !== expense.id));
    } catch (e) {
      console.error('Could not delete expense:', e);
      setError('Could not delete that expense.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4 py-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {expenses.length} expense{expenses.length === 1 ? '' : 's'} logged
          </p>
          <p className="text-xs text-slate-500">Total: ${total.toFixed(2)}</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onBack}>← Back</Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-700 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {editing ? (
        <div className="space-y-3 border border-slate-200 rounded-lg p-3">
          <p className="text-sm font-semibold text-slate-900">Edit expense</p>
          <div>
            <Label className="text-xs">Category</Label>
            <Select value={editing.category || 'other'} onValueChange={v => setEditing(p => ({ ...p, category: v }))}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {EXPENSE_CATEGORY_OPTIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Amount</Label>
              <Input type="number" step="0.01" value={editing.amount} onChange={ev => setEditing(p => ({ ...p, amount: ev.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Date</Label>
              <Input type="date" value={editing.date || ''} onChange={ev => setEditing(p => ({ ...p, date: ev.target.value }))} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Vendor</Label>
            <Input value={editing.vendor || ''} onChange={ev => setEditing(p => ({ ...p, vendor: ev.target.value }))} placeholder="Who was paid" />
          </div>
          <div>
            <Label className="text-xs">Payment Method</Label>
            <Select value={editing.payment_method || 'credit_card'} onValueChange={v => setEditing(p => ({ ...p, payment_method: v }))}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_METHOD_OPTIONS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Input value={editing.description || ''} onChange={ev => setEditing(p => ({ ...p, description: ev.target.value }))} placeholder="Optional note" />
          </div>
          <div className="flex gap-2 justify-end pt-2 border-t">
            <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button type="button" onClick={saveEdit} disabled={saving} className="bg-orange-600 hover:bg-orange-700">
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />} Save Changes
            </Button>
          </div>
        </div>
      ) : loading ? (
        <div className="text-center py-8 text-sm text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Loading expenses…
        </div>
      ) : expenses.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-slate-200 rounded-lg">
          <Receipt className="w-6 h-6 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No expenses logged for this sale yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {expenses.map(e => (
            <div key={e.id} className="flex items-start gap-2 p-2.5 border border-slate-200 rounded-lg">
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-slate-800 truncate">{expenseCategoryLabel(e.category)}</p>
                  <span className="text-sm font-semibold text-slate-900 shrink-0">${Number(e.amount || 0).toFixed(2)}</span>
                </div>
                <p className="text-xs text-slate-500 truncate">
                  {e.date || 'No date'}{e.vendor ? ` · ${e.vendor}` : ''}
                </p>
                {e.description && <p className="text-xs text-slate-400 line-clamp-2">{e.description}</p>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" title="Edit expense" onClick={() => { setError(null); setEditing({ ...e, amount: String(e.amount ?? '') }); }}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-600 hover:text-red-700" title="Delete expense" disabled={deletingId === e.id} onClick={() => remove(e)}>
                  {deletingId === e.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}