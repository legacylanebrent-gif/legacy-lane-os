import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';

// Phase 3C minimal certification surface (Part 32) — infrastructure probe only.
// NOT the final website design. Resolves a hostname through the multi-tenant
// runtime and shows the safe public context it produces.
export default function WebsiteRuntimeProbe() {
  const urlParams = new URLSearchParams(window.location.search);
  const [hostname, setHostname] = useState(urlParams.get('host') || window.location.hostname);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [site, setSite] = useState(null);
  const [saleDetail, setSaleDetail] = useState(null);

  const resolve = async () => {
    setLoading(true); setError(null); setSite(null); setSaleDetail(null);
    try {
      const res = await base44.functions.invoke('websiteRuntime', { hostname });
      setSite(res.data.website || null);
      if (res.data.error) setError(res.data.error);
    } catch (e) {
      setError((e.response && e.response.data && e.response.data.error) || 'request_failed');
    } finally { setLoading(false); }
  };

  const openSale = async (publicId) => {
    setSaleDetail(null);
    try {
      const res = await base44.functions.invoke('websiteRuntime', { hostname, action: 'sale', public_sale_id: publicId });
      setSaleDetail(res.data.ok ? res.data : null);
    } catch (e) { setSaleDetail({ not_found: true }); }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-mono text-sm">
      <div className="max-w-3xl mx-auto space-y-4">
        <h1 className="text-lg font-bold">Website Runtime — Tenant Resolution Probe (Phase 3C)</h1>
        <div className="flex gap-2">
          <input
            className="flex-1 border border-slate-300 rounded px-3 py-2 bg-white"
            value={hostname}
            onChange={(e) => setHostname(e.target.value)}
            placeholder="operator site hostname"
          />
          <button onClick={resolve} disabled={loading} className="bg-slate-800 text-white rounded px-4 py-2 disabled:opacity-50">
            {loading ? 'Resolving…' : 'Resolve'}
          </button>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3">Resolution result: {error}</div>}

        {site && (
          <div className="bg-white border border-slate-200 rounded p-4 space-y-2">
            <div><strong>Resolved site:</strong> {site.site_name}</div>
            <div><strong>Hostname:</strong> {site.hostname}</div>
            <div><strong>Tenant slug:</strong> {site.tenant_slug}</div>
            <div><strong>Company:</strong> {site.company && site.company.display_name}</div>
            <div><strong>Published sales:</strong> {(site.published_sales || []).length}</div>
            <ul className="list-disc pl-6">
              {(site.published_sales || []).map((s) => (
                <li key={s.public_id}>
                  <button className="underline text-blue-700" onClick={() => openSale(s.public_id)}>
                    {s.title || s.public_id}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {saleDetail && (
          <div className="bg-white border border-slate-200 rounded p-4 space-y-1">
            {saleDetail.not_found ? (
              <div className="text-red-700">Sale not found (tenant-safe)</div>
            ) : (
              <div className="space-y-1">
                <div><strong>Sale:</strong> {saleDetail.sale && saleDetail.sale.title}</div>
                <div><strong>Inventory count:</strong> {saleDetail.inventory_count}</div>
                <ul className="list-disc pl-6">
                  {(saleDetail.inventory || []).slice(0, 10).map((it) => (
                    <li key={it.public_id}>{it.title} — {it.sold_status}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}