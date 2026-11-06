import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, Info } from 'lucide-react';

// Same illustration math the referral flow uses: 2% referral fee, 15% payout.
const REFERRAL_FEE_RATE = 0.02;
const PAYOUT_SHARE_RATE = 0.15;
const EXAMPLES = [300000, 500000, 750000];

const money = (value) =>
  Number(value).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });

const payoutFor = (homeValue) =>
  Math.round(Math.round(homeValue * REFERRAL_FEE_RATE) * PAYOUT_SHARE_RATE);

export default function ReferralIncomePitch() {
  return (
    <Card className="border-cyan-200 bg-gradient-to-br from-cyan-50 via-white to-white">
      <CardContent className="p-4 sm:p-5">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-cyan-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white">
          <TrendingUp className="h-3 w-3" />
          If you were a licensed referral agent
        </p>

        <h2 className="mt-2 text-lg font-bold leading-snug text-slate-900 sm:text-xl">
          You would earn a referral fee every time a client you referred closes
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
          Refer a client with a property to sell, we introduce them to a local agent, and when that
          sale closes the referral income below is what applies to you.
        </p>

        <div className="mt-3 rounded-xl border border-cyan-200 bg-white p-2.5">
          <p className="text-center text-xs font-semibold text-slate-700">
            Home sale price × 2% referral fee × 15% payout share
          </p>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {EXAMPLES.map((value) => (
            <div key={value} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
              <p className="text-[11px] text-slate-500">{money(value)} home</p>
              <p className="mt-0.5 text-lg font-bold tabular-nums text-emerald-700">
                {money(payoutFor(value))}
              </p>
              <p className="text-[11px] text-slate-500">
                your payout · {money(Math.round(value * REFERRAL_FEE_RATE))} fee
              </p>
            </div>
          ))}
        </div>

        <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-500">
          <Info className="mt-0.5 h-3 w-3 flex-shrink-0" />
          Illustration only — not a quote, guarantee, or entitlement. Payouts depend on the executed
          referral agreement, an active license, a verified brokerage affiliation, and the sale
          closing. Referral compensation is currently disabled platform-wide.
        </p>
      </CardContent>
    </Card>
  );
}