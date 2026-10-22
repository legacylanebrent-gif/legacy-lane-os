// Chapter 19 P1-22 — My Sale Day: my tasks with honest acceptance criteria.
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, ClipboardList } from 'lucide-react';

export default function MyDayTasksCard({ tasks }) {
  const open = (tasks || []).filter((t) => t.status !== 'completed');
  const done = (tasks || []).filter((t) => t.status === 'completed');
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-cyan-700" /> My tasks
          {open.length > 0 && <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-300">{open.length} open</Badge>}
        </CardTitle>
        <p className="text-xs text-slate-500">Definition of done is what must be TRUE before a task counts as complete.</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {open.length === 0 && done.length === 0 && <p className="text-sm text-slate-400">No tasks assigned to you.</p>}
        {open.map((t) => (
          <div key={t.id} className={`p-2.5 rounded-lg border ${t.blocked ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100'}`}>
            <p className="text-sm font-medium text-slate-800">{t.name}</p>
            {t.description && <p className="text-xs text-slate-500">{t.description}</p>}
            {t.definition_of_done && (
              <p className="text-xs text-slate-600 mt-1 flex items-start gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-cyan-600" />
                <span><span className="font-semibold">Done means:</span> {t.definition_of_done}</span>
              </p>
            )}
            <p className="text-xs text-slate-400 mt-1 flex flex-wrap gap-x-3">
              <span className="capitalize">{t.status?.replace(/_/g, ' ')}</span>
              {t.due_date && <span>Due {t.due_date}</span>}
              {t.priority === 'high' && <Badge className="bg-red-100 text-red-700 border-red-300">HIGH</Badge>}
              {t.blocked && <span className="text-amber-700">Blocked: {t.blocked_reason || 'waiting on something'}</span>}
            </p>
          </div>
        ))}
        {done.length > 0 && (
          <details>
            <summary className="text-xs text-slate-500 cursor-pointer">Completed ({done.length})</summary>
            <div className="mt-1 space-y-1">{done.map((t) => <p key={t.id} className="text-xs text-slate-400 line-through">{t.name}</p>)}</div>
          </details>
        )}
      </CardContent>
    </Card>
  );
}