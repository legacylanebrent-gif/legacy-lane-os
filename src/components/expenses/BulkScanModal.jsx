import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Upload, X, CheckCircle2, AlertCircle, Loader2, Save } from 'lucide-react';

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

// status: 'pending' | 'scanning' | 'done' | 'error'
function createEntry(file, previewUrl) {
  return {
    id: Math.random().toString(36).slice(2),
    file,
    previewUrl,
    status: 'pending',
    vendor_name: '',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    category: 'other',
    description: '',
    receipt_url: '',
    error: null,
  };
}

export default function BulkScanModal({ open, onClose, onSaved }) {
  const [entries, setEntries] = useState([]);
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const fileInputRef = useRef(null);

  const updateEntry = (id, patch) =>
    setEntries(prev => prev.map(e => (e.id === id ? { ...e, ...patch } : e)));

  const handleFilesSelected = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    // Add all files immediately with previews
    const newEntries = files.map(file => {
      const previewUrl = URL.createObjectURL(file);
      return createEntry(file, previewUrl);
    });
    setEntries(prev => [...prev, ...newEntries]);

    // Process each in parallel
    await Promise.all(newEntries.map(entry => processEntry(entry)));

    // Reset input so the same files can be re-added if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processEntry = async (entry) => {
    updateEntry(entry.id, { status: 'scanning' });
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: entry.file });

      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: 'object',
          properties: {
            vendor_name: { type: 'string' },
            amount: { type: 'number' },
            date: { type: 'string', description: 'ISO date string YYYY-MM-DD' },
            description: { type: 'string' },
            category: {
              type: 'string',
              enum: CATEGORY_OPTIONS.map(c => c.value),
              description: 'Best matching expense category'
            }
          }
        }
      });

      if (result.status === 'success' && result.output) {
        const out = result.output;
        updateEntry(entry.id, {
          status: 'done',
          receipt_url: file_url,
          vendor_name: out.vendor_name || '',
          amount: out.amount != null ? String(out.amount) : '',
          expense_date: out.date || new Date().toISOString().split('T')[0],
          category: out.category || 'other',
          description: out.description || '',
        });
      } else {
        updateEntry(entry.id, { status: 'error', receipt_url: file_url, error: 'Could not extract data' });
      }
    } catch (err) {
      updateEntry(entry.id, { status: 'error', error: err.message || 'Failed to process' });
    }
  };

  const removeEntry = (id) => {
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  const handleSaveAll = async () => {
    const ready = entries.filter(e => e.vendor_name && e.amount);
    if (!ready.length) return;
    setSaving(true);
    let count = 0;
    for (const entry of ready) {
      try {
        await base44.entities.BusinessExpense.create({
          vendor_name: entry.vendor_name,
          amount: parseFloat(entry.amount),
          expense_date: entry.expense_date,
          category: entry.category,
          description: entry.description,
          receipt_url: entry.receipt_url,
          payment_method: 'credit_card',
          tax_deductible: true,
          business_use_percentage: 100,
          tags: ['bulk-scan'],
        });
        count++;
      } catch (_) {}
    }
    setSaving(false);
    setSavedCount(count);
    onSaved();
    handleClose();
  };

  const handleClose = () => {
    setEntries([]);
    setSavedCount(0);
    onClose();
  };

  const readyCount = entries.filter(e => e.vendor_name && e.amount).length;
  const scanningCount = entries.filter(e => e.status === 'scanning').length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Upload className="w-6 h-6 text-cyan-600" />
            Bulk Scan Receipts
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Drop zone */}
          <div
            className="border-2 border-dashed border-cyan-300 rounded-xl p-6 text-center cursor-pointer hover:bg-cyan-50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-700">Click to select receipts</p>
            <p className="text-xs text-slate-400 mt-1">Multiple images supported — JPG, PNG, PDF</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              multiple
              className="hidden"
              onChange={handleFilesSelected}
            />
          </div>

          {/* Progress summary */}
          {entries.length > 0 && (
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <Badge variant="outline">{entries.length} receipt{entries.length !== 1 ? 's' : ''}</Badge>
              {scanningCount > 0 && (
                <span className="flex items-center gap-1 text-cyan-600">
                  <Loader2 className="w-3 h-3 animate-spin" /> Scanning {scanningCount}…
                </span>
              )}
              {readyCount > 0 && (
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="w-3 h-3" /> {readyCount} ready to save
                </span>
              )}
            </div>
          )}

          {/* Entry cards */}
          <div className="space-y-3">
            {entries.map(entry => (
              <div key={entry.id} className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 border-b border-slate-200">
                  {/* Thumbnail */}
                  {entry.previewUrl && (
                    <img src={entry.previewUrl} alt="receipt" className="w-10 h-10 object-cover rounded-md border border-slate-200 flex-shrink-0" />
                  )}
                  <span className="text-xs text-slate-500 truncate flex-1">{entry.file.name}</span>

                  {/* Status badge */}
                  {entry.status === 'scanning' && (
                    <Badge className="bg-cyan-100 text-cyan-700 border-cyan-300 gap-1 text-xs">
                      <Loader2 className="w-3 h-3 animate-spin" /> Scanning
                    </Badge>
                  )}
                  {entry.status === 'done' && (
                    <Badge className="bg-green-100 text-green-700 border-green-300 gap-1 text-xs">
                      <CheckCircle2 className="w-3 h-3" /> Extracted
                    </Badge>
                  )}
                  {entry.status === 'error' && (
                    <Badge className="bg-red-100 text-red-700 border-red-300 gap-1 text-xs">
                      <AlertCircle className="w-3 h-3" /> {entry.error || 'Error'}
                    </Badge>
                  )}
                  {entry.status === 'pending' && (
                    <Badge variant="outline" className="text-xs">Pending</Badge>
                  )}

                  <button onClick={() => removeEntry(entry.id)} className="text-slate-400 hover:text-red-500 ml-1">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Editable fields */}
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Vendor *</label>
                    <Input
                      value={entry.vendor_name}
                      onChange={e => updateEntry(entry.id, { vendor_name: e.target.value })}
                      placeholder="Vendor name"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Amount *</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={entry.amount}
                      onChange={e => updateEntry(entry.id, { amount: e.target.value })}
                      placeholder="0.00"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Date</label>
                    <Input
                      type="date"
                      value={entry.expense_date}
                      onChange={e => updateEntry(entry.id, { expense_date: e.target.value })}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Category</label>
                    <Select value={entry.category} onValueChange={val => updateEntry(entry.id, { category: val })}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px]">
                        {CATEGORY_OPTIONS.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer actions */}
          {entries.length > 0 && (
            <div className="flex items-center justify-between pt-2 border-t">
              <Button variant="outline" size="sm" onClick={() => setEntries([])}>
                Clear All
              </Button>
              <Button
                onClick={handleSaveAll}
                disabled={saving || readyCount === 0 || scanningCount > 0}
                className="bg-cyan-600 hover:bg-cyan-700 gap-2"
              >
                {saving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                ) : (
                  <><Save className="w-4 h-4" /> Save {readyCount} Expense{readyCount !== 1 ? 's' : ''}</>
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}