import React from 'react';
import { CheckCircle2, Circle, Clock, AlertCircle, Edit2 } from 'lucide-react';
import { parseISO, isPast, isToday, isTomorrow, format } from 'date-fns';

function dateLabel(dateStr) {
  if (!dateStr) return null;
  const d = parseISO(dateStr);
  if (isToday(d)) return 'Today';
  if (isTomorrow(d)) return 'Tomorrow';
  if (isPast(d)) return '⚠ Past due';
  return format(d, 'MMM d');
}

export default function TaskRow({ task, onStatusChange, editing, onToggleEdit }) {
  const statusIcon = {
    completed: <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0"/>,
    in_progress: <Clock className="w-4 h-4 text-orange-500 flex-shrink-0"/>,
    not_started: <Circle className="w-4 h-4 text-slate-300 flex-shrink-0"/>,
  }[task.status] || <Circle className="w-4 h-4 text-slate-300 flex-shrink-0"/>;

  const overdue = task.due_date && isPast(parseISO(task.due_date)) && task.status !== 'completed';

  return (
    <div className={`flex items-start gap-2 p-2.5 rounded-lg border transition-colors ${task.status==='completed' ? 'bg-green-50 border-green-100' : overdue ? 'bg-red-50 border-red-100' : 'bg-white border-slate-100 hover:bg-slate-50'}`}>
      <button onClick={() => onStatusChange(task.status === 'completed' ? 'not_started' : task.status === 'not_started' ? 'in_progress' : 'completed')} className="mt-0.5">
        {statusIcon}
      </button>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium ${task.status==='completed' ? 'line-through text-slate-400' : 'text-slate-800'}`}>{task.task}</div>
        {task.definition_of_done && task.status !== 'completed' && (
          <p className="text-xs text-cyan-700 mt-0.5">Done means: {task.definition_of_done}</p>
        )}
        {editing && <p className="text-xs text-slate-500 mt-0.5">{task.description}</p>}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {task.due_date && (
          <span className={`text-xs px-1.5 py-0.5 rounded ${overdue ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>
            {dateLabel(task.due_date)}
          </span>
        )}
        {task.priority === 'high' && <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0"/>}
        <button onClick={onToggleEdit} className="text-slate-300 hover:text-slate-500">
          <Edit2 className="w-3.5 h-3.5"/>
        </button>
      </div>
    </div>
  );
}