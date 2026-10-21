// Chapter 7 P2 — marketing photo approval grid.
// The smallest useful APPROVED FOR MARKETING state: only photos the operator
// explicitly checks become marketing-eligible, and photos already excluded by
// the Chapter 6 sensitive-material guardrails (skip / do-not-search) cannot be
// approved at all.
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ImageOff, CheckCircle2, Loader2 } from 'lucide-react';

export default function PhotoApprovalGrid({ photos, approved, onSaved, saving }) {
  const [selected, setSelected] = useState(new Set(approved || []));

  const toggle = (idx) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {photos.map(p => (
          <button key={p.index} type="button" onClick={() => toggle(p.index)}
            className={`relative rounded-lg overflow-hidden border-2 transition-colors ${selected.has(p.index) ? 'border-cyan-600' : 'border-slate-200'}`}>
            <img src={p.url} alt="Sale photo" className="w-full h-28 object-cover" loading="lazy" />
            {selected.has(p.index) && (
              <span className="absolute top-1.5 right-1.5 bg-cyan-600 rounded-full p-0.5"><CheckCircle2 className="w-4 h-4 text-white" /></span>
            )}
            <span className="absolute bottom-0 inset-x-0 bg-black/55 text-white text-[10px] px-2 py-1">
              {selected.has(p.index) ? 'Approved for marketing' : 'Not approved'}
            </span>
          </button>
        ))}
        {photos.length === 0 && (
          <div className="col-span-full bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-500 flex items-center gap-2">
            <ImageOff className="w-4 h-4" /> No marketing-eligible sale photos (skipped or do-not-search photos are never eligible).
          </div>
        )}
      </div>
      {photos.length > 0 && (
        <div className="mt-3 flex items-center gap-3">
          <Button size="sm" disabled={saving} onClick={() => onSaved([...selected].sort((a, b) => a - b))}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null} Save photo approvals
          </Button>
          <Badge variant="outline" className="text-slate-500">{selected.size} approved</Badge>
        </div>
      )}
    </div>
  );
}