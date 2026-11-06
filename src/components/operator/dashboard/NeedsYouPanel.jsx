import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ClipboardList, Camera, CalendarOff, CheckCircle2, ArrowRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { rows, localDateKey } from './saleDayMetrics';

function Row({ icon: Icon, tone, label, count, hint, to }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 transition-colors hover:border-slate-300 hover:bg-slate-50"
    >
      <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${tone}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900 truncate">{label}</p>
        {hint && <p className="text-[11px] text-slate-500 truncate">{hint}</p>}
      </div>
      <span className="text-sm font-bold text-slate-900 tabular-nums">{count}</span>
      <ArrowRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
    </Link>
  );
}

export default function NeedsYouPanel({ user, sales }) {
  const [counts, setCounts] = useState({ overdueTasks: 0, openIssues: 0, urgentIssues: 0 });

  useEffect(() => {
    if (!user?.id) return undefined;
    let cancelled = false;
    const today = localDateKey();
    Promise.all([
      base44.entities.SaleTask.filter(
        { operator_id: user.id, status: { $in: ['not_started', 'in_progress'] }, due_date: { $lt: today } },
        { limit: 100 }
      ),
      base44.entities.SaleIssue.filter(
        { operator_id: user.id, status: { $in: ['OPEN', 'WAITING'] } },
        { limit: 100 }
      ),
    ])
      .then(([tasks, issues]) => {
        if (cancelled) return;
        const openIssues = rows(issues);
        setCounts({
          overdueTasks: rows(tasks).length,
          openIssues: openIssues.length,
          urgentIssues: openIssues.filter((i) => i.urgency === 'URGENT').length,
        });
      })
      .catch((e) => console.error('Needs you panel:', e));
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const draftsWithPhotos = (sales || []).filter(
    (s) => s.status === 'draft' && (s.images?.length || 0) > 0
  ).length;
  const undated = (sales || []).filter(
    (s) => ['draft', 'upcoming'].includes(s.status) && !(s.sale_dates || []).length
  ).length;

  const rowsToShow = [
    {
      key: 'tasks',
      show: counts.overdueTasks > 0,
      icon: ClipboardList,
      tone: 'bg-violet-100 text-violet-700',
      label: 'Overdue tasks',
      hint: 'Past their due date',
      count: counts.overdueTasks,
      to: '/MySales',
    },
    {
      key: 'issues',
      show: counts.openIssues > 0,
      icon: AlertCircle,
      tone: 'bg-orange-100 text-orange-700',
      label: 'Open sale issues',
      hint: counts.urgentIssues ? `${counts.urgentIssues} marked urgent` : 'Waiting for an answer',
      count: counts.openIssues,
      to: '/MySaleDay',
    },
    {
      key: 'drafts',
      show: draftsWithPhotos > 0,
      icon: Camera,
      tone: 'bg-cyan-100 text-cyan-700',
      label: 'Drafts ready to publish',
      hint: 'Photos loaded, still a draft',
      count: draftsWithPhotos,
      to: '/MySales',
    },
    {
      key: 'dates',
      show: undated > 0,
      icon: CalendarOff,
      tone: 'bg-amber-100 text-amber-700',
      label: 'Sales missing dates',
      hint: 'Add sale dates to go public',
      count: undated,
      to: '/MySales',
    },
  ].filter((r) => r.show);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="font-serif text-lg font-bold text-slate-900">Needs you now</h2>
          <p className="text-xs text-slate-500">The few things worth doing today</p>
        </div>
        <span className="text-[10px] uppercase tracking-[0.14em] font-semibold text-slate-400">
          {rowsToShow.length} item{rowsToShow.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="mt-3 space-y-2">
        {rowsToShow.length === 0 ? (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">You&apos;re all clear</p>
              <p className="text-[11px] text-emerald-700">No overdue work, issues, or unfinished drafts.</p>
            </div>
          </div>
        ) : (
          rowsToShow.map(({ key, ...row }) => <Row key={key} {...row} />)
        )}
      </div>
    </div>
  );
}