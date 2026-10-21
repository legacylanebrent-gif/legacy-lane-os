// Chapter 18 P1-15/P1-18 — canonical featured-Item picks for marketing with a
// DETERMINISTIC availability conflict warning. A pick that is sold/unavailable
// surfaces REMOVE/UPDATE for FUTURE material; already-sent or published
// external content is a snapshot and is never claimed to be recallable.
import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, Loader2, AlertTriangle, X } from 'lucide-react';

export default function FeaturedItemsCard({ items, featured, warnings, onSave, saving }) {
  const [pick, setPick] = useState('');
  const availableForPicking = (items || []).filter(i => i.status === 'available');
  const picks = featured || [];

  const add = async () => {
    if (!pick) return;
    const ids = [...picks.map(p => p.id)];
    if (!ids.includes(pick)) ids.push(pick);
    await onSave(ids);
    setPick('');
  };
  const remove = async (id) => onSave(picks.map(p => p.id).filter(x => x !== id));

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5">
      <div className="font-semibold text-slate-900 mb-1 flex items-center gap-2"><Package className="w-4 h-4 text-cyan-700" /> Featured merchandise (canonical Items)</div>
      <p className="text-sm text-slate-500 mb-3">
        Pick real Items from this sale to highlight. Their CURRENT availability is checked automatically.
      </p>

      {(warnings || []).length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 mb-3">
          {warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-red-800">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                <span className="font-semibold">{w.title || 'A featured item'} is {String(w.status || '').toUpperCase()}</span> — remove or update it from FUTURE campaign material.
                <span className="block text-xs text-red-600 mt-0.5">Already-sent email/SMS, published social posts and print are snapshots and cannot be recalled.</span>
              </span>
            </div>
          ))}
        </div>
      )}

      {picks.length > 0 ? (
        <ul className="space-y-1.5 mb-3">
          {picks.map(f => (
            <li key={f.id} className="flex items-center justify-between gap-2 text-sm border border-slate-100 rounded-md px-3 py-1.5">
              <span className="text-slate-800 truncate">
                {f.item_number ? `#${String(f.item_number).padStart(3, '0')} ` : ''}{f.title || 'Item'}
                {f.price != null && <span className="text-slate-500"> — ${f.price}</span>}
              </span>
              <span className="flex items-center gap-2 shrink-0">
                {f.status && f.status !== 'available'
                  ? <Badge className="bg-red-100 text-red-800 border-red-200 text-[11px]">{f.status}</Badge>
                  : <Badge className="bg-green-100 text-green-800 border-green-200 text-[11px]">available</Badge>}
                <button onClick={() => remove(f.id)} aria-label="Remove pick" className="text-slate-400 hover:text-red-600"><X className="w-4 h-4" /></button>
              </span>
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-slate-400 mb-3">No canonical Item picks yet.</p>}

      <div className="flex flex-col sm:flex-row gap-2">
        <select value={pick} onChange={e => setPick(e.target.value)} className="flex-1 text-sm border border-slate-200 rounded-md px-2 py-1.5 bg-white" aria-label="Pick an available item">
          <option value="">Pick an available item…</option>
          {availableForPicking.map(i => (
            <option key={i.id} value={i.id}>{i.item_number ? `#${String(i.item_number).padStart(3, '0')} ` : ''}{i.title}</option>
          ))}
        </select>
        <Button size="sm" variant="outline" onClick={add} disabled={!pick || saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null} Add pick
        </Button>
      </div>
      {(items || []).length === 0 && <p className="text-xs text-slate-400 mt-2">This sale has no inventory Items yet.</p>}
    </div>
  );
}