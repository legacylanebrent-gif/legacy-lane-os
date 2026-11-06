import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { ArrowRight, Loader2, Sparkles, TrendingUp } from "lucide-react";

const money = (value) =>
  Number(value).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export default function ReferralEarnings({ lead, onEstimated }) {
  const [busy, setBusy] = useState(false);
  const payout = Number(lead.referral_fee_estimate) || 0;
  const value = Number(lead.estimated_home_value) || 0;

  const estimate = async () => {
    setBusy(true);
    try {
      await base44.functions.invoke("estimateReferralHomeValue", { lead_id: lead.lead_id });
      onEstimated?.();
    } finally {
      setBusy(false);
    }
  };

  if (payout > 0) {
    return (
      <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
        <p className="flex items-start gap-1.5 text-sm font-semibold text-emerald-900">
          <TrendingUp className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
          You could earn {money(payout)} from this referral
        </p>
        <p className="mt-1 text-xs text-emerald-800">
          Based on an estimated {money(value)} home value · 2% referral fee × 15% payout
        </p>
        <Link
          to="/ReferralEligibility"
          className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-emerald-900 underline hover:text-emerald-950"
        >
          Click here to find out how <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    );
  }

  if (lead.home_value_status === "pending") {
    return (
      <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Working out this property's value…
      </p>
    );
  }

  return (
    <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
      <p className="flex items-start gap-1.5 text-xs text-slate-600">
        <Sparkles className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-cyan-600" />
        {lead.home_value_basis || "No home value on this referral yet."}
      </p>
      <button
        type="button"
        onClick={estimate}
        disabled={busy}
        className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-cyan-700 underline hover:text-cyan-800 disabled:opacity-60"
      >
        {busy ? <><Loader2 className="h-3 w-3 animate-spin" /> Estimating…</> : "Get the home value and what you could earn"}
      </button>
    </div>
  );
}