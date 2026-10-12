// LLBB Website Manager shell (Phase 4A — Part 7).
// LEFT NAVIGATION · MAIN PANEL · TOP BAR (name, status, setup %, preview,
// invite, review submission). Phase 4A implements: Overview (readiness +
// workflow), all settings-backed panels (generic editor), Domain (read-only),
// Estate Sales (read-only summary), Preview (authenticated draft preview),
// Gallery placeholder. Later phases plug into the shell unchanged.
import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ReadinessPanel from '@/components/llbb/ReadinessPanel';
import WorkflowActions from '@/components/llbb/WorkflowActions';
import SettingsSectionEditor from '@/components/llbb/SettingsSectionEditor';
import ManagerPreviewPanel from '@/components/llbb/ManagerPreviewPanel';
import { MANAGER_NAV, EDITOR_PANELS, WORKFLOW_LABELS, WORKFLOW_BADGE, MANAGEMENT_MODE_LABELS } from '@/components/llbb/managerConfig';
import { ArrowLeft, Eye, UserPlus, Loader2, Globe, Link2, LayoutList, Layers, Hammer } from 'lucide-react';

function ComingPanel({ label }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-10 text-center">
      <Hammer className="w-8 h-8 text-slate-300 mx-auto mb-3" />
      <div className="font-medium text-slate-700">{label}</div>
      <p className="text-sm text-slate-500 mt-1">This panel arrives in a later phase of the Business Builder.</p>
    </div>
  );
}

function OverviewPanel({ ov, onDone }) {
  return (
    <div className="space-y-4">
      <ReadinessPanel readiness={ov.readiness} />
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="px-4 py-3 border-b border-slate-100 text-sm font-semibold text-slate-900">Workflow</div>
        <div className="px-4 py-3 flex flex-wrap items-center gap-3">
          <Badge className={WORKFLOW_BADGE[ov.workflow_status]}>{WORKFLOW_LABELS[ov.workflow_status]}</Badge>
          <WorkflowActions overview={ov} onDone={onDone} />
        </div>
      </div>
      <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100 text-sm">
        {[
          ['Company', ov.company && ov.company.display_name],
          ['Management Mode', MANAGEMENT_MODE_LABELS[ov.management_mode] || ov.management_mode],
          ['Template', `${(ov.tenant.template && ov.tenant.template.id) || '—'} v${(ov.tenant.template && ov.tenant.template.version) || 1}`],
          ['Platform Hostname', ov.domains.find(d => d.domain_type === 'platform_subdomain')?.hostname],
          ['Rendering', ov.destination ? `runtime_served (${ov.destination.status})` : 'no destination'],
          ['Estate Sales', `${ov.published_sales_count} published · ${ov.publication_health.failed} failed · ${ov.publication_health.update_pending} pending update`],
          ['Site Status', ov.tenant.status]
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 px-4 py-2.5">
            <span className="text-slate-500">{k}</span>
            <span className="font-medium text-slate-900 text-right">{v || '—'}</span>
          </div>
        ))}
      </div>
      {ov.alerts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex flex-wrap gap-2">
          {ov.alerts.map(a => <Badge key={a.code} variant="outline" className="text-amber-800 border-amber-300 bg-white">{a.label}</Badge>)}
        </div>
      )}
    </div>
  );
}

