import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, CalendarDays, Columns3 } from 'lucide-react';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, addWeeks, eachDayOfInterval, format, isSameMonth, isToday } from 'date-fns';

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
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('month');
  const [cursor, setCursor] = useState(new Date());

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const me = await base44.auth.me();
      const mySales = await base44.entities.EstateSale.filter({ operator_id: me.id });
      setSales(mySales || []);
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

  const days = useMemo(() => {
    if (view === 'month') {
      return eachDayOfInterval({ start: startOfWeek(startOfMonth(cursor)), end: endOfWeek(endOfMonth(cursor)) });
    }
    return eachDayOfInterval({ start: startOfWeek(cursor), end: endOfWeek(cursor) });
  }, [view, cursor]);

  const step = (dir) => setCursor(c => (view === 'month' ? addMonths(c, dir) : addWeeks(c, dir)));

  const activeCount = sales.filter(s => s.status === 'active').length;
  const upcomingCount = sales.filter(s => s.status === 'upcoming').length;

  const eventsFor = (day) => eventsByDate[format(day, 'yyyy-MM-dd')] || [];

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

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-serif font-bold text-slate-900">Sale Calendar</h1>
          <p className="text-sm md:text-base text-slate-600">
            See active and upcoming projects together before accepting more work than you can properly handle.
            {activeCount > 0 || upcomingCount > 0 ? (
              <span className="ml-1 font-medium text-slate-700">{activeCount} active · {upcomingCount} upcoming</span>
            ) : null}
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
                      className={`border rounded-md p-1.5 min-h-[92px] ${isToday(day) ? 'border-orange-400 bg-orange-50' : 'border-slate-200'} ${!inMonth ? 'opacity-40' : ''}`}
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
                    </div>
                  );
                })}
              </div>
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
        This calendar reads your sale dates — it never creates or duplicates scheduling records. Click any sale to open it.
      </p>
    </div>
  );
}