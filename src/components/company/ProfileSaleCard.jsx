import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { getImageSrc } from '@/utils/imageOptimizer';

function formatTimeDisplay(timeStr) {
  if (!timeStr) return null;
  if (/am|pm/i.test(timeStr)) return timeStr;
  const [h, m] = timeStr.split(':').map(Number);
  if (isNaN(h)) return null;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m || 0).padStart(2, '0')} ${ampm}`;
}

export default function ProfileSaleCard({ sale, badgeLabel, badgeClassName = 'bg-slate-600 text-white', muted = false }) {
  const cover = sale.images?.[0];

  return (
    <Link to={createPageUrl('EstateSaleDetail') + '?id=' + sale.id} className="block group">
      <Card className={`overflow-hidden hover:shadow-xl transition-shadow ${muted ? 'opacity-90' : ''}`}>
        {cover && (
          <div className="relative h-48 overflow-hidden">
            <img
              src={getImageSrc(cover, 400)}
              alt={sale.title}
              className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${muted ? 'grayscale-[30%]' : ''}`}
              loading="lazy"
              decoding="async"
            />
            {badgeLabel && (
              <Badge className={`absolute top-3 right-3 ${badgeClassName}`}>{badgeLabel}</Badge>
            )}
          </div>
        )}
        <CardContent className="p-5">
          <h4 className="text-lg font-semibold text-slate-900 mb-2 group-hover:text-orange-600 transition-colors">
            {sale.title}
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-slate-600">
              <MapPin className="w-4 h-4 text-cyan-600" />
              <span>{sale.property_address?.city}, {sale.property_address?.state}</span>
            </div>
            {sale.sale_dates && sale.sale_dates.length > 0 && (
              <div className="flex items-start gap-2 text-slate-600">
                <Calendar className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                <div>
                  {sale.sale_dates.map((sd, i) => (
                    <span key={i} className="block">
                      {sd.date ? format(new Date(sd.date), 'MMM d, yyyy') : ''}
                      {sd.start_time && formatTimeDisplay(sd.start_time) && (
                        <> — {formatTimeDisplay(sd.start_time)}{sd.end_time && formatTimeDisplay(sd.end_time) ? ` - ${formatTimeDisplay(sd.end_time)}` : ''}</>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}