// Phase 4D — the client's own Website Manager (Parts 7/8/14/41).
// Simplified navigation, client-safe panels, NO technical internals
// (Destination, Publication, runtime, API keys, other tenants/companies are
// never reachable here). Same editors, same readiness engine, same certified
// preview runtime as the admin studio — one truth, two audiences.
import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ReadinessPanel from '@/components/llbb/ReadinessPanel';
import ReviewNotesPanel from '@/components/llbb/ReviewNotesPanel';
import ReviewActions from '@/components/llbb/ReviewActions';
import ActivityHistoryPanel from '@/components/llbb/ActivityHistoryPanel';
import SettingsSectionEditor from '@/components/llbb/SettingsSectionEditor';
import ManagerPreviewPanel from '@/components/llbb/ManagerPreviewPanel';
import ClientOverview from '@/components/llbb/ClientOverview';
import AiWebsiteBuilderPanel from '@/components/llbb/AiWebsiteBuilderPanel';
import AccessPanel from '@/components/llbb/AccessPanel';
import ClientDomainPanel from '@/components/llbb/ClientDomainPanel';
import BusinessEditor from '@/components/llbb/BusinessEditor';
import BrandingStudio from '@/components/llbb/BrandingStudio';
import HomepageEditor from '@/components/llbb/HomepageEditor';
import AboutEditor from '@/components/llbb/AboutEditor';
import ServicesEditor from '@/components/llbb/ServicesEditor';
import TestimonialsEditor from '@/components/llbb/TestimonialsEditor';
import GalleryEditor from '@/components/llbb/GalleryEditor';
import ContactSocialEditor from '@/components/llbb/ContactSocialEditor';
import FaqEditor from '@/components/llbb/FaqEditor';
import PoliciesEditor from '@/components/llbb/PoliciesEditor';
import NavigationFooterEditor from '@/components/llbb/NavigationFooterEditor';
import LivePreviewRail from '@/components/llbb/LivePreviewRail';
import LeadsPanel from '@/components/llbb/LeadsPanel';
import EstateSalesPanel from '@/components/llbb/EstateSalesPanel';
import AnalyticsPanel from '@/components/llbb/AnalyticsPanel';
import SiteHealthPanel from '@/components/llbb/SiteHealthPanel';
import OperatorPilotPanel from '@/components/pilot/OperatorPilotPanel';
import { CLIENT_NAV, WORKFLOW_LABELS, WORKFLOW_BADGE } from '@/components/llbb/managerConfig';
import { Eye, Loader2, Link2, Globe, PanelRightClose, PanelRightOpen, CheckCircle2, Lock } from 'lucide-react';

