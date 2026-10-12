// LLBB Website Manager — Estate Sales panel (Phase 4C, Part 2).
// Canonical EstateSalen Sales of the tenant's Company + this tenant's
// Publication state. NOT a sale editor: operational editing routes to the
// canonical SaleEditor. Publish/unpublish go through the certified
// publication seam (llbbAdmin publish_sale / unpublish_sale).
import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/use-toast';
import { LayoutList, ExternalLink, Eye, Settings2, RefreshCw, AlertTriangle, Loader2 } from 'lucide-react';

const STATUS_BADGE = {
  draft: 'bg-slate-100 text-slate-700 border border-slate-200',
  upcoming: 'bg-blue-100 text-blue-800 border border-blue-200',
  active: 'bg-green-100 text-green-800 border border-green-200',
  completed: 'bg-slate-200 text-slate-700 border border-slate-300',
  archived: 'bg-slate-200 text-slate-500 border border-slate-300'
};

const PUB_BADGE = {
  published: 'bg-green-100 text-green-800 border border-green-200',
  pending: 'bg-amber-100 text-amber-800 border border-amber-200',
  failed: 'bg-red-100 text-red-700 border border-red-200',
  update_pending: 'bg-orange-100 text-orange-800 border border-orange-200',
  unpublished: 'bg-slate-100 text-slate-600 border border-slate-200'
};

