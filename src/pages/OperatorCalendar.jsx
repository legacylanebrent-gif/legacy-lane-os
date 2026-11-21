import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, CalendarDays, Columns3 } from 'lucide-react';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, addWeeks, eachDayOfInterval, format, isSameMonth, isToday, isSameDay } from 'date-fns';
import BackToMySales from '@/components/layout/BackToMySales';
import CalendarTaskItem from '@/components/calendar/CalendarTaskItem';

// Chapter 3 P1 — operator sale calendar. A VIEW over existing EstateSale.sale_dates;
// no scheduling records are created or duplicated here. Consumer MyCalendar is untouched.

const STATUS_STYLES = {
  active: 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200',
  upcoming: 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200',
  draft: 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200',
  completed: 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200',
  archived: 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200',
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function OperatorCalendar() {
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [sales, setSales] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [userNames, setUserNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('month');
  const [cursor, setCursor] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const user = await base44.auth.me();
      setMe(user);
      const [mySales, myTasks] = await Promise.all([
        base44.entities.EstateSale.filter({ operator_id: user.id }),
        base44.entities.SaleTask.filter({ operator_id: user.id }),
      ]);
      const saleList = Array.isArray(mySales) ? mySales : (mySales?.items || []);
      setSales(saleList);
      setTasks(Array.isArray(myTasks) ? myTasks : (myTasks?.items || []));

      // Names for the people a task can be assigned to (sale team members).
      const teamIds = [...new Set(saleList.flatMap(s => s.sale_team || []))];
      if (teamIds.length) {
        try {
          const users = await base44.entities.User.filter({ id: { $in: teamIds } });
          const list = Array.isArray(users) ? users : (users.items || []);
          setUserNames(Object.fromEntries(list.map(u => [u.id, u.full_name || u.email || 'Team member'])));
        } catch (e) {
          console.error('Could not load team names:', e);
        }
      }
    } catch (error) {
      console.error('Error loading sales:', error);
    } finally {
      setLoading(false);
    }
  };

  // date string (yyyy-MM-dd) -> sales happening that day
  const eventsByDate = useMemo(() => {
    const map = {};
    (sales || []).forEach(s => {
      (s.sale_dates || []).forEach(d => {
        if (!d || !d.date) return;
        if (!map[d.date]) map[d.date] = [];
        if (!map[d.date].some(x => x.id === s.id)) map[d.date].push(s);
      });
    });
    return map;
  }, [sales]);

  const saleById = useMemo(() => {
    const map = {};
    (sales || []).forEach(s => { map[s.id] = s; });
    return map;
  }, [sales]);

  // date string (yyyy-MM-dd) -> tasks due that day
  const tasksByDate = useMemo(() => {
    const map = {};
    (tasks || []).forEach(t => {
      if (!t.due_date) return;
      if (!map[t.due_date]) map[t.due_date] = [];
      map[t.due_date].push(t);
    });
    Object.values(map).forEach(list => list.sort((a, b) => {
      const aDone = a.status === 'completed' ? 1 : 0;
      const bDone = b.status === 'completed' ? 1 : 0;
      return aDone - bDone;
    }));
    return map;
  }, [tasks]);

  const days = useMemo(() => {
    if (view === 'month') {
      return eachDayOfInterval({ start: startOfWeek(startOfMonth(cursor)), end: endOfWeek(endOfMonth(cursor)) });
    }
    return eachDayOfInterval({ start: startOfWeek(cursor), end: endOfWeek(cursor) });
  }, [view, cursor]);

  const step = (dir) => setCursor(c => (view === 'month' ? addMonths(c, dir) : addWeeks(c, dir)));

  const eventsFor = (day) => eventsByDate[format(day, 'yyyy-MM-dd')] || [];
  const tasksFor = (day) => tasksByDate[format(day, 'yyyy-MM-dd')] || [];

  const assigneeOptionsFor = (task) => {
    const sale = saleById[task.sale_id];
    const options = [{ id: 'unassigned', label: 'Unassigned' }];
    if (me?.id) options.push({ id: me.id, label: `${me.full_name || me.email || 'You'} (You)` });
    (sale?.sale_team || []).forEach(id => {
      if (id === me?.id) return;
      options.push({ id, label: userNames[id] || 'Team member' });
    });
    return options;
  };

  const patchTask = async (taskId, patch) => {
    setTasks(prev => prev.map(t => (t.id === taskId ? { ...t, ...patch } : t)));
    try {
      await base44.entities.SaleTask.update(taskId, patch);
    } catch (error) {
      console.error('Could not save the task change:', error);
      load();
    }
  };

  const toggleTaskComplete = async (task) => {
    if (task.status === 'completed') {
      await patchTask(task.id, { status: 'not_started', completed_at: '', completed_by: '', completed_by_name: '' });
    } else {
      await patchTask(task.id, {
        status: 'completed',
        completed_at: new Date().toISOString(),
        completed_by: me?.id || '',
        completed_by_name: me?.full_name || '',
        blocked: false,
        blocked_reason: '',
      });
    }
  };

  const assignTask = async (task, userId) => {
    if (userId === 'unassigned') {
      await patchTask(task.id, { assignee_user_id: '', assignee_name: '' });
      return;
    }
    const option = assigneeOptionsFor(task).find(o => o.id === userId);
    await patchTask(task.id, { assignee_user_id: userId, assignee_name: option?.label || 'Team member' });
  };

  const SalePills = ({ day, compact }) => {
    const events = eventsFor(day);
    if (!events.length) return null;
    const shown = compact ? events.slice(0, 2) : events.slice(0, 4);
    const more = events.length - shown.length;
    return (
      <div className="space-y-1 mt-1">
        {shown.map(s => (
          <button
            key={s.id}
            onClick={() => navigate(`/SaleEditor?saleId=${s.id}`)}
            title={`${s.title} (${s.status}) — click to open this sale`}
            className={`w-full text-left text-[11px] leading-tight px-1.5 py-1 rounded border truncate ${STATUS_STYLES[s.status] || STATUS_STYLES.draft}`}
          >
            {s.title || 'Untitled sale'}
          </button>
        ))}
        {more > 0 && <p className="text-[10px] text-slate-500 px-1">+{more} more</p>}
      </div>
    );
  };

  const TaskPills = ({ day, compact }) => {
    const list = tasksFor(day);
    if (!list.length) return null;
    const shown = compact ? list.slice(0, 1) : list.slice(0, 3);
    const more = list.length - shown.length;
    return (
      <div className="space-y-1 mt-1">
        {shown.map(t => (
          <button
            key={t.id}
            onClick={e => { e.stopPropagation(); setSelectedDay(day); }}
            title={`Task: ${t.name} — ${t.assignee_name || 'unassigned'}`}
            className={`w-full text-left text-[10px] leading-tight px-1.5 py-1 rounded border truncate ${t.status === 'completed' ? 'bg-slate-100 text-slate-400 border-slate-200 line-through' : 'bg-violet-100 text-violet-800 border-violet-300'}`}
          >
            {t.name}
          </button>
        ))}
        {more > 0 && <p className="text-[10px] text-slate-500 px-1">+{more} tasks</p>}
      </div>
    );
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <BackToMySales />
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-serif font-bold text-slate-900">Sale Calendar</h1>
          <p className="text-sm md:text-base text-slate-600">
            See active and upcoming projects
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setCursor(new Date())} className="border-slate-300 text-slate-700 hover:bg-slate-50">
            Today
          </Button>
          <div className="flex rounded-md border border-slate-300 overflow-hidden">
            <button onClick={() => step(-1)} className="px-2.5 py-2 hover:bg-slate-50"><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={() => step(1)} className="px-2.5 py-2 hover:bg-slate-50 border-l border-slate-300"><ChevronRight className="w-4 h-4" /></button>
          </div>
          <div className="flex rounded-md border border-slate-300 overflow-hidden">
            <button
              onClick={() => setView('month')}
              className={`px-3 py-2 text-xs font-medium flex items-center gap-1.5 ${view === 'month' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <CalendarDays className="w-3.5 h-3.5" /> Month
            </button>
            <button
              onClick={() => setView('week')}
              className={`px-3 py-2 text-xs font-medium flex items-center gap-1.5 border-l border-slate-300 ${view === 'week' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <Columns3 className="w-3.5 h-3.5" /> Week
            </button>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-900">
              {view === 'month' ? format(cursor, 'MMMM yyyy') : `Week of ${format(startOfWeek(cursor), 'MMM d, yyyy')}`}
            </h2>
            <div className="flex gap-2 text-xs text-slate-500 flex-wrap">
              <Badge className="bg-green-100 text-green-800 border border-green-300">Active</Badge>
              <Badge className="bg-blue-100 text-blue-800 border border-blue-300">Upcoming</Badge>
              <Badge className="bg-amber-100 text-amber-800 border border-amber-300">Draft</Badge>
              <Badge className="bg-slate-100 text-slate-600 border border-slate-300">Completed</Badge>
              <Badge className="bg-violet-100 text-violet-800 border border-violet-300">Task due</Badge>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-16 text-slate-500 text-sm">Loading your sales…</div>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-1 mb-1">
                {WEEKDAYS.map(d => (
                  <div key={d} className="text-center text-xs font-semibold text-slate-500 py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {days.map(day => {
                  const inMonth = view === 'week' || isSameMonth(day, cursor);
                  const events = eventsFor(day);
                  return (
                    <div
                      key={day.toISOString()}
                      role="button"
                      tabIndex={0}
                      aria-pressed={!!selectedDay && isSameDay(selectedDay, day)}
                      onClick={() => setSelectedDay(day)}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedDay(day); } }}
                      className={`border rounded-md p-1.5 min-h-[92px] text-left cursor-pointer ${isToday(day) ? 'border-orange-400 bg-orange-50' : 'border-slate-200'} ${!inMonth ? 'opacity-40' : ''} ${!!selectedDay && isSameDay(selectedDay, day) ? 'ring-2 ring-orange-400' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-semibold ${isToday(day) ? 'text-orange-700' : 'text-slate-600'}`}>
                          {format(day, view === 'month' ? 'd' : 'MMM d')}
                        </span>
                        {events.length > 0 && (
                          <span className="text-[10px] text-slate-400">{events.length}</span>
                        )}
                      </div>
                      <SalePills day={day} compact={view === 'month'} />
                      <TaskPills day={day} compact={view === 'month'} />
                    </div>
                  );
                })}
              </div>
              {selectedDay && (
                <div className="mt-4 border-t border-slate-100 pt-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-800">{format(selectedDay, 'EEEE, MMMM d, yyyy')}</h3>
                    <button className="text-xs text-slate-500 hover:text-slate-800" onClick={() => setSelectedDay(null)}>Close</button>
                  </div>
                  {eventsFor(selectedDay).length === 0 && tasksFor(selectedDay).length === 0 ? (
                    <p className="text-sm text-slate-500 py-2">No sales or tasks scheduled for this day.</p>
                  ) : (
                    <div className="space-y-2 mt-2">
                      {eventsFor(selectedDay).map(s => (
                        <button
                          key={s.id}
                          onClick={() => navigate(`/SaleEditor?saleId=${s.id}`)}
                          className={`w-full text-left px-3 py-2.5 rounded-md border text-sm font-medium ${STATUS_STYLES[s.status] || STATUS_STYLES.draft}`}
                        >
                          {s.title || 'Untitled sale'} · <span className="capitalize">{s.status}</span>
                        </button>
                      ))}
                      {tasksFor(selectedDay).length > 0 && (
                        <div className="space-y-2">
                          {tasksFor(selectedDay).map(t => (
                            <CalendarTaskItem
                              key={t.id}
                              task={t}
                              saleTitle={saleById[t.sale_id]?.title || 'Sale'}
                              assigneeOptions={assigneeOptionsFor(t)}
                              onToggleComplete={() => toggleTaskComplete(t)}
                              onAssign={v => assignTask(t, v)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              {sales.length === 0 && (
                <p className="text-center text-sm text-slate-500 py-6">
                  No sales yet — scheduled sale dates will appear here automatically.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-slate-400">
        This calendar reads your sale dates and task due dates — it never creates or duplicates scheduling records. Tap a day to see its sales and tasks; assign or complete a task right there.
      </p>
    </div>
  );
}