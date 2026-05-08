import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Car, Receipt, ChevronRight, X, Loader2, CheckCircle2, Plus } from 'lucide-react';

const CATEGORY_OPTIONS = [
  { value: 'advertising_marketing', label: 'Advertising & Marketing' },
  { value: 'auto_expenses', label: 'Auto & Vehicle' },
  { value: 'equipment_tools', label: 'Equipment & Tools' },
  { value: 'internet_phone', label: 'Internet & Phone' },
  { value: 'meals_entertainment', label: 'Meals & Entertainment' },
  { value: 'office_supplies', label: 'Office Supplies' },
  { value: 'repairs_maintenance', label: 'Repairs & Maintenance' },
  { value: 'software_subscriptions', label: 'Software & Subscriptions' },
  { value: 'travel', label: 'Travel' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'wages_payroll', label: 'Wages & Payroll' },
  { value: 'other', label: 'Other' }
];

// Common sale-specific expense suggestions
const SUGGESTED_EXPENSES = [
  { label: 'Signage / Signs', category: 'advertising_marketing', amount: '' },
  { label: 'Advertising (Facebook/Nextdoor)', category: 'advertising_marketing', amount: '' },
  { label: 'Supplies (tables, stickers, bags)', category: 'office_supplies', amount: '' },
  { label: 'Staff / Helper Wages', category: 'wages_payroll', amount: '' },
  { label: 'Cleaning Supplies', category: 'repairs_maintenance', amount: '' },
  { label: 'Dumpster Rental', category: 'other', amount: '' },
  { label: 'Meals (Sale Day)', category: 'meals_entertainment', amount: '' },
];

const IRS_RATE = 0.70;

function SuggestedRow({ suggestion, isSaved, saving, onSave }) {
  const [amt, setAmt] = useState('');
  return (
    <div className="flex items-center gap-2 p-2.5 border border-slate-200 rounded-lg bg-slate-50">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">{suggestion.label}</p>
        <p className="text-xs text-slate-400">{CATEGORY_OPTIONS.find(c => c.value === suggestion.category)?.label}</p>
      </div>
      {isSaved ? (
        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
      ) : (
        <>
          <div className="relative w-28 flex-shrink-0">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
            <Input type="number" step="0.01" placeholder="0.00" value={amt} onChange={e => setAmt(e.target.value)} className="pl-5 h-8 text-sm" />
          </div>
          <Button size="sm" className="h-8 px-2 bg-orange-600 hover:bg-orange-700" disabled={saving || !amt} onClick={() => onSave({ ...suggestion, amount: amt })}>
            <CheckCircle2 className="w-4 h-4" />
          </Button>
        </>
      )}
    </div>
  );
}

// ─── View: choose type ────────────────────────────────────────────────────────
function ChooseView({ onChoose }) {
  return (
    <div className="space-y-4 py-2">
      <p className="text-sm text-slate-500">What would you like to log for this sale?</p>
      <div className="grid grid-cols-1 gap-3">
        <button
          onClick={() => onChoose('expense')}
          className="flex items-center gap-4 p-4 border-2 border-slate-200 hover:border-orange-400 rounded-xl transition-colors text-left"
        >
          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Receipt className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-900">Log a Sale Expense</p>
            <p className="text-xs text-slate-500">Add an expense (supplies, ads, wages, etc.) linked to this specific sale</p>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 ml-auto" />
        </button>
        <button
          onClick={() => onChoose('mileage')}
          className="flex items-center gap-4 p-4 border-2 border-slate-200 hover:border-blue-400 rounded-xl transition-colors text-left"
        >
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Car className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-900">Log Mileage</p>
            <p className="text-xs text-slate-500">Track round trips to the sale address — auto-calculates total miles & deduction</p>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 ml-auto" />
        </button>
      </div>
    </div>
  );
}

