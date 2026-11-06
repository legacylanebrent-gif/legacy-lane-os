import React from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * The single wording for two facts that must travel with every referral number:
 *  1. The 2% used in the illustration is an APPROXIMATE real estate agent commission.
 *  2. All home values and referral earnings are approximate and change with real data.
 */
export default function ReferralEstimateDisclosure({ className, compact = false }) {
  return (
    <div className={cn('rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5', className)}>
      <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-600">
        <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
        <span>
          <span className="font-semibold text-slate-700">
            The 2% is an approximate real estate agent commission.
          </span>{' '}
          The actual commission is set in the client's listing agreement and is often different. All home
          values, commission amounts and referral earnings shown are approximate estimates based on public
          market data — they change once actual figures (the real sale price and the real commission
          charged) are known.
          {!compact && ' Nothing here is an appraisal, a quote, or a guarantee.'}
        </span>
      </p>
    </div>
  );
}