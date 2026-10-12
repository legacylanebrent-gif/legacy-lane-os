// Legacy Lane Business Builder — Admin Command Center (Phase 4A — Part 2/13).
// Portfolio of all operator websites with certified status summary, filters,
// attention alerts, and the Launch New Website wizard entry point.
// Data comes exclusively from the admin-only llbbAdmin control plane.
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import LaunchWizard from '@/components/llbb/LaunchWizard';
import { WORKFLOW_LABELS, WORKFLOW_BADGE, ALERT_LABELS, MANAGEMENT_MODE_LABELS } from '@/components/llbb/managerConfig';
import { Rocket, Search, ExternalLink, Eye, AlertTriangle, Loader2, LayoutTemplate, Globe, Settings2 } from 'lucide-react';

const SUMMARY_CHIPS = [
  ['draft', 'Draft'], ['setup_in_progress', 'Setup In Progress'], ['ready_for_review', 'Ready for Review'],
  ['changes_requested', 'Changes Requested'], ['approved', 'Approved'], ['live', 'Live'], ['suspended', 'Suspended']
];

export default function AdminBusinessBuilder() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [filters, setFilters] = useState({ q: '', workflow: 'all', template: 'all', mode: 'all', domain: 'all', attention: false });

  const load = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('llbbAdmin', { action: 'portfolio' });
      setData(res.data); setError(null);
    } catch (e) {
      setError('Could not load the website portfolio.');
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const rows = useMemo(() => {
    if (!data) return [];
    return data.rows.filter((r) => {
      if (filters.workflow !== 'all' && r.workflow_status !== filters.workflow) return false;
      if (filters.template !== 'all' && !r.template?.id?.includes(filters.template)) return false;
      if (filters.mode !== 'all' && r.management_mode !== filters.mode) return false;
      if (filters.domain !== 'all' && r.domain_status !== filters.domain) return false;
      if (filters.attention && !r.attention) return false;
      const q = filters.q.trim().toLowerCase();
      if (q && !`${r.name} ${r.company?.display_name || ''} ${r.platform_hostname}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [data, filters]);

  const setFilter = (k, v) => setFilters(f => ({ ...f, [k]: v }));
  const templateOptions = useMemo(() => (data ? [...new Set(data.rows.map(r => r.template?.id).filter(Boolean))] : []), [data]);

  const openLive = (r) => window.open(`/site?site=${r.platform_hostname}`, '_blank');

  if (loading) {
    return <div className="p-10 flex justify-center"><Loader2 className="w-7 h-7 animate-spin text-slate-400" /></div>;
  }
  if (error) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-white border border-slate-200 rounded-lg p-6 text-center">
          <p className="text-slate-700">{error}</p>
          <Button variant="outline" className="mt-3" onClick={load}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex-1">
          <h1 className="text-2xl font-heading font-bold text-slate-900">Legacy Lane Business Builder</h1>
          <p className="text-sm text-slate-500 mt-0.5">Create and manage estate-sale company websites on the EstateSalen multi-tenant runtime.</p>
        </div>
        <Button onClick={() => setWizardOpen(true)} className="w-full md:w-auto">
          <Rocket className="w-4 h-4 mr-2" /> Launch New Website
        </Button>
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setFilter('workflow', 'all')} className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${filters.workflow === 'all' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
          Total Websites <span className="font-semibold ml-1">{data.summary.total}</span>
        </button>
        {SUMMARY_CHIPS.map(([key, label]) => (
          <button key={key} onClick={() => setFilter('workflow', key)}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${filters.workflow === key ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
            {label} <span className="font-semibold ml-1">{data.summary[key] ?? 0}</span>
          </button>
        ))}
        <button onClick={() => setFilters(f => ({ ...f, attention: !f.attention }))}
          className={`px-3 py-1.5 rounded-full text-sm border transition-colors flex items-center gap-1.5 ${filters.attention ? 'bg-red-600 text-white border-red-600' : 'bg-white border-red-200 text-red-600 hover:bg-red-50'}`}>
          <AlertTriangle className="w-3.5 h-3.5" /> Attention <span className="font-semibold ml-1">{data.attention_count}</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
          <Input value={filters.q} onChange={(e) => setFilter('q', e.target.value)} placeholder="Search company, website or hostname" className="pl-8" />
        </div>
        <div className="grid grid-cols-2 md:flex gap-2">
          <Select value={filters.workflow} onValueChange={(v) => setFilter('workflow', v)}>
            <SelectTrigger className="w-full md:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.entries(WORKFLOW_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.mode} onValueChange={(v) => setFilter('mode', v)}>
            <SelectTrigger className="w-full md:w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modes</SelectItem>
              {Object.entries(MANAGEMENT_MODE_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.template} onValueChange={(v) => setFilter('template', v)}>
            <SelectTrigger className="w-full md:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Templates</SelectItem>
              {templateOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.domain} onValueChange={(v) => setFilter('domain', v)}>
            <SelectTrigger className="w-full md:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Domains</SelectItem>
              <SelectItem value="none">Platform Only</SelectItem>
              <SelectItem value="connected">Custom Connected</SelectItem>
              <SelectItem value="action_required">Custom Action Needed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Empty state */}
      {rows.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-lg p-10 text-center">
          <LayoutTemplate className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">No websites match this view.</p>
          <Button className="mt-4" onClick={() => setWizardOpen(true)}><Rocket className="w-4 h-4 mr-2" /> Launch New Website</Button>
        </div>
      )}

      {/* Data table (desktop) */}
      {rows.length > 0 && (
        <div className="hidden md:block bg-white border border-slate-200 rounded-lg overflow-x-auto">
          <table className="w-full text-sm min-w-[980px]">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-2.5 font-medium">Company / Website</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Setup</th>
                <th className="px-4 py-2.5 font-medium">Template</th>
                <th className="px-4 py-2.5 font-medium">Hostname</th>
                <th className="px-4 py-2.5 font-medium">Mode</th>
                <th className="px-4 py-2.5 font-medium">Updated</th>
                <th className="px-4 py-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900 flex items-center gap-1.5">
                      {r.name}
                      {r.attention && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                    </div>
                    <div className="text-xs text-slate-500">{r.company ? r.company.display_name : '—'}</div>
                    {r.alerts.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {r.alerts.map(a => <Badge key={a.code} variant="outline" className="text-[10px] px-1.5 py-0 text-red-600 border-red-200 bg-red-50">{ALERT_LABELS[a.code] || a.label}</Badge>)}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3"><Badge className={WORKFLOW_BADGE[r.workflow_status]}>{WORKFLOW_LABELS[r.workflow_status] || r.workflow_status}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-14 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full ${r.readiness.blockers.length ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${r.readiness.percent}%` }} /></div>
                      <span className="text-xs text-slate-600">{r.readiness.percent}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">{r.template.id} v{r.template.version}</td>
                  <td className="px-4 py-3 text-xs">
                    <div className="text-slate-700 flex items-center gap-1"><Globe className="w-3 h-3 text-slate-400" />{r.platform_hostname}</div>
                    {r.custom_domains.length > 0 && <div className="text-slate-400 mt-0.5">{r.custom_domains.map(d => d.hostname).join(', ')}{r.domain_status === 'action_required' ? ' (action required)' : ''}</div>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">{MANAGEMENT_MODE_LABELS[r.management_mode]}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{r.updated_date ? new Date(r.updated_date).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      <Button size="sm" variant="outline" asChild><Link to={`/WebsiteManager?tenant=${r.id}`}>Manage</Link></Button>
                      <Button size="sm" variant="ghost" onClick={() => openLive(r)}><Eye className="w-3.5 h-3.5" /></Button>
                      {r.workflow_status === 'live' && (
                        <Button size="sm" variant="ghost" onClick={() => window.open(`https://${r.platform_hostname}`, '_blank')}><ExternalLink className="w-3.5 h-3.5" /></Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Stacked cards (mobile) */}
      {rows.length > 0 && (
        <div className="md:hidden space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="bg-white border border-slate-200 rounded-lg p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium text-slate-900">{r.name}</div>
                  <div className="text-xs text-slate-500">{r.company ? r.company.display_name : '—'}</div>
                </div>
                <Badge className={WORKFLOW_BADGE[r.workflow_status]}>{WORKFLOW_LABELS[r.workflow_status]}</Badge>
              </div>
              {r.alerts.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {r.alerts.map(a => <Badge key={a.code} variant="outline" className="text-[10px] px-1.5 py-0 text-red-600 border-red-200 bg-red-50">{ALERT_LABELS[a.code]}</Badge>)}
                </div>
              )}
              <div className="text-xs text-slate-500 space-y-0.5">
                <div>Setup {r.readiness.percent}% · {r.template.id} v{r.template.version} · {MANAGEMENT_MODE_LABELS[r.management_mode]}</div>
                <div className="flex items-center gap-1"><Globe className="w-3 h-3" />{r.platform_hostname}</div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" asChild className="flex-1"><Link to={`/WebsiteManager?tenant=${r.id}`}><Settings2 className="w-3.5 h-3.5 mr-1" /> Manage</Link></Button>
                <Button size="sm" variant="ghost" onClick={() => openLive(r)}><Eye className="w-3.5 h-3.5" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <LaunchWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onCreated={(tenant) => { setWizardOpen(false); load(); navigate(`/WebsiteManager?tenant=${tenant.id}`); }}
      />
    </div>
  );
}