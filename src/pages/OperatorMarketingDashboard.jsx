import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Loader2, TrendingUp, Mail, MousePointer, Users, AlertTriangle,
  MapPin, RefreshCw, Sparkles, ChevronRight, ChevronDown, Info
} from 'lucide-react';

const INTEREST_COLORS = {
  high: 'bg-green-100 text-green-700 border-green-200',
  moderate: 'bg-amber-100 text-amber-700 border-amber-200',
  low: 'bg-slate-100 text-slate-500 border-slate-200',
};

function interestLabel(score) {
  if (score >= 70) return 'high';
  if (score >= 40) return 'moderate';
  return 'low';
}

function pct(n, d) {
  if (!d) return '0%';
  return (Math.round((n / d) * 1000) / 10) + '%';
}

function StatCard({ label, value, sub, color = 'text-slate-900' }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-slate-500 mb-1">{label}</p>
        <p className={`text-2xl font-bold ${color}`}>{value ?? '—'}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function SaleRow({ perf, onSelect }) {
  const iScore = perf.estimated_attendance_interest_score || 0;
  const level = interestLabel(iScore);
  return (
    <div className="flex items-center gap-3 py-3 border-b border-slate-100 last:border-0 text-sm flex-wrap">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-800 truncate">{perf.sale_title || 'Untitled Sale'}</p>
        <p className="text-xs text-slate-400">{perf.sale_start_date || '—'}</p>
      </div>
      <div className="flex gap-4 text-xs text-slate-600 flex-wrap">
        <span><span className="text-slate-400">Sent</span> <strong>{perf.total_sent || 0}</strong></span>
        <span><span className="text-slate-400">H.Open</span> <strong>{pct(perf.total_human_opened, perf.total_delivered)}</strong></span>
        <span><span className="text-slate-400">H.Click</span> <strong>{pct(perf.total_human_clicked, perf.total_delivered)}</strong></span>
        <span><span className="text-slate-400">Directions</span> <strong>{perf.direction_clicks || 0}</strong></span>
        <span><span className="text-slate-400">Saved</span> <strong>{perf.save_sale_clicks || 0}</strong></span>
        <span><span className="text-slate-400">Unsubs</span> <strong>{perf.total_unsubscribed || 0}</strong></span>
      </div>
      <Badge className={`text-[10px] ${INTEREST_COLORS[level]}`}>{iScore}/100</Badge>
      <Button size="sm" variant="outline" onClick={() => onSelect(perf)} className="text-xs h-7 flex-shrink-0">
        Report <ChevronRight className="w-3 h-3 ml-1" />
      </Button>
    </div>
  );
}

function SaleDetailPanel({ perf, onClose, onGenerateAI, generatingAI }) {
  if (!perf) return null;
  let aiRecs = null;
  try { aiRecs = perf.ai_recommendations ? JSON.parse(perf.ai_recommendations) : null; } catch {}

  const iScore = perf.estimated_attendance_interest_score || 0;
  const level = interestLabel(iScore);
  const topZips = perf.top_zip_codes_json ? Object.entries(perf.top_zip_codes_json).sort((a, b) => b[1] - a[1]).slice(0, 5) : [];

  return (
    <div className="border border-indigo-200 rounded-xl bg-indigo-50 p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-bold text-slate-900">{perf.sale_title}</h3>
          <p className="text-xs text-slate-500">{perf.sale_start_date} — {perf.sale_end_date}</p>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xs">✕ Close</button>
      </div>

      {/* Interest Score */}
      <div className="bg-white rounded-xl border border-indigo-200 p-4">
        <div className="flex items-center gap-2 mb-2">
          <p className="text-sm font-semibold text-slate-700">Estimated Buyer Interest</p>
          <span title="This score is based on email engagement, clicks, direction clicks, saved sale activity, subscriber proximity, and repeat buyer behavior.">
            <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
          </span>
        </div>
        <div className="flex items-end gap-3">
          <p className={`text-4xl font-bold ${level === 'high' ? 'text-green-600' : level === 'moderate' ? 'text-amber-600' : 'text-slate-500'}`}>{iScore}</p>
          <p className="text-sm text-slate-500 mb-1">/100 — <span className="capitalize font-medium">{level} interest</span></p>
        </div>
        <div className="mt-2 h-2 rounded-full bg-slate-200">
          <div className={`h-2 rounded-full ${level === 'high' ? 'bg-green-500' : level === 'moderate' ? 'bg-amber-400' : 'bg-slate-400'}`} style={{ width: `${iScore}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Human Opens', value: perf.total_human_opened },
          { label: 'Human Clicks', value: perf.total_human_clicked },
          { label: 'Direction Clicks', value: perf.direction_clicks },
          { label: 'Save Sale Clicks', value: perf.save_sale_clicks },
          { label: 'Unique Clickers', value: perf.total_unique_clickers },
          { label: 'Unsubscribes', value: perf.total_unsubscribed },
          { label: 'Bounced', value: perf.total_bounced },
          { label: 'Spam Reports', value: perf.total_spam_complaints },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-lg border border-indigo-100 p-3">
            <p className="text-[10px] text-slate-500">{s.label}</p>
            <p className="text-xl font-bold text-slate-800">{s.value || 0}</p>
          </div>
        ))}
      </div>

      {/* Top ZIPs */}
      {topZips.length > 0 && (
        <div className="bg-white rounded-xl border border-indigo-100 p-4">
          <p className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />Most Engaged ZIP Codes</p>
          <div className="flex flex-wrap gap-2">
            {topZips.map(([zip, count]) => (
              <span key={zip} className="text-xs bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full font-medium">{zip} <span className="opacity-60">({count})</span></span>
            ))}
          </div>
        </div>
      )}

      {/* Top clicked URL */}
      {perf.top_clicked_url && (
        <div className="bg-white rounded-xl border border-indigo-100 p-4">
          <p className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1"><MousePointer className="w-3.5 h-3.5" />Top Clicked Link</p>
          <p className="text-xs text-indigo-600 break-all">{perf.top_clicked_url}</p>
        </div>
      )}

      {/* AI Summary */}
      {perf.ai_summary && (
        <div className="bg-white rounded-xl border border-purple-200 p-4">
          <p className="text-xs font-semibold text-purple-700 mb-2 flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" />AI Marketing Summary</p>
          <p className="text-sm text-slate-700 leading-relaxed">{perf.ai_summary}</p>
          {aiRecs?.recommended_next_action && (
            <div className="mt-3 bg-purple-50 border border-purple-100 rounded-lg p-3">
              <p className="text-xs font-semibold text-purple-700 mb-1">Recommended Next Action</p>
              <p className="text-xs text-purple-800">{aiRecs.recommended_next_action}</p>
            </div>
          )}
          {aiRecs?.suggested_followup_email && (
            <div className="mt-2 bg-blue-50 border border-blue-100 rounded-lg p-3">
              <p className="text-xs font-semibold text-blue-700 mb-1">Suggested Follow-up Email</p>
              <p className="text-xs text-blue-800">{aiRecs.suggested_followup_email}</p>
            </div>
          )}
        </div>
      )}

      <Button onClick={() => onGenerateAI(perf.sale_id, perf.operator_id)} disabled={generatingAI} className="bg-purple-600 hover:bg-purple-700 text-white w-full">
        {generatingAI ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating AI insights...</> : <><Sparkles className="w-4 h-4 mr-2" />Generate AI Insights</>}
      </Button>
    </div>
  );
}

export default function OperatorMarketingDashboard() {
  const [user, setUser] = useState(null);
  const [operatorPerf, setOperatorPerf] = useState(null);
  const [salePerfs, setSalePerfs] = useState([]);
  const [selectedSale, setSelectedSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const u = await base44.auth.me();
      setUser(u);
      const opId = u?.id;
      if (!opId) { setLoading(false); return; }

      const [opPerfs, sPerfs] = await Promise.all([
        base44.entities.OperatorMarketingPerformance.filter({ operator_id: opId }),
        base44.entities.SaleMarketingPerformance.filter({ operator_id: opId }),
      ]);
      setOperatorPerf(opPerfs[0] || null);
      setSalePerfs(sPerfs.sort((a, b) => (b.estimated_attendance_interest_score || 0) - (a.estimated_attendance_interest_score || 0)));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleRecalculate = async () => {
    setRecalculating(true);
    await base44.functions.invoke('recalculateMarketingStats', { operator_id: user?.id });
    await loadData();
    setRecalculating(false);
  };

  const handleGenerateAI = async (saleId, operatorId) => {
    setGeneratingAI(true);
    try {
      const res = await base44.functions.invoke('generateMarketingInsights', { sale_id: saleId, operator_id: operatorId });
      if (res.data?.success) await loadData();
    } catch (err) { console.error(err); }
    setGeneratingAI(false);
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;

  const op = operatorPerf;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Email Performance & Buyer Interest</h1>
          <p className="text-slate-500 mt-1">See how buyers are engaging with your estate sale alerts, which sales are getting the most attention, and what to do next.</p>
        </div>
        <Button onClick={handleRecalculate} disabled={recalculating} variant="outline" size="sm" className="text-xs">
          {recalculating ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Recalculating...</> : <><RefreshCw className="w-3.5 h-3.5 mr-1.5" />Refresh Stats</>}
        </Button>
      </div>

      {!op && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
          <TrendingUp className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">No performance data yet</p>
          <p className="text-sm text-slate-400 mt-1">Stats will appear once Customer.io is connected and emails are sent.</p>
          <Button onClick={handleRecalculate} disabled={recalculating} size="sm" className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
            Calculate from existing logs
          </Button>
        </div>
      )}

      {op && (
        <>
          {/* Overview cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Emails Sent" value={op.total_sent?.toLocaleString()} />
            <StatCard label="Delivered" value={op.total_delivered?.toLocaleString()} color="text-blue-600" />
            <StatCard label="Human Open Rate" value={`${op.average_human_open_rate || 0}%`} color="text-indigo-600" />
            <StatCard label="Human Click Rate" value={`${op.average_human_click_rate || 0}%`} color="text-purple-600" />
            <StatCard label="Unsubscribes" value={op.total_unsubscribed} color="text-amber-600" />
            <StatCard label="Bounces" value={op.total_bounced} color="text-red-500" />
            <StatCard label="Net Audience" value={op.net_audience_growth >= 0 ? `+${op.net_audience_growth}` : op.net_audience_growth} color={op.net_audience_growth >= 0 ? 'text-green-600' : 'text-red-600'} />
            <StatCard label="Sales Promoted" value={op.total_sales_promoted} color="text-slate-700" />
          </div>

          {/* AI Summary */}
          {op.ai_summary && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex gap-3">
              <Sparkles className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-purple-800 mb-1">AI Performance Summary</p>
                <p className="text-sm text-purple-700">{op.ai_summary}</p>
              </div>
            </div>
          )}
        </>
      )}

      {/* Sale Performance Table */}
      {salePerfs.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              Sale Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {salePerfs.map(perf => (
              <SaleRow key={perf.id} perf={perf} onSelect={setSelectedSale} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Sale Detail Panel */}
      {selectedSale && (
        <SaleDetailPanel
          perf={selectedSale}
          onClose={() => setSelectedSale(null)}
          onGenerateAI={handleGenerateAI}
          generatingAI={generatingAI}
        />
      )}

      {/* Top ZIP codes (operator-level) */}
      {op?.top_zip_codes_json && Object.keys(op.top_zip_codes_json).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-600" />
              Audience Insights — Top ZIP Codes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(op.top_zip_codes_json).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([zip, count]) => (
                <span key={zip} className="text-xs bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1.5 rounded-full font-medium">
                  {zip} <span className="opacity-60 text-[10px]">({count} engagements)</span>
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}