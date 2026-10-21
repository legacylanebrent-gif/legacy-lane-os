// Chapter 18 P1-28/P1-29 — marketing responsibilities on the CANONICAL
// SaleTask (no MarketingTask entity created here), plus the pre-opening
// countdown: incomplete marketing work surfaced as opening approaches.
// Assembled deterministically — no new dashboard entity.
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarClock, ListChecks, Loader2 } from 'lucide-react';

// Task plan template — due dates are computed BACKWARD from opening day.
const PLAN = [
  ['Review sale listing', 10],
  ['Approve marketing photos', 7],
  ['Prepare email campaign draft', 5],
  ['Prepare SMS draft (drafts only — no SMS sending in EstateSalen)', 5],
  ['Publish social posts', 4],
  ['Print and place signs', 3],
  ['Final accuracy review', 2],
  ['Final-day reminder update', 1],
];

export function daysUntilOpening(sale) {
  const dates = (sale && sale.sale_dates || []).map(d => d && d.date).filter(Boolean).sort();
  const first = dates[0];
  if (!first) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const open = new Date(first + 'T00:00:00');
  return Math.round((open - today) / 86400000);
}

export function buildMarketingTaskPlan(sale, operatorId) {
  const opening = daysUntilOpening(sale);
  const firstDate = (sale && sale.sale_dates || []).map(d => d && d.date).filter(Boolean).sort()[0];
  return PLAN.map(([name, daysBefore]) => {
    let due = null;
    if (firstDate) {
      const d = new Date(firstDate + 'T00:00:00');
      d.setDate(d.getDate() - daysBefore);
      due = d.toISOString().slice(0, 10);
    }
    return {
      sale_id: sale.id,
      operator_id: operatorId,
      sale_team_ids: sale.sale_team || [],
      name: `[Marketing] ${name}`,
      description: `Chapter 18 marketing responsibility for "${sale.title}". Generated from the marketing task plan.`,
      category: 'Marketing',
      status: 'not_started',
      priority: daysBefore <= 2 ? 'high' : 'medium',
      due_date: due,
      source_type: 'ONBOARDING_TEMPLATE',
      sort_order: daysBefore,
    };
  });
}

export default function MarketingTasksCard({ sale, tasks, creating, onCreatePlan }) {
  const openTasks = (tasks || []).filter(t => t.status !== 'completed');
  const days = daysUntilOpening(sale);
  const hasPlan = (tasks || []).length > 0;
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="font-semibold text-slate-900 flex items-center gap-2"><CalendarClock className="w-4 h-4 text-cyan-700" /> Marketing countdown & tasks</div>
        {days != null && (
          <Badge variant="outline" className={days <= 3 ? 'text-red-700 border-red-200' : days <= 7 ? 'text-amber-700 border-amber-200' : 'text-slate-600'}>
            {days > 0 ? `${days} day${days === 1 ? '' : 's'} until opening` : days === 0 ? 'Opening today' : 'Sale has opened'}
          </Badge>
        )}
      </div>

      {openTasks.length > 0 ? (
        <ul className="space-y-1.5 mb-3">
          {openTasks.slice(0, 8).map(t => {
            const overdue = t.due_date && new Date(t.due_date) < new Date(new Date().toDateString());
            return (
              <li key={t.id} className="flex items-center justify-between gap-2 text-sm border border-slate-100 rounded-md px-3 py-1.5">
                <span className="text-slate-800 truncate"><ListChecks className="w-3.5 h-3.5 inline mr-1.5 text-slate-400" />{t.name}</span>
                <span className={`text-xs shrink-0 ${overdue ? 'text-red-600 font-medium' : 'text-slate-500'}`}>
                  {t.due_date ? (overdue ? `Overdue — ${t.due_date}` : `Due ${t.due_date}`) : 'No due date'}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-slate-400 mb-3">
          {hasPlan ? 'All marketing tasks are complete.' : 'No marketing task plan yet for this sale.'}
        </p>
      )}

      <Button size="sm" variant="outline" onClick={onCreatePlan} disabled={creating}>
        {creating ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <ListChecks className="w-4 h-4 mr-1.5" />}
        {hasPlan ? 'Re-create task plan' : 'Create marketing task plan'}
      </Button>
      <p className="text-xs text-slate-500 mt-2">
        Tasks reuse the sale's own task system (owner, due date, status, sale relationship) with due dates counted back from opening day.
      </p>
    </div>
  );
}