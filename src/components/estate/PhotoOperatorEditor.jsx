import React, { useState } from 'react';
import { Loader2, Check, X } from 'lucide-react';
import BrandInput from '@/components/brands/BrandInput';

/**
 * The operator's own title / description / brand / price for one photo.
 * Nothing here is AI: the values are saved as operator edits through the
 * canonical pipeline, so a later re-analysis never overwrites them.
 *
 * Brand is chosen from the shared brands list (or typed as a new one, which is
 * added to that list) — the same list the analysis run adds to.
 */
export default function PhotoOperatorEditor({ photo, brand, busy, onSave, onClose }) {
  const [form, setForm] = useState({
    name: photo?.name || '',
    description: photo?.description || '',
    brand: brand?.name || '',
    price: photo?.price ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = key => event => setForm(current => ({ ...current, [key]: event.target.value }));

  const save = async () => {
    if (saving) return;
    setError('');
    setSaving(true);
    const ok = await onSave({
      name: form.name,
      description: form.description,
      brand: form.brand,
      price: form.price === '' ? null : form.price,
    });
    setSaving(false);
    if (ok) onClose();
    else setError('Could not save. Reload the sale and try again.');
  };

  const field = 'w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[12px] text-slate-800 focus:border-cyan-600 focus:outline-none';

  return (
    <div className="space-y-2 border-t border-slate-200 px-2.5 py-2.5">
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Title</label>
        <input value={form.name} onChange={set('name')} placeholder="Item title" className={`${field} mt-0.5`} />
      </div>
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Description</label>
        <textarea value={form.description} onChange={set('description')} rows={3} placeholder="Item description" className={`${field} mt-0.5 resize-y`} />
      </div>
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Brand</label>
        <BrandInput
          value={form.brand}
          onChange={next => setForm(current => ({ ...current, brand: next }))}
          placeholder="Brand or maker — leave blank if unknown"
          wrapperClassName="mt-0.5"
          inputClassName={field}
          hint="Pick a brand from the list, or type a new one to add it. Only enter a brand you can actually support."
        />
      </div>
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Price</label>
        <div className="relative mt-0.5">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[12px] text-slate-500">$</span>
          <input
            value={form.price}
            onChange={set('price')}
            inputMode="decimal"
            placeholder="0"
            className={`${field} pl-4`}
          />
        </div>
      </div>

      {error && <p className="text-[11px] text-red-600" role="alert">{error}</p>}

      <div className="flex gap-1.5">
        <button
          type="button"
          disabled={saving || busy}
          onClick={save}
          className="inline-flex items-center gap-1 rounded border border-cyan-600 bg-cyan-600 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-cyan-700 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
          Save
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={onClose}
          className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-700 disabled:opacity-50"
        >
          <X className="w-3 h-3" /> Cancel
        </button>
      </div>
    </div>
  );
}