// Chapter 20 P1-40..P1-43 — MANAGER PRIORITY QUEUE: deterministic attention
// ordering (CRITICAL → IMPORTANT → ROUTINE, oldest first within a group).
// No AI, no opaque score. A human can always escalate.
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowUp, ListOrdered } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { priorityQueue } from './liveSaleModel';

const GROUP_STYLE = {
  CRITICAL: { badge: 'bg-red-100 text-red-700 border-red-300', title: 'CRITICAL — needs a person now' },
  IMPORTANT: { badge: 'bg-amber-100 text-amber-800 border-amber-300', title: 'IMPORTANT — manager attention' },
  ROUTINE: { badge: 'bg-slate-100 text-slate-500 border-slate-300', title: 'ROUTINE — ordinary questions' },
};

export default function AttentionQueueCard({ sale, issues, items, onChanged }) {
  const [busy, setBusy] = useState(null);
  const queue = priorityQueue(issues);

  const escalate = async (issue) => {
    setBusy(issue.id);
    try {
      await base44.entities.SaleIssue.update(issue.id, { urgency: 'URGENT' });
      toast.success('Escalated to URGENT');
      onChanged && onChanged();
    } catch (e) {
      toast.error('Could not escalate');
    } finally {
      setBusy(null);
    }
  };

  const itemName = (id) => {
    const it = (items || []).find((i) => i.id === id);
    return it ? it.title : '';
  };

  const renderGroup = (group) => {
    const list = queue.filter((i) => {
      const isCritical = !!i.is_incident || ((i.urgency || 'ROUTINE') === 'URGENT' && ['safety', 'security', 'payment'].includes(i.category || 'other'));
      if (group === 'CRITICAL') return isCritical;
      const overdue = i.answer_by && i.answer_by < new Date().toISOString().slice(0, 10);
      const isImportant = !isCritical && (['URGENT', 'IMPORTANT'].includes(i.urgency || 'ROUTINE') || overdue);
      return group === 'IMPORTANT' ? isImportant : (!isCritical && !isImportant);
    });
    if (list.length === 0) return null;
    return (
      <div className="space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{GROUP_STYLE[group].title} ({list.length})</p>
        {list.map((i) => (
          <div key={i.id} className="p-2 rounded border border-slate-200 bg-white space-y-1">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-slate-900 min-w-0">{i.title}</p>
              <div className="flex flex-wrap gap-1 flex-shrink-0 justify-end">
                <Badge variant="outline" className={`text-[10px] ${GROUP_STYLE[group].badge}`}>{group}</Badge>
                {i.is_incident && <Badge className="text-[10px] bg-rose-100 text-rose-700 border border-rose-300">INCIDENT</Badge>}
                <Badge variant="outline" className="text-[10px]">{i.status}</Badge>
              </div>
            </div>
            <p className="text-[10px] text-slate-500">
              {i.category} · Owner: {i.owner_name || 'Unassigned'} · Raised by {i.requested_by_name || '—'}
              {i.created_date ? ` · ${format(new Date(i.created_date), 'MMM d, h:mm a')}` : ''}
              {i.item_id && itemName(i.item_id) ? ` · item: ${itemName(i.item_id)}` : ''}
            </p>
            {(group !== 'CRITICAL') && (i.urgency || 'ROUTINE') !== 'URGENT' && (
              <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" disabled={busy === i.id} onClick={() => escalate(i)}>
                <ArrowUp className="w-3 h-3 mr-1" />Escalate
              </Button>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <ListOrdered className="w-5 h-5 text-red-600" /> Needs Attention
          <Badge variant="outline">{queue.length} open</Badge>
        </CardTitle>
        <p className="text-xs text-slate-500">Ordered by urgency → blocking → age (deterministic). Ordinary questions stay out of the critical area.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {queue.length === 0 && <p className="text-xs text-slate-400">No open issues — nothing is waiting on a person.</p>}
        {renderGroup('CRITICAL')}
        {renderGroup('IMPORTANT')}
        {renderGroup('ROUTINE')}
      </CardContent>
    </Card>
  );
}