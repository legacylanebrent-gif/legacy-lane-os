import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, Users, FileText, Home, ArrowRight } from 'lucide-react';

const LEVEL_COLORS = { low:'bg-slate-100 text-slate-600', medium:'bg-blue-100 text-blue-700', high:'bg-orange-100 text-orange-700', urgent:'bg-red-100 text-red-700' };

function StatCard({ label, value, sub, icon: Icon, color }) {
  return (
    <Card><CardContent className="p-4 flex items-center gap-3">
      <Icon className={`w-8 h-8 ${color}`} />
      <div><p className="text-2xl font-bold text-slate-900">{value}</p><p className="text-xs text-slate-500">{label}{sub && ` · ${sub}`}</p></div>
    </CardContent></Card>
  );
}

export default function SEAdminRevenue({ leads, seoLogs }) {
  // Attribution pipeline stats
  const totalLeads = leads.length;
  const urgentLeads = leads.filter(l=>l.lead_level==='urgent').length;
  const highLeads = leads.filter(l=>l.lead_level==='high').length;
  const routedLeads = leads.filter(l=>l.crm_status==='routed'||l.crm_status==='in_progress').length;
  const closedWon = leads.filter(l=>l.crm_status==='closed_won').length;
  const hasRealEstate = leads.filter(l=>l.has_real_estate).length;
  const wantsRealtor = leads.filter(l=>l.needs_realtor).length;
  const wantsCash = leads.filter(l=>l.wants_cash_offer).length;
  const needsEstateSale = leads.filter(l=>l.needs_estate_sale).length;

  const indexedPages = seoLogs.filter(l=>l.indexing_status==='indexed').length;
  const totalPages = seoLogs.length;

  // Estimated revenue (illustrative)
  const estOperatorReferrals = needsEstateSale * 0.15 * 2500; // 15% close rate × $2500 avg
  const estRealtorReferrals = (wantsRealtor + wantsCash) * 0.10 * 8000; // 10% close × $8000 avg referral fee

  // Top source pages
  const sourcePages = leads.reduce((acc, l) => {
    const src = l.source_url || 'unknown';
    acc[src] = (acc[src]||0)+1;
    return acc;
  }, {});
  const topSources = Object.entries(sourcePages).sort((a,b)=>b[1]-a[1]).slice(0,10);

  return (
    <div className="space-y-6">
      {/* Pipeline Stats */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">SEO → Lead → Revenue Pipeline</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <StatCard label="Indexed Pages" value={indexedPages} sub={`of ${totalPages} tracked`} icon={FileText} color="text-blue-600" />
          <StatCard label="Total Leads" value={totalLeads} icon={Users} color="text-slate-600" />
          <StatCard label="Urgent / High Leads" value={urgentLeads+highLeads} icon={TrendingUp} color="text-orange-600" />
          <StatCard label="Routed to Providers" value={routedLeads} icon={ArrowRight} color="text-purple-600" />
          <StatCard label="Closed Won" value={closedWon} icon={DollarSign} color="text-green-600" />
          <StatCard label="Has Real Estate" value={hasRealEstate} icon={Home} color="text-amber-600" />
          <StatCard label="Needs Estate Sale" value={needsEstateSale} icon={DollarSign} color="text-amber-700" />
          <StatCard label="Needs Realtor / Cash Offer" value={wantsRealtor+wantsCash} icon={Home} color="text-green-700" />
        </div>
      </div>

      {/* Estimated Revenue Attribution */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Estimated Revenue Attribution (Illustrative)</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Estate Sale Operator Referrals</CardTitle></CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-amber-600">${estOperatorReferrals.toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-1">{needsEstateSale} leads × 15% est. close × $2,500 avg referral value</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Realtor / Investor Referrals</CardTitle></CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">${estRealtorReferrals.toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-1">{wantsRealtor+wantsCash} leads × 10% est. close × $8,000 avg referral fee</p>
            </CardContent>
          </Card>
        </div>
        <p className="text-xs text-slate-400 mt-2">These are estimates only. Actual revenue depends on provider close rates and referral agreements.</p>
      </div>

      {/* Lead Level Breakdown */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Lead Quality Breakdown</h3>
        <div className="flex gap-3 flex-wrap">
          {['urgent','high','medium','low'].map(level => {
            const count = leads.filter(l=>l.lead_level===level).length;
            const pct = totalLeads > 0 ? Math.round(count/totalLeads*100) : 0;
            return (
              <div key={level} className="flex items-center gap-2">
                <Badge className={LEVEL_COLORS[level]}>{level}</Badge>
                <span className="text-sm font-semibold">{count}</span>
                <span className="text-xs text-slate-400">({pct}%)</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Source Pages */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Top SEO Source Pages (by Lead Count)</h3>
        <div className="space-y-2">
          {topSources.map(([url, count]) => (
            <div key={url} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
              <span className="font-mono text-sm text-slate-700 truncate">{url}</span>
              <Badge className="bg-blue-100 text-blue-700 shrink-0">{count} lead{count!==1?'s':''}</Badge>
            </div>
          ))}
          {topSources.length===0 && <p className="text-sm text-slate-400 text-center py-6">No source page data yet — source_url is captured when leads submit the lead form.</p>}
        </div>
      </div>
    </div>
  );
}