// Chapter 13 P1 — RETAINED-ITEM REGISTER (P1-20): an assembled, searchable view
// of significant KEEP / excluded merchandise from the canonical
// SaleClientDecision records and items/photos. NO RetainedItem entity — this
// view owns nothing; the decisions remain the truth.
import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Lock, Search } from 'lucide-react';

export default function RetainedRegister({ sale, decisions, items }) {
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    const byId = {};
    (items || []).forEach((i) => { byId[i.id] = i; });
    const list = (decisions || [])
      .filter((d) => d.decision_type === 'merchandise' && d.current_decision === 'keep')
      .map((d) => {
        if (d.item_id && byId[d.item_id]) {
          const item = byId[d.item_id];
          return {
            key: d.id, name: item.title, detail: item.description || '',
            photo: (item.images || [])[0], decidedAt: d.decided_at,
            authority: d.authorized_by_name, area: (item.location && item.location.city) || '',
            keptByDecision: d.subject,
          };
        }
        if (typeof d.image_index === 'number') {
          const img = (sale?.images || [])[d.image_index];
          const obj = typeof img === 'object' ? img : { url: img };
          return {
            key: d.id, name: obj.name || `Photo ${d.image_index + 1}`, detail: obj.description || '',
            photo: obj.url || obj.thumbnail_url, decidedAt: d.decided_at,
            authority: d.authorized_by_name, area: '', keptByDecision: d.subject,
          };
        }
        return {
          key: d.id, name: d.subject, detail: d.notes || '', photo: null,
          decidedAt: d.decided_at, authority: d.authorized_by_name, area: '', keptByDecision: d.subject,
        };
      });
    const q = query.trim().toLowerCase();
    return q ? list.filter((r) => (r.name + ' ' + r.detail).toLowerCase().includes(q)) : list;
  }, [decisions, items, sale, query]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Lock className="w-5 h-5 text-slate-600" /> Retained / Excluded Merchandise
          <Badge variant="outline" className="ml-1">{rows.length}</Badge>
        </CardTitle>
        <p className="text-xs text-slate-500">
          Everything the client KEEPS (client decisions — never changed by this view). Retained photos are private:
          they do not appear in the public gallery or marketing.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search retained merchandise…"
            className="pl-9 h-9" />
        </div>
        {rows.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-1">No KEEP decisions recorded yet.</p>
        )}
        {rows.slice(0, 12).map((r) => (
          <div key={r.key} className="flex items-center gap-3 p-2.5 border rounded-lg">
            {r.photo ? (
              <img src={r.photo} alt="" className="w-10 h-10 rounded object-cover border border-slate-200 flex-shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-[9px] text-slate-400 flex-shrink-0">KEEP</div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900 truncate">{r.name}</p>
              <p className="text-xs text-slate-500 truncate">
                {r.decidedAt ? `Kept ${new Date(r.decidedAt).toLocaleDateString()}` : 'Kept'}
                {r.authority ? ` · authorized by ${r.authority}` : ''}
                {r.area ? ` · ${r.area}` : ''}
              </p>
            </div>
            <Badge className="bg-slate-100 text-slate-600 border border-slate-300 flex-shrink-0">KEEP</Badge>
          </div>
        ))}
        {rows.length > 12 && <p className="text-xs text-slate-400 text-center">{rows.length - 12} more…</p>}
      </CardContent>
    </Card>
  );
}