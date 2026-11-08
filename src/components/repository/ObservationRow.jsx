import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, RotateCw } from 'lucide-react';

const OUTCOME_META = {
  asking: { label: 'Asking only', className: 'text-slate-600' },
  operator_reported_sold: { label: 'Operator-reported sold', className: 'border-cyan-200 bg-cyan-50 text-cyan-800' },
  transaction_linked_sold: { label: 'Transaction-linked sold', className: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
  unknown: { label: 'Outcome unknown', className: 'text-slate-400' },
};

const CAPTURE_META = {
  captured: { label: 'captured', className: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
  incomplete: { label: 'incomplete', className: 'border-amber-200 bg-amber-50 text-amber-800' },
  withdrawn: { label: 'withdrawn', className: 'border-slate-200 text-slate-500' },
};

export default function ObservationRow({ observation, onRetry, retrying }) {
  const outcome = OUTCOME_META[observation.outcome] || OUTCOME_META.unknown;
  const capture = CAPTURE_META[observation.capture_status] || CAPTURE_META.captured;
  const initial = observation.initial_asking_price;
  const initialLabel = observation.initial_price_status === 'unavailable'
    ? 'initial unavailable'
    : `initial $${initial}`;

  return (
    <li className="p-3 flex gap-3">
      {observation.image_url ? (
        <img src={observation.thumbnail_url || observation.image_url} alt="" loading="lazy" className="w-12 h-12 rounded object-cover bg-slate-100 flex-shrink-0" />
      ) : (
        <div className="w-12 h-12 rounded bg-slate-100 flex-shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-medium text-slate-900 break-words">{observation.title || '(untitled)'}</span>
          <Badge variant="outline" className={`text-[10px] ${capture.className}`}>{capture.label}</Badge>
          <Badge variant="outline" className={`text-[10px] ${outcome.className}`}>{outcome.label}</Badge>
          {observation.representation === 'group' && <Badge variant="outline" className="text-[10px]">group photo</Badge>}
          {observation.representation === 'lot' && <Badge variant="outline" className="text-[10px]">lot</Badge>}
        </div>
        <div className="mt-0.5 text-[11px] text-slate-500 flex flex-wrap gap-x-3">
          {observation.brand && <span>Brand: {observation.brand}</span>}
          {observation.category && <span>{observation.category}</span>}
          <span>{[observation.city, observation.state].filter(Boolean).join(', ') || 'location unknown'}</span>
          <span>ID provenance: {String(observation.identification_provenance || 'unknown').replace(/_/g, ' ')}</span>
          <span>Price provenance: {String(observation.pricing_provenance || 'unknown').replace(/_/g, ' ')}</span>
        </div>
        <div className="mt-1 text-[11px] text-slate-700 flex flex-wrap gap-x-3">
          <span>{observation.current_asking_price != null ? `asking $${observation.current_asking_price}` : 'no asking price'}</span>
          <span className="text-slate-400">{initialLabel}</span>
          {observation.sold_price != null && <span className="font-medium">sold ${observation.sold_price}</span>}
          {observation.net_merchandise_amount != null && <span className="text-slate-500">net ${observation.net_merchandise_amount}</span>}
          {(observation.price_changes || []).length > 0 && <span className="text-slate-500">{observation.price_changes.length} price change(s)</span>}
          {(observation.refund_refs || []).length > 0 && <span className="text-red-600">{observation.refund_refs.length} refund(s)</span>}
        </div>
        {observation.bundle_note && <p className="mt-1 text-[10px] text-amber-700">{observation.bundle_note}</p>}
        {observation.capture_error && <p className="mt-1 text-[10px] text-red-600">{observation.capture_error}</p>}
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <a
          href={`/EstateSaleDetail?id=${observation.source_sale_id}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-[10px] text-cyan-700 hover:underline"
        >
          Sale <ExternalLink className="w-3 h-3" />
        </a>
        {onRetry && (
          <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px]" disabled={retrying} onClick={() => onRetry(observation.source_sale_id)}>
            <RotateCw className={`w-3 h-3 mr-1 ${retrying ? 'animate-spin' : ''}`} /> Retry sale
          </Button>
        )}
      </div>
    </li>
  );
}