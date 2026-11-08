import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, HelpCircle, Package } from 'lucide-react';

const qualityClass = (quality) => (quality === 'strong'
  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
  : 'bg-amber-100 text-amber-800 border-amber-200');

/** One customer-facing match: what it is, why it matched, and what we could not confirm. */
export default function IsoCustomerMatchRow({ match, onFeedback }) {
  const unavailable = match.availability === 'unavailable';
  const hidden = match.status === 'dismissed' || match.feedback === 'hidden';
  const price = typeof match.item_price === 'number' ? `$${match.item_price}` : '';

  return (
    <li className={`py-3 ${hidden ? 'opacity-50' : ''}`}>
      <div className="flex gap-2">
        {match.image_url ? (
          <img src={match.image_url} alt={match.item_name || 'Matched item'} className="w-14 h-14 rounded-lg object-cover bg-slate-100 flex-shrink-0" />
        ) : (
          <div className="w-14 h-14 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
            <Package className="w-5 h-5 text-slate-400" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-semibold text-slate-900 break-words">{match.item_name || 'Item'}</span>
            {price && !unavailable && <span className="text-xs font-medium text-slate-700">{price}</span>}
            <Badge variant="outline" className={`text-[10px] ${qualityClass(match.match_quality)}`}>
              {match.match_quality === 'strong' ? 'Strong match' : 'Possible match'}
            </Badge>
            {unavailable && <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-600">No longer listed</Badge>}
          </div>

          {match.reason && <p className="text-[11px] text-slate-600 mt-0.5">{match.reason}</p>}

          <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-500">
            {match.item_condition && <span className="capitalize">{match.item_condition.replace(/_/g, ' ')}</span>}
            {(match.city || match.state) && (
              <span className="inline-flex items-center gap-0.5">
                <MapPin className="w-3 h-3" /> {[match.city, match.state].filter(Boolean).join(', ')}
              </span>
            )}
            {match.availability_note && unavailable && <span>{match.availability_note}</span>}
          </div>

          {(match.unknown_attributes || []).length > 0 && (
            <p className="mt-1 text-[11px] text-slate-500 inline-flex items-start gap-1">
              <HelpCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
              Not confirmed: {match.unknown_attributes.join(', ')}
            </p>
          )}

          {!hidden && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {onFeedback && (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onFeedback(match, 'relevant')}
                    className={`h-6 px-1.5 text-[11px] ${match.feedback === 'relevant' ? 'text-emerald-700' : 'text-slate-500'}`}
                  >
                    This is what I want
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onFeedback(match, 'not_meant')}
                    className={`h-6 px-1.5 text-[11px] ${match.feedback === 'not_meant' ? 'text-amber-700' : 'text-slate-500'}`}
                  >
                    Not this one
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onFeedback(match, 'hidden')}
                    className="h-6 px-1.5 text-[11px] text-slate-500 hover:text-red-600"
                  >
                    Never show this item
                  </Button>
                </>
              )}
            </div>
          )}
          {hidden && <span className="text-[10px] uppercase tracking-wide text-slate-400">Hidden</span>}
        </div>
      </div>
    </li>
  );
}