function DomainPanel({ ov }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 max-w-2xl">
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="font-heading font-bold text-slate-900 flex items-center gap-2"><Globe className="w-4 h-4" /> Domains</div>
        <div className="text-sm text-slate-500 mt-0.5">Platform hostname is included. Custom domains are configured by platform admins in a later phase.</div>
      </div>
      <ul className="divide-y divide-slate-100">
        {ov.domains.map(d => (
          <li key={d.id} className="px-5 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="font-medium text-slate-900 truncate flex items-center gap-1.5"><Link2 className="w-3.5 h-3.5 text-slate-400" />{d.hostname}</div>
              <div className="text-xs text-slate-500">{d.domain_type === 'platform_subdomain' ? 'Platform hostname (included)' : 'Custom domain'}</div>
            </div>
            <Badge className={d.status === 'active' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-amber-100 text-amber-800 border border-amber-200'}>{d.status}</Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EstateSalesPanel({ ov }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 max-w-2xl">
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="font-heading font-bold text-slate-900 flex items-center gap-2"><LayoutList className="w-4 h-4" /> Estate Sales</div>
        <div className="text-sm text-slate-500 mt-0.5">Canonical EstateSalen Sales publish to this website automatically — no copies, no receiver.</div>
      </div>
      <div className="p-5 grid grid-cols-3 gap-3 text-center">
        {[['Published', ov.publication_health.published], ['Pending Update', ov.publication_health.update_pending], ['Failed', ov.publication_health.failed]].map(([k, v]) => (
          <div key={k} className="rounded-lg bg-slate-50 border border-slate-100 p-3">
            <div className="text-xl font-bold text-slate-900">{v}</div>
            <div className="text-xs text-slate-500">{k}</div>
          </div>
        ))}
      </div>
      <div className="px-5 py-3 border-t border-slate-100 text-xs text-slate-400">
        Auto-publish is {ov.tenant.auto_publish_enabled ? 'enabled' : 'disabled'}. Full per-sale management arrives in a later phase.
      </div>
    </div>
  );
}

export default function WebsiteManager() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tenantId = searchParams.get('tenant') || '';
  const tab = searchParams.get('tab') || 'overview';
  const [ov, setOv] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    if (!tenantId) { setError('No website selected.'); setLoading(false); return; }
    setLoading(true);
    try {
      const [a, b] = await Promise.all([
        base44.functions.invoke('llbbAdmin', { action: 'overview', website_tenant_id: tenantId }),
        base44.functions.invoke('websiteTenantSettingsAdmin', { action: 'get', website_tenant_id: tenantId })
      ]);
      setOv(a.data);
      setSettings((b.data && b.data.settings) || null);
      setError(null);
    } catch (e) {
      setError('Could not load this website.');
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, [tenantId]); // eslint-disable-line

  const setTab = (t) => {
    const p = new URLSearchParams(searchParams);
    p.set('tab', t);
    setSearchParams(p, { replace: true });
  };

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="w-7 h-7 animate-spin text-slate-400" /></div>;
  if (error || !ov) {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <div className="bg-white border border-slate-200 rounded-lg p-6 text-center">
          <p className="text-slate-700">{error || 'Website not found.'}</p>
          <Button variant="outline" className="mt-3" asChild><Link to="/AdminBusinessBuilder">Back to Business Builder</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 px-4 py-2.5 flex flex-wrap items-center gap-2 md:gap-3">
        <Link to="/AdminBusinessBuilder" className="text-sm text-slate-500 hover:text-slate-800 flex items-center gap-1"><ArrowLeft className="w-4 h-4" /> All Websites</Link>
        <span className="font-heading font-bold text-slate-900 truncate max-w-[220px]">{ov.tenant.name}</span>
        <Badge className={WORKFLOW_BADGE[ov.workflow_status]}>{WORKFLOW_LABELS[ov.workflow_status]}</Badge>
        <span className="text-sm text-slate-500 hidden sm:inline">Setup {ov.readiness.percent}%</span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setTab('preview')}><Eye className="w-4 h-4 mr-1.5" /> Preview Website</Button>
          <Button size="sm" variant="ghost" disabled title="Client invitations arrive in a later phase"><UserPlus className="w-4 h-4 mr-1.5" /> Invite Client</Button>
          <WorkflowActions overview={ov} onDone={load} primary />
        </div>
      </div>
      {/* Left nav + main */}
      <div className="flex flex-col md:flex-row">
        <nav className="md:w-56 md:flex-shrink-0 bg-white border-b md:border-b-0 md:border-r border-slate-200 px-2 py-2 flex md:flex-col gap-1 overflow-x-auto md:sticky md:top-[57px] md:self-start md:max-h-[calc(100vh-57px)] md:overflow-y-auto">
          {MANAGER_NAV.map((n) => (
            <button key={n.key} onClick={() => setTab(n.key)}
              className={`whitespace-nowrap px-3 py-2 rounded-md text-sm text-left transition-colors ${tab === n.key ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
              {n.label}
            </button>
          ))}
        </nav>
        <main className="flex-1 p-4 md:p-6 min-w-0">
          {tab === 'overview' && <OverviewPanel ov={ov} onDone={load} />}
          {tab === 'preview' && <ManagerPreviewPanel websiteTenantId={tenantId} />}
          {tab === 'gallery' && <ComingPanel label="Gallery" />}
          {tab === 'estate_sales' && <EstateSalesPanel ov={ov} />}
          {tab === 'domain' && <DomainPanel ov={ov} />}
          {EDITOR_PANELS[tab] && <SettingsSectionEditor websiteTenantId={tenantId} panel={tab} settings={settings} onSaved={load} />}
        </main>
      </div>
    </div>
  );
}