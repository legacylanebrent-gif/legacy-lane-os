import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Plus, Trash2 } from 'lucide-react';
import { priceRowText } from '@/components/signs/pricingSignModel';

const MODES = [
  { value: 'range', label: 'Price range' },
  { value: 'starts_at', label: 'Starts at' },
  { value: 'text', label: 'Custom text' },
];

const toEditRow = (row) => ({
  label: row.label || '',
  included: row.included !== false,
  mode: row.mode || (row.price ? 'text' : 'range'),
  min: row.min ?? '',
  max: row.max ?? '',
  starts_at: row.starts_at ?? '',
  text: row.text ?? row.price ?? '',
});

// Edit one pricing sign FOR THIS SALE: keep or drop each item, and set the price
// range or "starts at" value that prints. Saving never touches the library sign
// and never changes an item's price — it creates the sale's own copy.
export default function SignEditDialog({ open, onClose, sale, template, existing, onSaved }) {
  const [name, setName] = useState('');
  const [heading, setHeading] = useState('');
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    const baseRows = existing?.rows?.length ? existing.rows : (template?.pages?.[0]?.rows || []);
    setName(existing?.name || template?.name || '');
    setHeading(existing?.heading || template?.pages?.[0]?.heading || template?.name || '');
    setRows(baseRows.map(toEditRow));
    setError('');
  }, [open, existing?.id, template?.id]);

  const update = (index, patch) =>
    setRows(prev => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  const remove = (index) => setRows(prev => prev.filter((_, i) => i !== index));
  const addRow = () => setRows(prev => [
    ...prev,
    { label: '', included: true, mode: 'range', min: '', max: '', starts_at: '', text: '' },
  ]);

  const suggestItems = async () => {
    const topic = heading || name;
    if (!topic.trim()) {
      setError('Name the sign first so the AI knows what to list.');
      return;
    }
    setAiLoading(true);
    setError('');
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You price items for a US estate sale company. List the typical items that belong on a printed pricing sign titled "${topic}". Give 8 to 10 common items a shopper would look for on that sign, each with a realistic low and high asking price range in whole US dollars for a typical estate sale, not retail. Keep labels short and in title case, with no hyphens or dashes.`,
        response_json_schema: {
          type: 'object',
          properties: {
            rows: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  label: { type: 'string' },
                  min: { type: 'number' },
                  max: { type: 'number' },
                },
                required: ['label', 'min', 'max'],
              },
            },
          },
          required: ['rows'],
        },
      });
      const suggested = (res?.rows || []).map(r => toEditRow({
        label: r.label,
        min: r.min,
        max: r.max,
        mode: 'range',
      }));
      setRows(prev => {
        const seen = new Set(prev.map(r => r.label.trim().toLowerCase()).filter(Boolean));
        return [...prev, ...suggested.filter(r => !seen.has(r.label.trim().toLowerCase()))];
      });
    } catch (e) {
      console.error('AI sign suggestion failed:', e);
      setError('The AI could not build a list right now. Try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const save = async () => {
    if (!name.trim()) {
      setError('Give this sign a name.');
      return;
    }
    if (!sale?.id) {
      setError('This sign needs a sale. Open it from a sale.');
      return;
    }
    setSaving(true);
    setError('');
    const payload = {
      sale_id: sale.id,
      operator_id: sale.operator_id || existing?.operator_id || '',
      name: name.trim(),
      heading: heading.trim() || name.trim(),
      base_template_id: existing?.base_template_id || template?.id || '',
      source: existing?.source || (template ? 'modified' : 'custom'),
      rows: rows
        .map(row => ({ ...row, label: row.label.trim() }))
        .filter(row => row.label),
    };
    try {
      const saved = existing
        ? await base44.entities.SaleSignTemplate.update(existing.id, payload)
        : await base44.entities.SaleSignTemplate.create(payload);
      onSaved?.(saved);
    } catch (e) {
      console.error('Could not save custom sign:', e);
      setError('Could not save this sign. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const kept = rows.filter(r => r.included).length;

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose?.(); }}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existing ? 'Edit' : 'New'} Pricing Sign</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            {sale?.title ? `${sale.title} — ` : ''}Uncheck any item you do not want on this sign, then set the price range or
            starts at value that prints. {kept} of {rows.length} items will print.
          </p>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="sign-name" className="text-xs">Sign name</Label>
              <Input
                id="sign-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Kitchen Pricing"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sign-heading" className="text-xs">Heading that prints</Label>
              <Input
                id="sign-heading"
                value={heading}
                onChange={(e) => setHeading(e.target.value)}
                placeholder="e.g. Kitchen"
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={suggestItems} disabled={aiLoading}>
              <Sparkles className="w-4 h-4 mr-1" />
              {aiLoading ? 'Building list...' : 'Suggest items with AI'}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={addRow}>
              <Plus className="w-4 h-4 mr-1" />
              Add item
            </Button>
          </div>

          <div className="space-y-2">
            {rows.length === 0 && (
              <p className="text-sm text-slate-500 border border-dashed border-slate-300 rounded-lg p-4 text-center">
                No items yet. Add one, or let the AI suggest the typical items for this sign.
              </p>
            )}
            {rows.map((row, index) => (
              <div key={index} className="border border-slate-200 rounded-lg p-2.5 space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={row.included}
                    onCheckedChange={(value) => update(index, { included: !!value })}
                    aria-label={`Include ${row.label || 'item'}`}
                  />
                  <Input
                    value={row.label}
                    onChange={(e) => update(index, { label: e.target.value })}
                    placeholder="Item name"
                    className={`h-8 text-sm flex-1 ${row.included ? '' : 'text-slate-400 line-through'}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-400 hover:text-red-600 flex-shrink-0"
                    onClick={() => remove(index)}
                    aria-label="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex flex-wrap items-center gap-2 pl-7">
                  <Select value={row.mode} onValueChange={(value) => update(index, { mode: value })}>
                    <SelectTrigger className="h-8 w-32 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MODES.map(mode => (
                        <SelectItem key={mode.value} value={mode.value}>{mode.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {row.mode === 'range' && (
                    <>
                      <Input
                        type="number"
                        min="0"
                        step="0.5"
                        value={row.min}
                        onChange={(e) => update(index, { min: e.target.value })}
                        placeholder="Low $"
                        className="h-8 w-20 text-xs"
                      />
                      <span className="text-xs text-slate-400">to</span>
                      <Input
                        type="number"
                        min="0"
                        step="0.5"
                        value={row.max}
                        onChange={(e) => update(index, { max: e.target.value })}
                        placeholder="High $"
                        className="h-8 w-20 text-xs"
                      />
                    </>
                  )}

                  {row.mode === 'starts_at' && (
                    <Input
                      type="number"
                      min="0"
                      step="0.5"
                      value={row.starts_at}
                      onChange={(e) => update(index, { starts_at: e.target.value })}
                      placeholder="Starts at $"
                      className="h-8 w-24 text-xs"
                    />
                  )}

                  {row.mode === 'text' && (
                    <Input
                      value={row.text}
                      onChange={(e) => update(index, { text: e.target.value })}
                      placeholder="Prints as written, e.g. 30% OFF"
                      className="h-8 flex-1 min-w-[140px] text-xs"
                    />
                  )}

                  <span className="text-xs font-medium text-slate-500 ml-auto">{priceRowText(row)}</span>
                </div>
              </div>
            ))}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="button" className="bg-orange-600 hover:bg-orange-700" onClick={save} disabled={saving}>
              {saving ? 'Saving...' : 'Save Sign'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}