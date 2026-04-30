import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, CheckCircle, AlertCircle, Loader2, X, ImagePlus, Save } from 'lucide-react';

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
  { value: 'other', label: 'Other' },
];

// STATUS: 'pending' | 'scanning' | 'done' | 'error'
function createItem(file) {
  return {
    id: Math.random().toString(36).slice(2),
    file,
    preview: URL.createObjectURL(file),
    status: 'pending',
    error: null,
    extracted: null, // { vendor_name, amount, date, description, category }
    saved: false,
  };
}

export default function BulkReceiptScanner({ open, onClose, onSaved }) {
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  const updateItem = (id, patch) =>
    setItems(prev => prev.map(it => (it.id === id ? { ...it, ...patch } : it)));

  const handleFilesSelected = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const newItems = files.map(createItem);
    setItems(prev => [...prev, ...newItems]);
    // kick off scanning immediately
    newItems.forEach(item => scanItem(item));
    e.target.value = '';
  };

  const scanItem = async (item) => {
    updateItem(item.id, { status: 'scanning' });
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: item.file });

      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: 'object',
          properties: {
            vendor_name: { type: 'string' },
            amount: { type: 'number' },
            date: { type: 'string' },
            description: { type: 'string' },
            category: {
              type: 'string',
              enum: CATEGORY_OPTIONS.map(c => c.value),
              description: 'Best matching expense category based on the receipt content',
            },
          },
        },
      });

      if (result.status === 'success' && result.output) {
        updateItem(item.id, {
          status: 'done',
          extracted: {
            vendor_name: result.output.vendor_name || '',
            amount: result.output.amount || '',
            expense_date: result.output.date || new Date().toISOString().split('T')[0],
            description: result.output.description || '',
            category: result.output.category || 'other',
            receipt_url: (await base44.integrations.Core.UploadFile({ file: item.file })).file_url,
          },
        });
      } else {
        updateItem(item.id, { status: 'error', error: 'Could not extract data' });
      }
    } catch (err) {
      updateItem(item.id, { status: 'error', error: err.message || 'Scan failed' });
    }
  };

  // Re-upload is just a second pass through scanItem
  const retryItem = (item) => scanItem(item);

  const removeItem = (id) =>
    setItems(prev => prev.filter(it => it.id !== id));

  const updateExtracted = (id, field, value) =>
    setItems(prev =>
      prev.map(it =>
        it.id === id ? { ...it, extracted: { ...it.extracted, [field]: value } } : it
      )
    );

  const saveAll = async () => {
    const toSave = items.filter(it => it.status === 'done' && !it.saved && it.extracted);
    if (!toSave.length) return;
    setSaving(true);
    for (const item of toSave) {
      try {
        await base44.entities.BusinessExpense.create({
          vendor_name: item.extracted.vendor_name,
          amount: parseFloat(item.extracted.amount) || 0,
          expense_date: item.extracted.expense_date,
          category: item.extracted.category,
          description: item.extracted.description,
          receipt_url: item.extracted.receipt_url,
          payment_method: 'credit_card',
          tax_deductible: true,
          business_use_percentage: 100,
          tags: ['bulk-scan'],
        });
        updateItem(item.id, { saved: true });
      } catch (err) {
        updateItem(item.id, { status: 'error', error: 'Save failed' });
      }
    }
    setSaving(false);
    onSaved();
  };

  const donCount = items.filter(it => it.status === 'done' && !it.saved).length;
  const scanningCount = items.filter(it => it.status === 'scanning').length;
  const savedCount = items.filter(it => it.saved).length;

  const handleClose = () => {
    items.forEach(it => URL.revokeObjectURL(it.preview));
    setItems([]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Upload className="w-6 h-6 text-cyan-600" />
            Bulk Receipt Scanner
          </DialogTitle>
        </DialogHeader>

        {/* Drop zone / file picker */}
        <div
          className="mt-4 border-2 border-dashed border-slate-300 rounded-xl p-8 text-center cursor-pointer hover:border-cyan-400 hover:bg-cyan-50 transition-colors"
          onClick={() => inputRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            e.preventDefault();
            const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
            if (!files.length) return;
            const newItems = files.map(createItem);
            setItems(prev => [...prev, ...newItems]);
            newItems.forEach(item => scanItem(item));
          }}
        >
          <ImagePlus className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <p className="font-medium text-slate-700">Click or drag & drop receipt photos</p>
          <p className="text-sm text-slate-500 mt-1">Supports multiple images at once — all will be scanned automatically</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFilesSelected}
          />
        </div>

        {/* Status bar */}
        {items.length > 0 && (
          <div className="flex flex-wrap gap-3 items-center text-sm mt-2">
            <span className="text-slate-500">{items.length} receipt{items.length !== 1 ? 's' : ''}</span>
            {scanningCount > 0 && (
              <Badge className="bg-blue-100 text-blue-700 border-blue-300">
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                {scanningCount} scanning…
              </Badge>
            )}
            {donCount > 0 && (
              <Badge className="bg-green-100 text-green-700 border-green-300">
                {donCount} ready to save
              </Badge>
            )}
            {savedCount > 0 && (
              <Badge className="bg-slate-100 text-slate-600 border-slate-300">
                {savedCount} saved
              </Badge>
            )}
          </div>
        )}

        {/* Items list */}
        {items.length > 0 && (
          <div className="space-y-3 mt-2">
            {items.map(item => (
              <div key={item.id} className="flex gap-3 p-3 border border-slate-200 rounded-xl bg-slate-50">
                {/* Thumbnail */}
                <img
                  src={item.preview}
                  alt="receipt"
                  className="w-16 h-16 object-cover rounded-lg border border-slate-200 flex-shrink-0"
                />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {item.status === 'pending' && (
                    <p className="text-sm text-slate-500 mt-4">Waiting…</p>
                  )}
                  {item.status === 'scanning' && (
                    <div className="flex items-center gap-2 mt-4 text-blue-600">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Scanning receipt…</span>
                    </div>
                  )}
                  {item.status === 'error' && (
                    <div className="flex items-center gap-2 mt-2">
                      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                      <span className="text-sm text-red-600">{item.error}</span>
                      <button onClick={() => retryItem(item)} className="text-xs text-blue-600 underline ml-1">Retry</button>
                    </div>
                  )}
                  {item.status === 'done' && item.extracted && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div>
                        <label className="block text-slate-500 mb-0.5">Vendor</label>
                        <input
                          className="w-full border border-slate-300 rounded px-2 py-1 text-slate-800 bg-white text-xs"
                          value={item.extracted.vendor_name}
                          onChange={e => updateExtracted(item.id, 'vendor_name', e.target.value)}
                          disabled={item.saved}
                        />
                      </div>
                      <div>
                        <label className="block text-slate-500 mb-0.5">Amount</label>
                        <input
                          type="number"
                          step="0.01"
                          className="w-full border border-slate-300 rounded px-2 py-1 text-slate-800 bg-white text-xs"
                          value={item.extracted.amount}
                          onChange={e => updateExtracted(item.id, 'amount', e.target.value)}
                          disabled={item.saved}
                        />
                      </div>
                      <div>
                        <label className="block text-slate-500 mb-0.5">Date</label>
                        <input
                          type="date"
                          className="w-full border border-slate-300 rounded px-2 py-1 text-slate-800 bg-white text-xs"
                          value={item.extracted.expense_date}
                          onChange={e => updateExtracted(item.id, 'expense_date', e.target.value)}
                          disabled={item.saved}
                        />
                      </div>
                      <div>
                        <label className="block text-slate-500 mb-0.5">Category</label>
                        <select
                          className="w-full border border-slate-300 rounded px-2 py-1 text-slate-800 bg-white text-xs"
                          value={item.extracted.category}
                          onChange={e => updateExtracted(item.id, 'category', e.target.value)}
                          disabled={item.saved}
                        >
                          {CATEGORY_OPTIONS.map(c => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                  {item.saved && (
                    <div className="flex items-center gap-1 mt-1 text-green-600 text-xs">
                      <CheckCircle className="w-3 h-3" />
                      Saved to expenses
                    </div>
                  )}
                </div>

                {/* Remove btn */}
                {!item.saved && (
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-slate-400 hover:text-red-500 flex-shrink-0 self-start mt-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-4 border-t mt-2">
          <Button variant="outline" onClick={handleClose}>
            {savedCount > 0 ? 'Close' : 'Cancel'}
          </Button>
          {donCount > 0 && (
            <Button
              onClick={saveAll}
              disabled={saving}
              className="bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</>
              ) : (
                <><Save className="w-4 h-4 mr-2" />Save {donCount} Expense{donCount !== 1 ? 's' : ''}</>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}