function fmtDates(dates) {
  if (!Array.isArray(dates) || !dates.length || !dates[0].date) return '—';
  const d = new Date(`${dates[0].date}T12:00:00`);
  return isNaN(d) ? dates[0].date : d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

// clientMode (Phase 4D): reads go through the client-safe websiteCollab seam
// and publish/unpublish + the policy switch are hidden — publication actions
// and operational Sale authority remain platform-admin / canonical powers.
export default function EstateSalesPanel({ websiteTenantId, onNavigate, clientMode }) {
  const seam = clientMode ? 'websiteCollab' : 'llbbAdmin';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [policyBusy, setPolicyBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await base44.functions.invoke(seam, { action: 'sales_list', website_tenant_id: websiteTenantId });
      setData(res.data);
    } catch (e) {
      toast({ title: 'Could not load estate sales', variant: 'destructive' });
    }
    setLoading(false);
  }, [websiteTenantId, seam]);

  useEffect(() => { load(); }, [load]);

  async function setPolicy(enabled) {
    setPolicyBusy(true);
    try {
      await base44.functions.invoke('llbbAdmin', { action: 'set_publish_policy', website_tenant_id: websiteTenantId, auto_publish_enabled: enabled });
      setData(d => ({ ...d, auto_publish_enabled: enabled }));
      toast({ title: enabled ? 'Auto-publish enabled' : 'Switched to manual publication' });
    } catch (e) {
      toast({ title: 'Could not update publication policy', variant: 'destructive' });
    }
    setPolicyBusy(false);
  }

  async function publishAction(sale, kind) {
    setBusyId(sale.id);
    try {
      await base44.functions.invoke('llbbAdmin', {
        action: kind === 'publish' ? 'publish_sale' : 'unpublish_sale',
        website_tenant_id: websiteTenantId,
        sale_id: sale.id
      });
      toast({ title: kind === 'publish' ? 'Published to website' : 'Removed from website' });
      await load();
    } catch (e) {
      const code = e.response && e.response.data && (e.response.data.error.code || e.response.data.error);
      toast({ title: `Could not ${kind} sale`, description: typeof code === 'string' ? code.replace(/_/g, ' ') : null, variant: 'destructive' });
    }
    setBusyId(null);
  }

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  if (!data) return null;

  return (
    <div className="space-y-5">
      {/* Publication policy (Part 3) — platform-admin only in client mode */}
      {!clientMode && (<div className="bg-white rounded-lg border border-slate-200 p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="max-w-xl">
            <div className="font-heading font-bold text-slate-900 flex items-center gap-2"><LayoutList className="w-4 h-4" /> Publication Policy</div>
            <p className="text-sm text-slate-500 mt-1">
              With auto-publish, every eligible sale on your company automatically appears here — EstateSalen keeps the website's Publication relationship current as the sale changes. Manual mode publishes only when you click Publish below.
            </p>
            <p className="text-xs text-slate-400 mt-2">Eligible: public lifecycle (upcoming, active, completed) with a title and public location. Draft, internal and archived sales are never published.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600">{data.auto_publish_enabled ? 'Auto-publish eligible sales' : 'Manual website publication'}</span>
            <Switch checked={!!data.auto_publish_enabled} onCheckedChange={setPolicy} disabled={policyBusy} aria-label="Auto-publish eligible sales" />
          </div>
        </div>
      </div>)}

      {/* Sales table */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="font-heading font-bold text-slate-900">Estate Sales</div>
            <div className="text-sm text-slate-500 mt-0.5">Canonical EstateSalen sales for this company — the website reads them live; no copies.</div>
          </div>
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh</Button>
        </div>
        {data.sales.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">No canonical sales exist for this company yet. Create one in EstateSalen sale management — eligible sales appear here automatically.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[860px]">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-100">
                  <th className="px-4 py-3 font-medium">Sale</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Dates</th>
                  <th className="px-4 py-3 font-medium">Items</th>
                  <th className="px-4 py-3 font-medium">Publication</th>
                  <th className="px-4 py-3 font-medium">Featured</th>
                  <th className="px-4 py-3 font-medium">Updated</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.sales.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-md overflow-hidden bg-slate-100 flex-shrink-0">
                          {s.thumbnail && <img src={s.thumbnail} alt="" className="w-full h-full object-cover" />}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-slate-900 truncate max-w-[220px]">{s.title}</div>
                          {s.attention.length > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs text-amber-700"><AlertTriangle className="w-3 h-3" /> {s.attention.join(', ').replace(/_/g, ' ')}</span>
                          )}
                          {s.visible && s.website_url && (
                            <a href={s.website_url} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-400 hover:text-slate-600 truncate max-w-[220px] block">{s.website_url.replace(/^https:\/\//, '')}</a>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><Badge className={STATUS_BADGE[s.status] || 'bg-slate-100 text-slate-600 border border-slate-200'}>{s.status}</Badge></td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{fmtDates(s.dates)}</td>
                    <td className="px-4 py-3 text-slate-600">{s.inventory_count}</td>
                    <td className="px-4 py-3">
                      {s.publication
                        ? <Badge className={PUB_BADGE[s.publication.status] || 'bg-slate-100 text-slate-600 border border-slate-200'}>{s.publication.status.replace(/_/g, ' ')}</Badge>
                        : <span className="text-slate-400 text-xs">Not published</span>}
                    </td>
                    <td className="px-4 py-3">{s.featured ? <Badge className="bg-amber-100 text-amber-800 border border-amber-200">Featured</Badge> : <span className="text-slate-300">—</span>}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{s.updated_date ? new Date(s.updated_date).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {s.visible && s.website_url && (
                          <Button variant="ghost" size="sm" asChild>
                            <Link to={`/site/sale/${s.website_url.split('/site/sale/')[1]}?site=${new URL(s.website_url).hostname}`}><Eye className="w-3.5 h-3.5 mr-1" /> View</Link>
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/SaleEditor?saleId=${s.id}`}><Settings2 className="w-3.5 h-3.5 mr-1" /> Manage</Link>
                        </Button>
                        {!clientMode && (s.publication && s.publication.status === 'published' ? (
                          <Button variant="outline" size="sm" disabled={busyId === s.id} onClick={() => publishAction(s, 'unpublish')}>Unpublish</Button>
                        ) : (
                          <Button variant="outline" size="sm" disabled={busyId === s.id || s.status === 'draft' || s.status === 'archived'} onClick={() => publishAction(s, 'publish')}>Publish</Button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}