// Chapter 18 P1-40 — POST-SALE MARKETING REVIEW. Assembles only what the
// system ACTUALLY knows: attendance, explicit discovery sources (unknown
// counted honestly), offers, marketing-related expenses and labor. No
// invented ROI — buyer/revenue attribution stays unknown where it is unknown.
import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, BarChart3 } from 'lucide-react';

const page = (p) => (p && p.items) || (Array.isArray(p) ? p : []);
const MARKETING_EXPENSE_CATS = ['marketing', 'advertising', 'social media', 'email campaign', 'sms campaign', 'signage', 'print', 'seo', 'flyers'];
const MARKETING_LABOR_CATS = ['staging', 'signage', 'photography'];
const SOURCE_LABELS = {
  estate_sale_listing_site: 'Estate sale listing site', email: 'Email alert', sms: 'Text message',
  facebook: 'Facebook', instagram: 'Instagram', other_social: 'Other social media', sign: 'Saw a sign',
  qr: 'QR code', referral: 'Referral', walk_by: 'Walked / drove by', other: 'Other', unknown: 'Unknown',
};

export default function PostSaleReviewCard({ saleId }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [signIns, offers, expenses, labor] = await Promise.all([
          base44.entities.EarlySignIn.filter({ sale_id: saleId }, { limit: 500 }),
          base44.entities.Offer.filter({ sale_id: saleId }, { limit: 500 }),
          base44.entities.Expense.filter({ sale_id: saleId }, { limit: 200 }).catch(() => []),
          base44.entities.LaborEntry.filter({ sale_id: saleId }, { limit: 500 }).catch(() => []),
        ]);
        const signInsList = page(signIns);
        const offersList = page(offers);
        const expensesList = page(expenses);
        const laborList = page(labor);

        const sources = {};
        for (const s of signInsList) {
          const v = s.discovery_source || 'unknown';
          sources[v] = (sources[v] || 0) + 1;
        }
        const marketingExpenses = expensesList.filter(e => MARKETING_EXPENSE_CATS.includes(String(e.category || '').toLowerCase()));
        const marketingLabor = laborList.filter(l => MARKETING_LABOR_CATS.includes(String(l.work_category || '')));

        if (alive) setData({
          signIns: signInsList.length,
          sources,
          offers: offersList.length,
          acceptedOffers: offersList.filter(o => o.status === 'accepted').length,
          marketingExpenseTotal: marketingExpenses.reduce((s, e) => s + (e.amount || 0), 0),
          marketingExpenseCount: marketingExpenses.length,
          totalExpenseCount: expensesList.length,
          marketingLaborHours: marketingLabor.reduce((s, l) => s + (l.hours || 0), 0),
        });
      } catch (e) { /* card stays empty on error */ }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [saleId]);

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5">
      <div className="font-semibold text-slate-900 mb-3 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-cyan-700" /> Post-sale marketing review</div>
      {loading ? <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div> : !data ? (
        <p className="text-sm text-slate-400">Could not assemble the review for this sale.</p>
      ) : (
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Early sign-ins" value={data.signIns} />
            <Stat label="Offers" value={data.offers} />
            <Stat label="Accepted offers" value={data.acceptedOffers} />
            <Stat label="Marketing labor (hrs)" value={data.marketingLaborHours} />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 mb-1">How attendees say they found this sale (explicit responses)</div>
            {Object.keys(data.sources).length === 0 ? <p className="text-slate-400">No sign-ins recorded.</p> : (
              <ul className="space-y-0.5">
                {Object.entries(data.sources).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                  <li key={k} className="flex justify-between text-slate-700">
                    <span>{SOURCE_LABELS[k] || k}{k === 'unknown' ? ' (honest unknown — never assumed)' : ''}</span>
                    <span className="font-medium">{v}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 mb-1">Marketing cost</div>
            <p className="text-slate-700">
              {data.marketingExpenseCount} marketing-classified expense{data.marketingExpenseCount === 1 ? '' : 's'} totaling ${data.marketingExpenseTotal.toFixed(2)}
              {data.totalExpenseCount > data.marketingExpenseCount ? ` (${data.totalExpenseCount - data.marketingExpenseCount} other expense(s) not classified as marketing)` : ''}.
            </p>
          </div>
          <p className="text-xs text-slate-500">
            Known vs unknown is stated honestly: revenue attribution by marketing channel is not claimed where the system cannot prove it.
          </p>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="border border-slate-100 rounded-md p-2.5">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-lg font-bold text-slate-900">{value}</div>
    </div>
  );
}