import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ClipboardList, AlertTriangle, CalendarClock, Ban, UserX, FlaskConical } from 'lucide-react';
import { format, addDays } from 'date-fns';

// Chapter 3 P1 — cross-sale workload / weekly planner. ONE view over existing
// EstateSale, SaleTask and Item research flags. No Workload records are created,
// and this is workload VISIBILITY only — never a capacity recommendation.

const STATUS_STYLES = {
  active: 'bg-green-100 text-green-800 border-green-300',
  upcoming: 'bg-blue-100 text-blue-800 border-blue-300',
  draft: 'bg-amber-100 text-amber-800 border-amber-300',
};

export default function OperatorWorkload() {
  const navigate = useNavigate();
  const [sales, setSales] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [researchItems, setResearchItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const me = await base44.auth.me();
      const [mySales, myTasks, flagged] = await Promise.all([
        base44.entities.EstateSale.filter({ operator_id: me.id }),
        base44.entities.SaleTask.filter({ operator_id: me.id }),
        base44.entities.Item.filter({
          seller_id: me.id,
          research_status: { $in: ['RESEARCH_NEEDED', 'VERIFY', 'SPECIALIST_REVIEW'] },
        }).catch(() => []),
      ]);
      setSales(mySales || []);
      setTasks(myTasks || []);
      setResearchItems(flagged || []);
    } catch (error) {
      console.error('Error loading workload:', error);
    } finally {
      setLoading(false);
    }
  };

  const saleById = useMemo(() => Object.fromEntries((sales || []).map(s => [s.id, s])), [sales]);
  const activeSales = useMemo(
    () => (sales || []).filter(s => ['active', 'upcoming', 'draft'].includes(s.status)),
    [sales]
  );

  const groups = useMemo(() => {
    const open = tasks.filter(t => t.status !== 'completed');
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const weekEndStr = format(addDays(new Date(), 7), 'yyyy-MM-dd');
    return {
      overdue: open.filter(t => t.due_date && t.due_date < todayStr),
      today: open.filter(t => t.due_date === todayStr),
      thisWeek: open.filter(t => t.due_date && t.due_date > todayStr && t.due_date <= weekEndStr),
      blocked: open.filter(t => t.blocked),
      unassigned: open.filter(t => !t.assignee_user_id),
    };
  }, [tasks]);

  const saleTaskStats = (saleId) => {
    const st = tasks.filter(t => t.sale_id === saleId);
    const open = st.filter(t => t.status !== 'completed');
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    return {
      open: open.length,
      overdue: open.filter(t => t.due_date && t.due_date < todayStr).length,
      blocked: open.filter(t => t.blocked).length,
      high: open.filter(t => t.priority === 'high').length,
      research: researchItems.filter(r => r.estate_sale_id === saleId).length,
    };
  };

  const nextDate = (sale) => {
    const dates = (sale.sale_dates || []).map(d => d && d.date).filter(Boolean).sort();
    return dates[0] || null;
  };

  const TaskRow = ({ task }) => {
    const sale = saleById[task.sale_id];
    return (
      <button
        onClick={() => navigate(`/SaleTasks?saleId=${task.sale_id}`)}
        className="w-full text-left border border-slate-200 rounded-lg p-3 hover:bg-slate-50 flex items-center justify-between gap-3"
      >
        <div className="min-w-0">
          <p className="font-medium text-sm text-slate-900 truncate">{task.name}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {sale ? sale.title : 'Sale'}{task.due_date ? ` · Due ${format(new Date(task.due_date), 'MMM d')}` : ''}
            {task.assignee_name ? ` · ${task.assignee_name}` : ' · Unassigned'}
          </p>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          {task.priority === 'high' && <Badge className="bg-red-100 text-red-700 border border-red-300">High</Badge>}
          {task.blocked && <Badge className="bg-orange-100 text-orange-700 border border-orange-300">Blocked</Badge>}
        </div>
      </button>
    );
  };

  const Group = ({ icon: Icon, label, items, tone }) => (
    <div>
      <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${tone}`} />
        {label} ({items.length})
      </h3>
      {items.length === 0 ? (
        <p className="text-xs text-slate-400 pl-6 pb-2">Nothing here.</p>
      ) : (
        <div className="space-y-2">
          {items.slice(0, 12).map(t => <TaskRow key={t.id} task={t} />)}
          {items.length > 12 && <p className="text-xs text-slate-400 pl-3">+{items.length - 12} more…</p>}
        </div>
      )}
    </div>
  );

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold text-slate-900">Workload & Weekly Planner</h1>
        <p className="text-sm md:text-base text-slate-600">
          Where is the pressure across your business this week — tasks, research, and blocked work across every active sale.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-500 text-sm">
          <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading your workload…
        </div>
      ) : (
        <>
          {/* Per-sale pressure cards */}
          <div>
            <h2 className="text-base font-semibold text-slate-900 mb-3">By Sale ({activeSales.length})</h2>
            {activeSales.length === 0 ? (
              <p className="text-sm text-slate-500">No active or upcoming sales right now.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {activeSales.map(s => {
                  const st = saleTaskStats(s.id);
                  const teamSize = (s.sale_team || []).length;
                  return (
                    <button
                      key={s.id}
                      onClick={() => navigate(`/SaleEditor?saleId=${s.id}`)}
                      className="text-left border border-slate-200 rounded-xl p-4 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-slate-900 truncate">{s.title || 'Untitled sale'}</p>
                        <Badge className={`flex-shrink-0 ${STATUS_STYLES[s.status] || ''}`}>{s.status}</Badge>
                      </div>
                      {nextDate(s) && (
                        <p className="text-xs text-slate-500 mt-1">Next sale date: {format(new Date(nextDate(s)), 'EEE, MMM d, yyyy')}</p>
                      )}
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {st.open > 0 && <Badge className="bg-slate-100 text-slate-700 border border-slate-300">{st.open} open task{st.open === 1 ? '' : 's'}</Badge>}
                        {st.overdue > 0 && <Badge className="bg-red-100 text-red-700 border border-red-300">{st.overdue} overdue</Badge>}
                        {st.blocked > 0 && <Badge className="bg-orange-100 text-orange-700 border border-orange-300">{st.blocked} blocked</Badge>}
                        {st.high > 0 && <Badge className="bg-rose-100 text-rose-700 border border-rose-300">{st.high} high priority</Badge>}
                        {st.research > 0 && <Badge className="bg-violet-100 text-violet-700 border border-violet-300">{st.research} research</Badge>}
                        {teamSize > 0 && <Badge className="bg-cyan-100 text-cyan-700 border border-cyan-300">{teamSize} team</Badge>}
                        {st.open === 0 && st.research === 0 && <Badge variant="outline" className="border-slate-200 text-slate-400">No open work</Badge>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Weekly planner */}
          <Card>
            <CardContent className="pt-6 space-y-5">
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-slate-500" />
                This Week Across All Sales
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4">
                <Group icon={AlertTriangle} label="Overdue" items={groups.overdue} tone="text-red-500" />
                <Group icon={CalendarClock} label="Due Today" items={groups.today} tone="text-orange-500" />
                <Group icon={CalendarClock} label="Due This Week" items={groups.thisWeek} tone="text-blue-500" />
                <Group icon={Ban} label="Blocked" items={groups.blocked} tone="text-orange-500" />
                <Group icon={UserX} label="Unassigned" items={groups.unassigned} tone="text-slate-400" />
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-2">
                    <FlaskConical className="w-4 h-4 text-violet-500" />
                    Research-Needed Items ({researchItems.length})
                  </h3>
                  {researchItems.length === 0 ? (
                    <p className="text-xs text-slate-400 pl-6">No items flagged for research.</p>
                  ) : (
                    <div className="space-y-2">
                      {researchItems.slice(0, 12).map(r => (
                        <button
                          key={r.id}
                          onClick={() => r.estate_sale_id && navigate(`/SaleInventory?id=${r.estate_sale_id}`)}
                          className="w-full text-left border border-slate-200 rounded-lg p-3 hover:bg-slate-50"
                        >
                          <p className="font-medium text-sm text-slate-900 truncate">{r.title || 'Unnamed item'}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {saleById[r.estate_sale_id]?.title || 'Unassigned to a sale'}
                            {r.research_reason ? ` — ${r.research_reason}` : ''}
                          </p>
                          <Badge className="bg-violet-100 text-violet-700 border border-violet-300 mt-1">{r.research_status === 'VERIFY' ? 'Verify' : r.research_status === 'SPECIALIST_REVIEW' ? 'Specialist Review' : 'Research Needed'}</Badge>
                        </button>
                      ))}
                      {researchItems.length > 12 && <p className="text-xs text-slate-400 pl-3">+{researchItems.length - 12} more…</p>}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <p className="text-xs text-slate-400">
            Workload visibility only — this is not a capacity recommendation. Click any sale or task to open it in its canonical workspace.
          </p>
        </>
      )}
    </div>
  );
}