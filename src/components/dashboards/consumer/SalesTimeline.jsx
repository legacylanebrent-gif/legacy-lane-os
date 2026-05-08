import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, Building2, ChevronRight } from 'lucide-react';
import { format, parseISO, isToday, isTomorrow, differenceInDays } from 'date-fns';
import { isSaleAddressVisible } from '@/utils/saleAddressUtils';

const formatTime = (t) => {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hour = parseInt(h);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
};

const getDayLabel = (dateStr) => {
  const d = parseISO(dateStr);
  if (isToday(d)) return { label: 'Today', color: 'bg-green-100 text-green-700' };
  if (isTomorrow(d)) return { label: 'Tomorrow', color: 'bg-orange-100 text-orange-700' };
  const diff = differenceInDays(d, new Date());
  if (diff <= 7) return { label: `In ${diff} days`, color: 'bg-cyan-100 text-cyan-700' };
  return { label: format(d, 'MMM d'), color: 'bg-slate-100 text-slate-600' };
};

export default function SalesTimeline({ sales, followedOperatorIds }) {
  // Collect all upcoming date entries, flattened and sorted
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const entries = [];
  sales.forEach(sale => {
    const isFollowed = followedOperatorIds.includes(sale.operator_id);
    (sale.sale_dates || []).forEach(d => {
      const saleDate = new Date(d.date + 'T00:00:00');
      if (saleDate >= today) {
        entries.push({ sale, date: d.date, start_time: d.start_time, end_time: d.end_time, isFollowed });
      }
    });
  });

  entries.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return (a.start_time || '') < (b.start_time || '') ? -1 : 1;
  });

  // Group by date
  const grouped = {};
  entries.forEach(e => {
    if (!grouped[e.date]) grouped[e.date] = [];
    grouped[e.date].push(e);
  });

  const dateKeys = Object.keys(grouped).slice(0, 14); // Show up to 2 weeks

  if (dateKeys.length === 0) {
    return (
      <div className="text-center py-10 text-slate-400">
        <Calendar className="w-12 h-12 mx-auto mb-3 opacity-40" />
        <p className="font-medium text-slate-500">No upcoming sales from followed companies</p>
        <p className="text-sm mt-1">Follow companies to see their sales here</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {dateKeys.map(dateKey => {
        const { label, color } = getDayLabel(dateKey);
        const dayEntries = grouped[dateKey];
        return (
          <div key={dateKey}>
            {/* Date header */}
            <div className="flex items-center gap-3 mb-3">
              <Badge className={`${color} border-0 text-xs font-semibold px-2.5 py-1`}>{label}</Badge>
              <span className="text-sm text-slate-500 font-medium">{format(parseISO(dateKey), 'EEEE, MMMM d')}</span>
              <div className="flex-1 h-px bg-slate-100" />
            </div>

            <div className="space-y-2.5">
              {dayEntries.map(({ sale, start_time, end_time, isFollowed }) => (
                <Link key={`${sale.id}-${dateKey}`} to={createPageUrl('EstateSaleDetail') + '?id=' + sale.id}>
                  <Card className={`hover:shadow-md transition-all border ${isFollowed ? 'border-l-4 border-l-orange-400 border-slate-200' : 'border-slate-200'}`}>
                    <CardContent className="p-3 flex items-center gap-3">
                      {/* Thumbnail */}
                      {sale.images?.[0] ? (
                        <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-slate-100">
                          <img
                            src={sale.images[0]?.url || sale.images[0]}
                            alt={sale.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-14 h-14 rounded-lg flex-shrink-0 bg-slate-100 flex items-center justify-center">
                          <Building2 className="w-6 h-6 text-slate-300" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 flex-wrap">
                          <h4 className="font-semibold text-slate-900 text-sm leading-tight truncate">{sale.title}</h4>
                          {isFollowed && (
                            <Badge className="bg-orange-100 text-orange-600 border-0 text-[10px] px-1.5 py-0.5 flex-shrink-0">Following</Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {(start_time || end_time) && (
                            <span className="flex items-center gap-1 text-xs text-orange-600 font-medium">
                              <Clock className="w-3 h-3" />
                              {formatTime(start_time)}{end_time ? ` – ${formatTime(end_time)}` : ''}
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <MapPin className="w-3 h-3" />
                            {isSaleAddressVisible(sale)
                              ? `${sale.property_address?.city}, ${sale.property_address?.state}`
                              : `${sale.property_address?.city}, ${sale.property_address?.state} (address hidden)`}
                          </span>
                        </div>

                        {sale.operator_name && (
                          <p className="text-[11px] text-slate-400 mt-0.5 truncate">by {sale.operator_name}</p>
                        )}
                      </div>

                      <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}