// Phase 4E (Parts 29/39) — Site Health panel. Reads ONLY through the certified
// websiteSiteHealth seam. Client mode hides technical internals.
import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, CheckCircle2, XCircle, HeartPulse, AlertTriangle } from 'lucide-react';

const BADGE = {
  healthy: 'bg-green-100 text-green-800 border border-green-200',
  attention: 'bg-amber-100 text-amber-800 border border-amber-200',
  problem: 'bg-red-100 text-red-700 border border-red-200'
};

export default function SiteHealthPanel({ websiteTenantId, clientMode }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('websiteSiteHealth', { action: 'check', website_tenant_id: websiteTenantId });
      setData(res.data);
      setError(null);
    } catch (e) {
      setError('Could not run the health check.');
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, [websiteTenantId]); // eslint-disable-line

  if (loading && !data) return <div className="p-10 flex justify-center"><Loader2 className="w-7 h-7 animate-spin text-slate-400" /></div>;
  if (error) return <div className="bg-white rounded-lg border border-slate-200 p-8 text-center text-sm text-slate-600">{error}</div>;

  const Icon = data.status === 'healthy' ? CheckCircle2 : data.status === 'problem' ? XCircle : AlertTriangle;
  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="font-heading font-bold text-slate-900 flex items-center gap-2"><HeartPulse className="w-4 h-4" /> Site Health</div>
          <div className="text-sm text-slate-500 mt-0.5">Automatic check of your website's core connections.</div>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Re-run check
        </Button>
      </div>

      <div className={`rounded-lg border px-5 py-4 flex items-center gap-3 ${BADGE[data.status] || BADGE.attention}`}>
        <Icon className="w-5 h-5" />
        <div>
          <div className="font-semibold">{data.label || data.status}</div>
          {data.checked_at && <div className="text-xs opacity-75">Checked {new Date(data.checked_at).toLocaleString()}</div>}
        </div>
      </div>

      <ul className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100">
        {(data.checks || []).map(c => (
          <li key={c.key} className="px-5 py-3 flex items-start gap-3">
            {c.status === 'pass'
              ? <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              : <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />}
            <div className="min-w-0">
              <div className="text-sm font-medium text-slate-800">{c.label}</div>
              <div className="text-xs text-slate-500">{c.detail}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}