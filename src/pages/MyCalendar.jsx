import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, MapPin, Trash2, ChevronLeft, ChevronRight, Clock, ArrowRight, Home } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths } from 'date-fns';

export default function MyCalendar() {
  const [user, setUser] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userData = await base44.auth.me();
      if (!userData) {
        base44.auth.redirectToLogin(window.location.href);
        return;
      }
      setUser(userData);
      const calendarEntries = await base44.entities.UserCalendarEntry.filter(
        { user_id: userData.id },
        '-added_date',
        200
      );
      setEntries(calendarEntries);
    } catch (e) {
      console.error('Error loading calendar:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (entryId) => {
    await base44.entities.UserCalendarEntry.delete(entryId);
    setEntries(prev => prev.filter(e => e.id !== entryId));
  };

  // Build calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Map sale dates to entries for quick lookup
  const dateEntryMap = useMemo(() => {
    const map = {};
    entries.forEach(entry => {
      (entry.sale_dates || []).forEach(sd => {
        if (!sd.date) return;
        const key = sd.date;
        if (!map[key]) map[key] = [];
        map[key].push(entry);
      });
    });
    return map;
  }, [entries]);

  const hasSalesOnDay = (day) => {
    const key = format(day, 'yyyy-MM-dd');
    return dateEntryMap[key] && dateEntryMap[key].length > 0;
  };

  const saleCountOnDay = (day) => {
    const key = format(day, 'yyyy-MM-dd');
    return dateEntryMap[key]?.length || 0;
  };

  const selectedDateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null;
  const selectedDateEntries = selectedDateStr ? (dateEntryMap[selectedDateStr] || []) : [];

  // Upcoming entries (from today forward)
  const today = format(new Date(), 'yyyy-MM-dd');
  const upcomingEntries = entries.filter(entry =>
    (entry.sale_dates || []).some(sd => sd.date >= today)
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-orange-50 to-cyan-50 flex items-center justify-center">
        <div className="animate-pulse text-slate-600 text-lg font-serif">Loading your calendar...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-orange-50 to-cyan-50">
      <div className="max-w-lg mx-auto px-4 py-4 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-serif font-bold text-slate-800">My Calendar</h1>
            <p className="text-xs text-slate-500 mt-0.5">Plan your estate sale visits</p>
          </div>
          <Link to="/">
            <Button variant="ghost" size="sm" className="text-slate-600">
              <Home className="w-4 h-4 mr-1" /> Home
            </Button>
          </Link>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-3 bg-white rounded-xl p-2 shadow-sm">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-base font-semibold text-slate-700">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Calendar Grid */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-4">
          {/* Day headers */}
          <div className="grid grid-cols-7 text-center py-2 bg-slate-50 border-b">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
              <div key={d} className="text-xs font-medium text-slate-500">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, idx) => {
              const inMonth = isSameMonth(day, currentMonth);
              const today_ = isToday(day);
              const selected = selectedDate && isSameDay(day, selectedDate);
              const count = saleCountOnDay(day);

              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDate(day)}
                  className={`
                    relative aspect-square flex flex-col items-center justify-center text-sm
                    transition-colors border-b border-r
                    ${!inMonth ? 'text-slate-300 bg-slate-50/50' : 'hover:bg-orange-50'}
                    ${today_ ? 'bg-orange-50/70 font-bold text-orange-600' : ''}
                    ${selected ? 'bg-orange-100 ring-2 ring-orange-400 ring-inset' : ''}
                    ${idx % 7 === 6 ? 'border-r-0' : ''}
                  `}
                >
                  <span className={`${today_ ? 'font-bold' : ''}`}>
                    {format(day, 'd')}
                  </span>
                  {count > 0 && (
                    <div className="flex gap-0.5 mt-0.5">
                      {count <= 3 ? (
                        Array.from({ length: count }).map((_, i) => (
                          <div key={i} className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                        ))
                      ) : (
                        <span className="text-[10px] font-bold text-orange-600">{count}</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day View */}
        {selectedDate && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-orange-500" />
              {format(selectedDate, 'EEEE, MMMM d')}
            </h3>
            {selectedDateEntries.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6 bg-white rounded-xl">
                No sales on this day
              </p>
            ) : (
              <div className="space-y-2">
                {selectedDateEntries.map(entry => {
                  const dateInfo = (entry.sale_dates || []).find(sd => sd.date === selectedDateStr);
                  return (
                    <Card key={entry.id} className="overflow-hidden">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <Link to={`/EstateSaleDetail?saleId=${entry.sale_id}`} className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm text-slate-800 truncate">{entry.sale_title}</h4>
                            {entry.sale_operator_name && (
                              <p className="text-xs text-orange-600 mt-0.5">{entry.sale_operator_name}</p>
                            )}
                            {entry.sale_address && (
                              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                                <MapPin className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">{entry.sale_address}</span>
                              </p>
                            )}
                            {dateInfo?.start_time && (
                              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {dateInfo.start_time}{dateInfo.end_time ? ` - ${dateInfo.end_time}` : ''}
                              </p>
                            )}
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-red-500 flex-shrink-0"
                            onClick={() => handleRemove(entry.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Upcoming Sales List */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-orange-500" />
            Upcoming Sales
          </h3>
          {upcomingEntries.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-xl">
              <CalendarIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No upcoming sales in your calendar</p>
              <p className="text-xs text-slate-400 mt-1">Browse estate sales and tap "Add to Calendar"</p>
              <Link to="/">
                <Button variant="outline" size="sm" className="mt-3">
                  Browse Sales <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {upcomingEntries.map(entry => {
                const nextDate = (entry.sale_dates || []).find(sd => sd.date >= today);
                return (
                  <Card key={entry.id} className="overflow-hidden">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <Link to={`/EstateSaleDetail?saleId=${entry.sale_id}`} className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-sm text-slate-800 truncate">{entry.sale_title}</h4>
                            {nextDate && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-orange-50 text-orange-600 border-orange-200 flex-shrink-0">
                                {format(new Date(nextDate.date + 'T00:00:00'), 'MMM d')}
                              </Badge>
                            )}
                          </div>
                          {entry.sale_operator_name && (
                            <p className="text-xs text-orange-600 mt-0.5">{entry.sale_operator_name}</p>
                          )}
                          {entry.sale_address && (
                            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{entry.sale_address}</span>
                            </p>
                          )}
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-400 hover:text-red-500 flex-shrink-0"
                          onClick={() => handleRemove(entry.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}