// ─── View: expense form ───────────────────────────────────────────────────────
function ExpenseView({ sale, user, onSaved, onBack }) {
  const [mode, setMode] = useState('suggest'); // 'suggest' | 'custom'
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState([]);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  const [form, setForm] = useState({
    expense_date: new Date().toISOString().split('T')[0],
    vendor_name: '',
    amount: '',
    category: 'other',
    description: '',
    payment_method: 'credit_card',
    receipt_url: '',
    tax_deductible: true,
    business_use_percentage: 100
  });

  const handleSuggestedSave = async (suggestion) => {
    if (!suggestion.amount) return alert('Please enter an amount for: ' + suggestion.label);
    setSaving(true);
    try {
      await base44.entities.BusinessExpense.create({
        expense_date: new Date().toISOString().split('T')[0],
        vendor_name: suggestion.label,
        amount: parseFloat(suggestion.amount),
        category: suggestion.category,
        description: `Sale expense for: ${sale.title}`,
        payment_method: 'credit_card',
        tax_deductible: true,
        business_use_percentage: 100,
        tags: ['sale-expense', sale.id]
      });
      setSaved(prev => [...prev, suggestion.label]);
    } catch (e) {
      alert('Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  const handleCustomSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await base44.entities.BusinessExpense.create({
        ...form,
        amount: parseFloat(form.amount),
        business_use_percentage: parseFloat(form.business_use_percentage),
        description: form.description || `Sale expense for: ${sale.title}`,
        tags: ['sale-expense', sale.id]
      });
      onSaved('Expense saved!');
    } catch (e) {
      alert('Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  const handleReceiptUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingReceipt(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(prev => ({ ...prev, receipt_url: file_url }));
    } catch {
      alert('Failed to upload receipt');
    } finally {
      setUploadingReceipt(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setMode('suggest')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${mode === 'suggest' ? 'bg-orange-100 text-orange-700' : 'text-slate-500 hover:bg-slate-100'}`}
        >
          Quick Add
        </button>
        <button
          onClick={() => setMode('custom')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${mode === 'custom' ? 'bg-orange-100 text-orange-700' : 'text-slate-500 hover:bg-slate-100'}`}
        >
          Custom Expense
        </button>
      </div>

      {mode === 'suggest' && (
        <div className="space-y-2">
          <p className="text-xs text-slate-500">Enter amounts for common sale expenses and click ✓ to save each one:</p>
          {SUGGESTED_EXPENSES.map((s) => (
            <SuggestedRow key={s.label} suggestion={s} isSaved={saved.includes(s.label)} saving={saving} onSave={handleSuggestedSave} />
          ))}
          <div className="pt-2 border-t flex justify-between items-center">
            {saved.length > 0 && (
              <span className="text-xs text-green-600 font-medium">{saved.length} expense{saved.length > 1 ? 's' : ''} saved ✓</span>
            )}
            <Button size="sm" variant="outline" onClick={() => onSaved(saved.length > 0 ? `${saved.length} expense(s) saved` : null)} className="ml-auto">
              Done
            </Button>
          </div>
        </div>
      )}

      {mode === 'custom' && (
        <form onSubmit={handleCustomSave} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date *</Label>
              <Input type="date" value={form.expense_date} onChange={e => setForm(p => ({ ...p, expense_date: e.target.value }))} required />
            </div>
            <div>
              <Label>Amount *</Label>
              <Input type="number" step="0.01" placeholder="0.00" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} required />
            </div>
          </div>
          <div>
            <Label>Vendor / Description *</Label>
            <Input placeholder="e.g., Home Depot, Facebook Ads" value={form.vendor_name} onChange={e => setForm(p => ({ ...p, vendor_name: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {CATEGORY_OPTIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Payment Method</Label>
              <Select value={form.payment_method} onValueChange={v => setForm(p => ({ ...p, payment_method: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="debit_card">Debit Card</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea rows={2} placeholder="Optional notes..." value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </div>
          <div>
            <Label>Receipt (optional)</Label>
            <Input type="file" onChange={handleReceiptUpload} disabled={uploadingReceipt} />
            {uploadingReceipt && <p className="text-xs text-slate-500 mt-1">Uploading...</p>}
            {form.receipt_url && <p className="text-xs text-green-600 mt-1">✓ Receipt uploaded</p>}
          </div>
          <div className="flex gap-2 justify-end pt-2 border-t">
            <Button type="button" variant="outline" onClick={onBack}>Back</Button>
            <Button type="submit" disabled={saving} className="bg-orange-600 hover:bg-orange-700">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null} Save Expense
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

// ─── View: mileage form ───────────────────────────────────────────────────────
function MileageView({ sale, user, onSaved, onBack }) {
  const [saving, setSaving] = useState(false);
  const [calculatingDistance, setCalculatingDistance] = useState(false);
  const [onewayMiles, setOnewayMiles] = useState(null);
  const [addressType, setAddressType] = useState(null); // null | 'home' | 'business'
  const timerRef = useRef(null);

  const homeAddress = user?.home_address || user?.address || '';
  const businessAddress = user?.business_address || '';

  const saleAddress = sale?.property_address
    ? `${sale.property_address.street || ''}, ${sale.property_address.city || ''}, ${sale.property_address.state || ''} ${sale.property_address.zip || ''}`.trim().replace(/^,\s*/, '')
    : '';

  const getStartingAddress = (type) => {
    if (type === 'home') return homeAddress;
    if (type === 'business') return businessAddress;
    return '';
  };

  const [form, setForm] = useState({
    expense_date: new Date().toISOString().split('T')[0],
    home_address: '',
    round_trips: 1,
    rate_per_mile: '0.70',
    purpose: 'Estate sale preparation and setup'
  });

  // When user picks address type, pre-fill the address field
  const handleAddressTypeSelect = (type) => {
    setAddressType(type);
    setForm(p => ({ ...p, home_address: getStartingAddress(type) }));
  };

  const fetchDistance = async (origin, destination) => {
    setCalculatingDistance(true);
    try {
      const response = await base44.functions.invoke('calculateDistance', { origin, destination });
      const data = response.data;
      if (data.miles) setOnewayMiles(data.miles);
    } catch (e) {
      console.error('Distance calc error', e);
    } finally {
      setCalculatingDistance(false);
    }
  };

  // Auto-fetch distance when home_address is filled in
  useEffect(() => {
    if (!form.home_address || !saleAddress) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fetchDistance(form.home_address, saleAddress), 800);
  }, [form.home_address]);

  // Show address type picker first
  if (!addressType) {
    return (
      <div className="space-y-4 py-2">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
          <strong>Sale Address:</strong> {saleAddress || <span className="italic text-blue-500">No address on record</span>}
        </div>
        <p className="text-sm font-medium text-slate-700">Which address are you starting from?</p>
        <div className="grid grid-cols-1 gap-3">
          <button
            onClick={() => handleAddressTypeSelect('home')}
            className="flex items-start gap-4 p-4 border-2 border-slate-200 hover:border-blue-400 rounded-xl transition-colors text-left"
          >
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Car className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">Home Address</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {homeAddress || <span className="italic text-slate-400">Not set — you can enter it manually</span>}
              </p>
            </div>
          </button>
          <button
            onClick={() => handleAddressTypeSelect('business')}
            className="flex items-start gap-4 p-4 border-2 border-slate-200 hover:border-orange-400 rounded-xl transition-colors text-left"
          >
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Car className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">Business Address</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {businessAddress || <span className="italic text-slate-400">Not set — you can enter it manually</span>}
              </p>
            </div>
          </button>
        </div>
        <div className="pt-2 border-t flex justify-start">
          <Button type="button" variant="outline" size="sm" onClick={onBack}>← Back</Button>
        </div>
      </div>
    );
  }

  const totalMiles = onewayMiles ? (onewayMiles * 2 * parseFloat(form.round_trips || 1)).toFixed(1) : null;
  const totalDeduction = totalMiles ? (parseFloat(totalMiles) * parseFloat(form.rate_per_mile)).toFixed(2) : null;

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.home_address) return alert('Please enter your home/starting address');
    setSaving(true);
    try {
      const miles = totalMiles || (parseFloat(form.round_trips || 1) * 2 * 10); // fallback if no calc
      const amount = parseFloat(miles) * parseFloat(form.rate_per_mile);

      await base44.entities.BusinessExpense.create({
        expense_date: form.expense_date,
        vendor_name: 'Vehicle Mileage — ' + (sale?.property_address?.city || 'Sale'),
        amount,
        category: 'auto_expenses',
        description: `${form.round_trips} round trip(s) from home to sale address\nFrom: ${form.home_address}\nTo: ${saleAddress}\n${miles} total miles @ $${form.rate_per_mile}/mile\nPurpose: ${form.purpose}`,
        payment_method: 'cash',
        tax_deductible: true,
        business_use_percentage: 100,
        tags: ['mileage', 'sale-expense', 'round-trip', sale.id]
      });

      // Save address to user profile for future use
      if (form.home_address && !user?.business_address) {
        await base44.auth.updateMe({ business_address: form.home_address, business_street: form.home_address });
      }

      onSaved('Mileage saved!');
    } catch (e) {
      alert('Failed to save mileage');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
        <strong>Sale Address:</strong> {saleAddress || <span className="italic text-blue-500">No address on record</span>}
      </div>

      <div>
        <Label>Your {addressType === 'business' ? 'Business' : 'Home'} / Starting Address *</Label>
        <Input
          placeholder="e.g., 123 Main St, Springfield, NJ 07081"
          value={form.home_address}
          onChange={e => setForm(p => ({ ...p, home_address: e.target.value }))}
          required
        />
        <button type="button" onClick={() => setAddressType(null)} className="text-xs text-blue-500 hover:underline mt-1">
          ← Change address type
        </button>
      </div>

      {calculatingDistance && (
        <p className="text-xs text-blue-600 flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" /> Calculating one-way distance via Google Maps…
        </p>
      )}
      {onewayMiles && !calculatingDistance && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-700">
          📍 One-way distance: <strong>{onewayMiles} miles</strong>
        </div>
      )}

      <div>
        <Label>Date *</Label>
        <Input type="date" value={form.expense_date} onChange={e => setForm(p => ({ ...p, expense_date: e.target.value }))} required />
      </div>

      <div>
        <Label className="font-semibold">How many round trips did you make to this sale? *</Label>
        <p className="text-xs text-slate-500 mb-1">Each round trip = home → sale + sale → home</p>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setForm(p => ({ ...p, round_trips: Math.max(1, parseInt(p.round_trips || 1) - 1) }))}
            className="w-9 h-9 rounded-full border border-slate-300 flex items-center justify-center text-lg font-bold hover:bg-slate-100">−</button>
          <Input
            type="number"
            min="1"
            value={form.round_trips}
            onChange={e => setForm(p => ({ ...p, round_trips: e.target.value }))}
            className="w-20 text-center text-lg font-bold"
            required
          />
          <button type="button" onClick={() => setForm(p => ({ ...p, round_trips: parseInt(p.round_trips || 1) + 1 }))}
            className="w-9 h-9 rounded-full border border-slate-300 flex items-center justify-center text-lg font-bold hover:bg-slate-100">+</button>
          <span className="text-sm text-slate-500">round trips</span>
        </div>
      </div>

      <div>
        <Label>IRS Rate per Mile</Label>
        <Input type="number" step="0.01" value={form.rate_per_mile} onChange={e => setForm(p => ({ ...p, rate_per_mile: e.target.value }))} />
        <p className="text-xs text-slate-400 mt-1">2025 IRS standard rate: $0.70/mile</p>
      </div>

      <div>
        <Label>Purpose</Label>
        <Textarea rows={2} value={form.purpose} onChange={e => setForm(p => ({ ...p, purpose: e.target.value }))} />
      </div>

      {/* Summary */}
      {form.round_trips && form.rate_per_mile && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-1">
          <div className="flex justify-between text-sm text-slate-700">
            <span>Total Miles:</span>
            <strong>{totalMiles || `${parseInt(form.round_trips || 1) * 2} × one-way miles`}</strong>
          </div>
          {totalDeduction && (
            <div className="flex justify-between text-lg font-bold text-blue-700 border-t border-blue-200 pt-1 mt-1">
              <span>Total Deduction:</span>
              <span>${totalDeduction}</span>
            </div>
          )}
          {!onewayMiles && (
            <p className="text-xs text-amber-600">⚠ Enter your home address above to auto-calculate exact mileage</p>
          )}
        </div>
      )}

      <div className="flex gap-2 justify-end pt-2 border-t">
        <Button type="button" variant="outline" onClick={onBack}>Back</Button>
        <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Car className="w-4 h-4 mr-1" />}
          Save Mileage
        </Button>
      </div>
    </form>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
export default function SaleExpensesModal({ open, onClose, sale, user }) {
  const [view, setView] = useState('choose'); // 'choose' | 'expense' | 'mileage'
  const [successMsg, setSuccessMsg] = useState(null);

  const handleClose = () => {
    setView('choose');
    setSuccessMsg(null);
    onClose();
  };

  const handleSaved = (msg) => {
    if (msg) setSuccessMsg(msg);
    setTimeout(() => { setView('choose'); setSuccessMsg(null); }, 1500);
  };

  const title = view === 'choose' ? 'Sale Expenses & Mileage'
    : view === 'expense' ? 'Log Sale Expense'
    : 'Log Mileage';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            {view !== 'choose' && (
              <button onClick={() => setView('choose')} className="text-slate-400 hover:text-slate-600 mr-1">←</button>
            )}
            {title}
          </DialogTitle>
          {sale && (
            <p className="text-xs text-slate-500 mt-0.5 truncate">📍 {sale.title}</p>
          )}
        </DialogHeader>

        {successMsg && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-green-700 text-sm font-medium">
            <CheckCircle2 className="w-4 h-4" /> {successMsg}
          </div>
        )}

        {!successMsg && view === 'choose' && <ChooseView onChoose={setView} />}
        {!successMsg && view === 'expense' && <ExpenseView sale={sale} user={user} onSaved={handleSaved} onBack={() => setView('choose')} />}
        {!successMsg && view === 'mileage' && <MileageView sale={sale} user={user} onSaved={handleSaved} onBack={() => setView('choose')} />}
      </DialogContent>
    </Dialog>
  );
}