import React from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

// Chapter 12 P1 — PROPERTY (P1-9): assemble the canonical EstateSale
// site_assessment (the ONE property-facts block; no second property profile).
// PROPERTY FACTS (site_assessment) vs CONSULTATION OBSERVATIONS (rooms) stay distinct.
const FIELDS = [
  { key: 'property_type', label: 'Property type' },
  { key: 'approx_size', label: 'Approx. size' },
  { key: 'stairs_levels', label: 'Stairs / levels', human: v => String(v).replace(/_/g, ' ') },
  { key: 'elevator', label: 'Elevator' },
  { key: 'parking', label: 'Parking' },
  { key: 'gated_access', label: 'Gated access', human: v => String(v).replace(/_/g, ' ') },
  { key: 'community_restrictions', label: 'HOA / community restrictions' },
  { key: 'loading_access', label: 'Loading / removal access' },
  { key: 'merchandise_volume', label: 'Merchandise volume' },
  { key: 'storage_areas', label: 'Storage areas (garage / attic / basement / outbuildings)' },
  { key: 'pickup_constraints', label: 'Pickup constraints' },
  { key: 'sale_day_restrictions', label: 'Sale-day restrictions / checkout & customer flow' },
];

export default function PropertySection({ deal, linkedSale }) {
  const site = linkedSale?.site_assessment || {};
  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2">
        <p className="text-sm font-semibold text-slate-800">Property facts (canonical site assessment)</p>
        <p className="text-[10px] text-slate-400">This is the single editable copy on the linked sale — an operational assessment, NOT a home inspection. Unknown is honest; the system never guesses site conditions.</p>
        {FIELDS.map(({ key, label, human }) => {
          const v = site[key];
          const known = v && v !== 'unknown';
          return (
            <div key={key} className="flex items-start justify-between gap-3 py-1.5 border-b border-slate-100 last:border-0">
              <span className="text-xs text-slate-500">{label}</span>
              {known ? (
                <span className="text-xs text-slate-800 font-medium text-right">{human ? human(v) : String(v)}</span>
              ) : (
                <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 text-[10px]">UNKNOWN</Badge>
              )}
            </div>
          );
        })}
        {linkedSale ? (
          <Link to={`/SaleEditor?saleId=${linkedSale.id}`} className="text-xs text-cyan-600 hover:underline">
            Edit the site assessment on the sale →
          </Link>
        ) : (
          <p className="text-xs text-slate-500">
            No linked Estate Sale yet. Deal-level property info: {[deal.property_address, deal.property_city, deal.property_state].filter(Boolean).join(', ') || 'none recorded'}.
            Link or create the sale to complete the full site assessment.
          </p>
        )}
      </div>
      <p className="text-xs text-slate-500 bg-cyan-50 border border-cyan-200 rounded-lg p-3">
        Property FACTS live here on the site assessment; your walkthrough OBSERVATIONS live in the Room-by-Room section. Neither is ever
        converted into the other automatically.
      </p>
    </div>
  );
}