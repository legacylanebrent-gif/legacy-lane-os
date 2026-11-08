import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, ArrowRight, X } from 'lucide-react';

const confidenceClass = (confidence) => {
  if (confidence >= 90) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  if (confidence >= 75) return 'bg-cyan-100 text-cyan-800 border-cyan-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
};

/** One possible ISO match inside the sale's match list. */
export default function IsoMatchRow({ match, onDismiss, dismissing }) {
  const dismissed = match.status === 'dismissed';
  return (
    <li className={`p-3 ${dismissed ? 'opacity-50' : ''}`}>
      <div className="flex items-start gap-2">
        <Package className="w-4 h-4 mt-0.5 text-slate-400 flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-semibold text-slate-900 break-words">{match.item_name}</span>
            {typeof match.item_price === 'number' && (
              <span className="text-xs text-slate-500">${match.item_price}</span>
            )}
            <Badge variant="outline" className={`text-[10px] ${confidenceClass(match.confidence)}`}>
              {match.confidence}% match
            </Badge>
          </div>
          <div className="mt-1 flex items-start gap-1 text-[12px] text-slate-700">
            <ArrowRight className="w-3 h-3 mt-0.5 text-cyan-600 flex-shrink-0" />
            <span className="min-w-0">
              <span className="font-medium">{match.iso_title}</span>
              {match.buyer_name ? <span className="text-slate-500"> — {match.buyer_name}</span> : null}
              {match.iso_detail ? <span className="block text-[11px] text-slate-500">{match.iso_detail}</span> : null}
            </span>
          </div>
          {match.reason && <p className="mt-1 text-[11px] text-slate-600">{match.reason}</p>}
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {match.dealer_contact_allowed ? (
              <Badge variant="outline" className="text-[10px] border-emerald-200 bg-emerald-50 text-emerald-800">
                Open to dealer contact
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] text-slate-500">
                Not open to dealer contact
              </Badge>
            )}
            {!dismissed && onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                disabled={dismissing}
                onClick={() => onDismiss(match)}
                className="h-6 px-1.5 text-[11px] text-slate-500 hover:text-red-600"
              >
                <X className="w-3 h-3 mr-1" /> Not a match
              </Button>
            )}
            {dismissed && <span className="text-[10px] uppercase tracking-wide text-slate-400">Dismissed</span>}
          </div>
        </div>
      </div>
    </li>
  );
}