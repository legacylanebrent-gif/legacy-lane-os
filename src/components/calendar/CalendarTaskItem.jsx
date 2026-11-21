import React from 'react';
import { CheckCircle2, Circle, AlertTriangle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// One SaleTask due on the selected calendar day: complete it or assign it
// to the sale owner / a member of that sale's team. The task record stays the
// single source of truth — nothing is copied onto the calendar.
export default function CalendarTaskItem({ task, saleTitle, assigneeOptions, onToggleComplete, onAssign }) {
  const done = task.status === 'completed';
  return (
    <div className="flex items-start gap-2 px-3 py-2 rounded-md border border-violet-200 bg-violet-50">
      <button
        type="button"
        onClick={onToggleComplete}
        title={done ? 'Mark as not started' : 'Mark complete'}
        className="mt-0.5 text-violet-700 hover:text-violet-900 shrink-0"
      >
        {done ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
      </button>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium break-words ${done ? 'line-through text-slate-400' : 'text-slate-800'}`}>
          {task.name}
        </p>
        <p className="text-[11px] text-slate-500 truncate">
          {saleTitle}{task.category ? ` · ${task.category}` : ''}
        </p>
        {task.blocked && (
          <p className="text-[11px] text-red-600 flex items-start gap-1">
            <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
            <span className="break-words">Blocked{task.blocked_reason ? `: ${task.blocked_reason}` : ''}</span>
          </p>
        )}
      </div>
      <Select value={task.assignee_user_id || 'unassigned'} onValueChange={onAssign}>
        <SelectTrigger className="h-7 w-[118px] text-xs shrink-0">
          <SelectValue placeholder="Unassigned" />
        </SelectTrigger>
        <SelectContent>
          {assigneeOptions.map(o => (
            <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}