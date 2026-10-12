// Phase 4E (Parts 39/40) — website traffic & engagement analytics panel.
// Reads ONLY through the certified websiteAnalytics seam (tenant-scoped,
// server-derived attribution). Client mode shows the same numbers without the
// technical referrer breakdown — no PII ever leaves the system.
import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Eye, MousePointerClick, Phone, Mail, Users, ShoppingBag } from 'lucide-react';

const RANGES = [{ days: 7, label: '7 days' }, { days: 30, label: '30 days' }, { days: 90, label: '90 days' }];

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <div className="flex items-center gap-2 text-xs text-slate-500"><Icon className="w-3.5 h-3.5" />{label}</div>
      <div className="mt-1.5 text-2xl font-heading font-bold text-slate-900">{value}</div>
    </div>
  );
}

export default function AnalyticsPanel({ websiteTenantId, clientMode }) {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('websiteAnalytics', { website_tenant_id: websiteTenantId, days });
      setData(res.data);
      setError(null);
    } catch (e) {
      setError('Could not load analytics.');
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, [websiteTenantId, days]); // eslint-disable-line

  if (loading && !data) return <div className="p-10 flex justify-center"><Loader2 className="w-7 h-7 animate-spin text-slate-400" /></div>;
  if (error) return <div className="bg-white rounded-lg border border-slate-200 p-8 text-center text-sm text-slate-600">{error}</div>;
  const s = (data && data.summary) || {};

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="font-heading font-bold text-slate-900 flex items-center gap-2"><Eye className="w-4 h-4" /> Website Traffic</div>
          <div className="text-sm text-slate-500 mt-0.5">Visitor activity on your live website.</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-slate-200 overflow-hidden">
            {RANGES.map(r => (
              <button key={r.days} onClick={() => setDays(r.days)}
                className={`px-3 py-1.5 text-xs font-medium ${days === r.days ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                {r.label}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Visitors" value={s.visitors ?? 0} />
        <StatCard icon={Eye} label="Page Views" value={s.page_views ?? 0} />
        <StatCard icon={MousePointerClick} label="Seller Leads" value={s.seller_leads ?? 0} />
        <StatCard icon={ShoppingBag} label="Buyer Sign-ups" value={s.buyer_signups ?? 0} />
        <StatCard icon={Phone} label="Phone Taps" value={s.phone_clicks ?? 0} />
        <StatCard icon={Mail} label="Email Clicks" value={s.email_clicks ?? 0} />
        <StatCard icon={Eye} label="Sale Views" value={s.sale_views ?? 0} />
        <StatCard icon={Users} label="Visitor→Lead Rate" value={s.visitor_to_seller_lead_rate == null ? '—' : `${s.visitor_to_seller_lead_rate}%`} />
      </div>

      {!clientMode && (
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <div className="font-medium text-slate-800 text-sm">Where visitors come from</div>
          {(data.traffic_sources || []).length === 0 ? (
            <p className="text-sm text-slate-500 mt-2">No referring traffic recorded yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {data.traffic_sources.map((r, i) => (
                <li key={i} className="py-2 flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-700 truncate">{r.referrer || 'Direct'}</span>
                  <span className="text-slate-900 font-medium">{r.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="bg-white rounded-lg border border-slate-200 p-5">
        <div className="font-medium text-slate-800 text-sm">Most viewed sales</div>
        {(data.top_sales || []).length === 0 ? (
          <p className="text-sm text-slate-500 mt-2">No sale views recorded yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {data.top_sales.map((r, i) => (
              <li key={i} className="py-2 flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-700 truncate">{r.title || r.sale_public_id}</span>
                <span className="text-slate-900 font-medium">{r.count}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}