export default function ClientWebsiteManager() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tenantId = searchParams.get('tenant') || '';
  const tab = searchParams.get('tab') || 'overview';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(null);
  const [railOpen, setRailOpen] = useState(true);
  const [railNonce, setRailNonce] = useState(0);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [mobileTab, setMobileTab] = useState('edit');

  const load = async () => {
    try {
      const res = await base44.functions.invoke('websiteCollab', {
        action: 'my_website', ...(tenantId ? { website_tenant_id: tenantId } : {})
      });
      setData(res.data);
      setDenied(null);
    } catch (e) {
      const d = e.response && e.response.data && e.response.data.error;
      setDenied(d ? (d.code === 'no_website' ? 'No website is linked to your account yet. If you received an invitation, open its secure link first.' : (d.message || d.code)) : 'Could not load your website.');
    }
    setLoading(false);
  };
  const [inPilot, setInPilot] = useState(false);
  useEffect(() => { load(); }, [tenantId]); // eslint-disable-line
  useEffect(() => {
    if (!data || !data.website || !data.website.id) return;
    base44.functions.invoke('llbbPilot', { action: 'operator_status', website_tenant_id: data.website.id })
      .then(res => setInPilot(!!(res.data && res.data.pilot)))
      .catch(() => setInPilot(false));
  }, [data]);

  const setTab = (t) => {
    const p = new URLSearchParams(searchParams);
    p.set('tab', t);
    setSearchParams(p, { replace: true });
  };
  const onSaved = () => { load(); setRailNonce(n => n + 1); setLastSavedAt(new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })); };

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="w-7 h-7 animate-spin text-slate-400" /></div>;
  if (denied || !data) {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <div className="bg-white border border-slate-200 rounded-lg p-6 text-center">
          <p className="text-slate-700">{denied || 'Website not found.'}</p>
        </div>
      </div>
    );
  }

  const w = data.website;
  const settings = data.settings;
  const readOnly = !data.role.manage;
  const canEdit = data.role.manage; // server-authorized; the UI mirrors it

  const editor = () => {
    switch (tab) {
      case 'overview': return <ClientOverview data={data} onNavigate={setTab} onSaved={onSaved} />;
      case 'ai_build': return <AiWebsiteBuilderPanel websiteTenantId={w.id} settings={settings} company={data.company} onSaved={onSaved} onNavigate={setTab} />;
      case 'review': return (
        <div className="space-y-5">
          {data.review.submitted_at && (
            <div className="bg-white rounded-lg border border-slate-200 p-5">
              <div className="font-heading font-bold text-slate-900 mb-2">Review Status</div>
              <div className="grid sm:grid-cols-3 gap-3 text-sm">
                <div><span className="text-slate-400 text-xs block">Submitted</span>{new Date(data.review.submitted_at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} {data.review.submitted_by_name ? `by ${data.review.submitted_by_name}` : ''}</div>
                <div><span className="text-slate-400 text-xs block">Review round</span>{data.review.round}</div>
                <div><span className="text-slate-400 text-xs block">Reviewed version</span>Settings v{data.review.version || '—'}</div>
              </div>
              {data.review.approved_at && (
                <div className="mt-3 bg-indigo-50 border border-indigo-200 rounded-md p-3 text-sm text-indigo-800">
                  Approved — publication (your live web address) is arranged with the EstateSalen team as a separate step.
                </div>
              )}
              <div className="mt-4"><ReviewActions overview={{ website: w, workflow_status: w.workflow_status }} role="client" onDone={onSaved} /></div>
            </div>
          )}
          <ReviewNotesPanel websiteTenantId={w.id} authorRole="client" canAddNote={canEdit} onChanged={onSaved} />
          <ActivityHistoryPanel websiteTenantId={w.id} />
        </div>
      );
      case 'business': return <BusinessEditor websiteTenantId={w.id} settings={settings} company={data.company} onSaved={onSaved} />;
      case 'branding': return <BrandingStudio websiteTenantId={w.id} settings={settings} onSaved={onSaved} />;
      case 'homepage': return <HomepageEditor websiteTenantId={w.id} settings={settings} onSaved={onSaved} />;
      case 'about': return <AboutEditor websiteTenantId={w.id} settings={settings} onSaved={onSaved} />;
      case 'services': return <ServicesEditor websiteTenantId={w.id} settings={settings} onSaved={onSaved} />;
      case 'testimonials': return <TestimonialsEditor websiteTenantId={w.id} settings={settings} onSaved={onSaved} />;
      case 'gallery': return <GalleryEditor websiteTenantId={w.id} settings={settings} onSaved={onSaved} />;
      case 'contact_social': return <ContactSocialEditor websiteTenantId={w.id} settings={settings} company={data.company} onSaved={onSaved} />;
      case 'faq': return <FaqEditor websiteTenantId={w.id} settings={settings} onSaved={onSaved} />;
      case 'policies': return <PoliciesEditor websiteTenantId={w.id} settings={settings} onSaved={onSaved} />;
      case 'seo': return <SettingsSectionEditor websiteTenantId={w.id} panel="seo" settings={settings} onSaved={onSaved} />;
      case 'estate_sales': return <EstateSalesPanel websiteTenantId={w.id} clientMode />;
      case 'leads': return <LeadsPanel websiteTenantId={w.id} clientMode />;
      case 'analytics': return <AnalyticsPanel websiteTenantId={w.id} clientMode />;
      case 'health': return <SiteHealthPanel websiteTenantId={w.id} clientMode />;
      case 'domain': return <ClientDomainPanel domains={data.domains} />;
      case 'preview': return <ManagerPreviewPanel websiteTenantId={w.id} />;
      case 'pilot': return <OperatorPilotPanel websiteTenantId={w.id} />;
      case 'team': return <AccessPanel websiteTenantId={w.id} isOwnerOrAdmin={data.role.owner || data.role.admin} onChanged={onSaved} />;
      default: return <ClientOverview data={data} onNavigate={setTab} onSaved={onSaved} />;
    }
  };

  const navItems = [
    ...CLIENT_NAV.filter(n => n.key !== 'team' || data.role.owner || data.role.admin),
    ...(inPilot ? [{ key: 'pilot', label: 'Pilot Feedback' }] : [])
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 px-4 py-2.5 flex flex-wrap items-center gap-2 md:gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold tracking-widest text-cyan-700 uppercase leading-none">Your Website</div>
          <div className="font-heading font-bold text-slate-900 truncate max-w-[220px]">{w.name}</div>
        </div>
        <Badge className={WORKFLOW_BADGE[w.workflow_status]}>{WORKFLOW_LABELS[w.workflow_status]}</Badge>
        <span className="text-sm text-slate-500 hidden sm:inline">Setup {data.readiness.percent}%</span>
        {lastSavedAt && <span className="text-xs text-green-600 hidden lg:inline-flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Saved {lastSavedAt}</span>}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setTab('preview')}><Eye className="w-4 h-4 mr-1.5" /> Preview</Button>
          <ReviewActions overview={{ website: w, workflow_status: w.workflow_status }} role="client" onDone={onSaved} />
          <Button variant="ghost" size="sm" className="hidden lg:inline-flex" onClick={() => setRailOpen(o => !o)} aria-label={railOpen ? 'Collapse preview' : 'Expand preview'}>
            {railOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {readOnly && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm text-amber-800 flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 flex-shrink-0" /> The EstateSalen team is currently building this website — you can look around, and they'll invite you to manage it when it's ready.
        </div>
      )}

      {/* Mobile: Edit / Preview tabs */}
      <div className="lg:hidden bg-white border-b border-slate-200 px-4 py-2 flex gap-2">
        {['edit', 'preview'].map(v => (
          <button key={v} onClick={() => setMobileTab(v)}
            className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium ${mobileTab === v ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>
            {v === 'edit' ? 'Edit' : 'Preview'}
          </button>
        ))}
      </div>

      <div className="flex">
        <nav className="bg-white border-r border-slate-200 w-56 flex-shrink-0 px-2 py-2 overflow-y-auto sticky top-[57px] self-start max-h-[calc(100vh-57px)] hidden lg:block">
          {navItems.map(n => (
            <button key={n.key} onClick={() => setTab(n.key)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${tab === n.key ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
              {n.label}
            </button>
          ))}
        </nav>

        <main className={`flex-1 p-4 md:p-6 min-w-0 ${mobileTab === 'preview' ? 'hidden lg:block' : ''}`}>
          {editor()}
        </main>

        {railOpen && (
          <aside className="hidden lg:block w-[460px] flex-shrink-0 border-l border-slate-200 bg-slate-50 p-4 overflow-y-auto sticky top-[57px] self-start max-h-[calc(100vh-57px)]">
            <LivePreviewRail websiteTenantId={w.id} nonce={railNonce} />
          </aside>
        )}
      </div>

      {mobileTab === 'preview' && (
        <div className="lg:hidden p-3">
          <LivePreviewRail websiteTenantId={w.id} nonce={railNonce} />
        </div>
      )}
    </div>
  );
}