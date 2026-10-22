import React from 'react';
import { Link } from 'react-router-dom';
import { LifeBuoy, Rocket } from 'lucide-react';

// Chapter 27 P1 — FIRST-SALE ROADMAP + busy-sale discipline + pipeline
// continuity. DEEP LINKS to canonical systems — nothing is rebuilt here.
// During the live first sale, Launch Mode gets SIMPLER, not more complicated.

const STAGES = [
  { key: 'ONBOARDING', label: 'Onboarding & preparation', hint: 'Project Dashboard — activation, tasks, timeline, prep zones', to: '/ProjectDashboard' },
  { key: 'INVENTORY', label: 'Inventory / research / pricing', hint: 'Sale Inventory & Pricing Tool (Chapters 14–16)', to: '/SaleInventory' },
  { key: 'MARKETING', label: 'Staging & marketing', hint: 'Marketing Kit and staging (Chapters 17–18)', to: '/MarketingKit' },
  { key: 'STAFFING', label: 'Staffing & readiness', hint: 'Staffing, equipment and opening readiness (Ch 8/19)', to: '/SaleEquipment' },
  { key: 'SALE_DAY', label: 'Sale day', hint: 'Live Sale Command Center (Ch 20)', to: '/LiveSale' },
  { key: 'CHECKOUT', label: 'Checkout & payment', hint: 'Checkout Station — money truth (Ch 21)', to: '/CheckoutStation' },
  { key: 'PICKUP', label: 'Pickup', hint: 'Releases and pickups (Ch 21/22)', to: '/MySaleDay' },
  { key: 'DISPOSITION', label: 'Disposition', hint: 'Transition completion (Ch 22)', to: '/TransitionCompletion' },
  { key: 'RECONCILIATION', label: 'Reconciliation & settlement', hint: 'Closeout and settlement (Ch 23)', to: '/SaleCloseout' },
  { key: 'COMPLETION', label: 'Project completion', hint: 'Transition completion gates', to: '/TransitionCompletion' },
  { key: 'REVIEW', label: 'Post-sale review', hint: 'First-sale review on the Sale Recap (Ch 23/25)', to: '/sale-recap' },
];

export default function FirstProjectCard({ firstSale, phase, deals }) {
  const future = (deals || []).filter(d => !['lost', 'referred', 'completed'].includes(d.stage)).slice(0, 4);
  return (
    <div className="space-y-3">
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Rocket className="w-4 h-4 text-cyan-600" />
          <p className="text-sm font-semibold text-slate-800">First-Sale Roadmap{firstSale ? ` — ${firstSale.title}` : ''}</p>
        </div>
        <p className="text-[11px] text-slate-500">
          Your position in the full project lifecycle. Each stage is the REAL system — Launch Mode links to it and never duplicates it.
        </p>
        <ol className="space-y-1.5">
          {STAGES.map((s, i) => (
            <li key={s.key} className={`flex items-start justify-between gap-2 border rounded-lg p-2 ${phase === 'FIRST_PROJECT' && i === 0 ? 'border-cyan-300 bg-cyan-50/50' : 'border-slate-100'}`}>
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-800">{i + 1}. {s.label}</p>
                <p className="text-[10px] text-slate-500">{s.hint}</p>
              </div>
              <Link to={s.to} className="text-[11px] font-semibold text-cyan-700 hover:text-cyan-900 shrink-0">Open →</Link>
            </li>
          ))}
        </ol>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
        <p className="text-sm font-semibold text-slate-800">While the sale is busy — don't abandon the system</p>
        <p className="text-[11px] text-slate-500">The unexpected does not mean unmanageable. Existing discipline surfaces:</p>
        <div className="flex flex-wrap gap-2">
          {[['/LiveSale', 'Live Sale Command Center'], ['/MySaleDay', 'My Sale Day'], ['/SaleTasks', 'Tasks & overdue work'], ['/ProjectDashboard', 'Open issues / Ask for Help']].map(([to, label]) => (
            <Link key={to} to={to} className="text-[11px] font-semibold text-cyan-700 hover:text-cyan-900 bg-cyan-50 border border-cyan-100 rounded-lg px-2.5 py-1.5">{label}</Link>
          ))}
        </div>
        <Link to={`/ManualFallbackKit${firstSale ? `?saleId=${firstSale.id}` : ''}`} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5">
          <LifeBuoy className="w-3 h-3" /> Printable Manual Fallback Kit (tech failure continuity)
        </Link>
      </div>

      {future.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
          <p className="text-sm font-semibold text-slate-800">Future pipeline (keep it alive while you run the sale)</p>
          {future.map(d => (
            <div key={d.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border border-slate-100 rounded-lg p-2">
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-800">{d.client_name}</p>
                <p className="text-[10px] text-slate-500">{d.stage?.replace(/_/g, ' ')}{d.next_action ? ` · next: ${d.next_action}` : ' · NEEDS NEXT ACTION'}</p>
              </div>
              <Link to="/SaleConversionPipeline" className="text-[11px] font-semibold text-cyan-700 shrink-0">Pipeline →</Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}