import React from 'react';
import DealEconomicsPanel from '@/components/saleops/DealEconomicsPanel';

// Chapter 12 P1 — PROJECTED ECONOMICS (P1-26): the CANONICAL Chapter 4/9 economics
// view, embedded verbatim. Consultation Mode never recalculates — it calls the same
// single financial truth (saleEconomicsModel) and the same editable calculator the
// deal uses, so there can never be a competing calculation.
export default function EconomicsSection({ deal, onPersist, allDeals, linkedSale }) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500 bg-cyan-50 border border-cyan-200 rounded-lg p-3">
        This is the canonical Pre-Sale Economics Calculator — the SAME model the deal uses (no separate consultation calculation).
        Owner time is never counted as cash labor. Projected economics are not actual economics.
      </p>
      <DealEconomicsPanel key={deal.updated_date || deal.id} deal={deal} onPersist={onPersist} allDeals={allDeals} linkedSale={linkedSale} />
    </div>
  );
}