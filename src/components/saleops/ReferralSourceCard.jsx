import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Handshake } from 'lucide-react';

const TYPE_LABELS = {
  real_estate_agent: 'Real estate agent',
  attorney: 'Attorney',
  senior_move_manager: 'Senior move manager',
  professional_organizer: 'Professional organizer',
  estate_sale_company: 'Estate sale company',
  past_client: 'Past client',
  buyer_customer: 'Buyer / customer',
  friend_family: 'Friend / family',
  online_search: 'Online search',
  social_media: 'Social media',
  website: 'Website',
  other: 'Other',
};

// Chapter 2 P1 — read-only projection of the structured referral source captured on the
// pipeline deal (copied onto the sale when the deal is linked). Source attribution only.
export default function ReferralSourceCard({ saleId }) {
  const [sale, setSale] = useState(null);

  useEffect(() => {
    if (!saleId) return;
    base44.entities.EstateSale.filter({ id: saleId })
      .then(data => setSale(data[0] || null))
      .catch(() => {});
  }, [saleId]);

  if (!sale?.referral_source_type) return null;

  return (
    <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4 flex items-center gap-3">
      <Handshake className="w-5 h-5 text-orange-600 flex-shrink-0" />
      <div>
        <p className="text-sm font-semibold text-slate-900">
          {sale.referral_source_name
            ? `Referred by ${sale.referral_source_name}`
            : `Referral source: ${TYPE_LABELS[sale.referral_source_type] || sale.referral_source_type}`}
        </p>
        <p className="text-xs text-slate-500">
          {TYPE_LABELS[sale.referral_source_type] || sale.referral_source_type} · captured on the seller opportunity and carried to this sale
        </p>
      </div>
    </div>
  );
}