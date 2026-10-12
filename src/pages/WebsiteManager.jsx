// LLBB Website Setup Studio (Phase 4B — Part 1).
// LEFT setup navigation · CENTER configuration editor · RIGHT live website
// preview (collapsible). Mobile: Edit / Preview tabs. Top bar: website name,
// workflow status, setup %, last-save status, Preview, workflow actions.
// Editors save through the certified websiteTenantSettingsAdmin seam; preview
// renders the SAME Template #1 via the authenticated site_preview runtime.
import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ReadinessPanel from '@/components/llbb/ReadinessPanel';
import WorkflowActions from '@/components/llbb/WorkflowActions';
import ReviewActions from '@/components/llbb/ReviewActions';
import ReviewCenterPanel from '@/components/llbb/ReviewCenterPanel';
import InviteClientModal from '@/components/llbb/InviteClientModal';
import SettingsSectionEditor from '@/components/llbb/SettingsSectionEditor';
import ManagerPreviewPanel from '@/components/llbb/ManagerPreviewPanel';
import StudioOverview from '@/components/llbb/StudioOverview';
import BusinessEditor from '@/components/llbb/BusinessEditor';
import BrandingStudio from '@/components/llbb/BrandingStudio';
import MediaLibraryPanel from '@/components/llbb/MediaLibraryPanel';
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
import DomainsManagerPanel from '@/components/llbb/DomainsManagerPanel';
import { MANAGER_NAV, WORKFLOW_LABELS, WORKFLOW_BADGE, MANAGEMENT_MODE_LABELS } from '@/components/llbb/managerConfig';
import { ArrowLeft, Eye, UserPlus, Loader2, Globe, Link2, LayoutList, PanelRightClose, PanelRightOpen, CheckCircle2 } from 'lucide-react';

// 4A panels — canonical + domain stay read-only summaries in 4B.
function ComingPanel({ label }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-10 text-center">
      <LayoutList className="w-8 h-8 text-slate-300 mx-auto mb-3" />
      <div className="font-medium text-slate-700">{label}</div>
      <p className="text-sm text-slate-500 mt-1">This panel arrives in a later phase of the Business Builder.</p>
    </div>
  );
}

// Phase 4E — domain management moved to DomainsManagerPanel (full DNS seam).

export default function WebsiteManager() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tenantId = searchParams.get('tenant') || '';
  const tab = searchParams.get('tab') || 'overview';
  const [ov, setOv] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [railOpen, setRailOpen] = useState(true);
  const [railNonce, setRailNonce] = useState(0);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [mobileTab, setMobileTab] = useState('edit');
  const [inviteOpen, setInviteOpen] = useState(false);

  const load = async () => {
    if (!tenantId) { setError('No website selected.'); setLoading(false); return; }
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
  const onSaved = () => { load(); setRailNonce(n => n + 1); setLastSavedAt(new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })); };

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

  const editor = () => {
    switch (tab) {
      case 'overview': return <StudioOverview ov={ov} settings={settings} onNavigate={setTab} />;
      case 'business': return <BusinessEditor websiteTenantId={tenantId} settings={settings} company={ov.company} onSaved={onSaved} />;
      case 'branding': return <BrandingStudio websiteTenantId={tenantId} settings={settings} onSaved={onSaved} />;
      case 'media': return <MediaLibraryPanel websiteTenantId={tenantId} settings={settings} onSaved={onSaved} />;
      case 'homepage': return <HomepageEditor websiteTenantId={tenantId} settings={settings} onSaved={onSaved} />;
      case 'about': return <AboutEditor websiteTenantId={tenantId} settings={settings} onSaved={onSaved} />;
      case 'services': return <ServicesEditor websiteTenantId={tenantId} settings={settings} onSaved={onSaved} />;
      case 'testimonials': return <TestimonialsEditor websiteTenantId={tenantId} settings={settings} onSaved={onSaved} />;
      case 'gallery': return <GalleryEditor websiteTenantId={tenantId} settings={settings} onSaved={onSaved} />;
      case 'contact_social': return <ContactSocialEditor websiteTenantId={tenantId} settings={settings} company={ov.company} onSaved={onSaved} />;
      case 'faq': return <FaqEditor websiteTenantId={tenantId} settings={settings} onSaved={onSaved} />;
      case 'policies': return <PoliciesEditor websiteTenantId={tenantId} settings={settings} onSaved={onSaved} />;
      case 'navigation': return <NavigationFooterEditor websiteTenantId={tenantId} settings={settings} onSaved={onSaved} />;
      case 'seo': return <SettingsSectionEditor websiteTenantId={tenantId} panel="seo" settings={settings} onSaved={onSaved} />;
      case 'estate_sales': return <EstateSalesPanel websiteTenantId={tenantId} onNavigate={setTab} />;
      case 'leads': return <LeadsPanel websiteTenantId={tenantId} />;
      case 'analytics': return <AnalyticsPanel websiteTenantId={tenantId} />;
      case 'health': return <SiteHealthPanel websiteTenantId={tenantId} />;
      case 'domain': return <DomainsManagerPanel websiteTenantId={tenantId} domains={ov.domains} includedHostname={(ov.domains || []).find(d => d.domain_type === 'platform_subdomain')?.hostname} />;
      case 'review': return <ReviewCenterPanel ov={ov} onNavigate={setTab} onSaved={onSaved} />;
      case 'preview': return <ManagerPreviewPanel websiteTenantId={tenantId} />;
      default: return <StudioOverview ov={ov} settings={settings} onNavigate={setTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 px-4 py-2.5 flex flex-wrap items-center gap-2 md:gap-3">
        <Link to="/AdminBusinessBuilder" className="text-sm text-slate-500 hover:text-slate-800 flex items-center gap-1"><ArrowLeft className="w-4 h-4" /> All Websites</Link>
        <span className="font-heading font-bold text-slate-900 truncate max-w-[200px]">{ov.tenant.name}</span>
        <Badge className={WORKFLOW_BADGE[ov.workflow_status]}>{WORKFLOW_LABELS[ov.workflow_status]}</Badge>
        <span className="text-sm text-slate-500 hidden sm:inline">Setup {ov.readiness.percent}%</span>
        {lastSavedAt && <span className="text-xs text-green-600 hidden lg:inline-flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Saved {lastSavedAt}</span>}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setTab('media')} className="hidden lg:inline-flex">Media Library</Button>
          <Button variant="outline" size="sm" onClick={() => { setTab('preview'); }}><Eye className="w-4 h-4 mr-1.5" /> Preview Website</Button>
          <Button size="sm" variant="outline" onClick={() => setInviteOpen(true)}><UserPlus className="w-4 h-4 mr-1.5" /> Invite Client</Button>
          <WorkflowActions overview={ov} onDone={load} primary />
          <ReviewActions overview={ov} onDone={load} />
          <Button variant="ghost" size="sm" className="hidden lg:inline-flex" onClick={() => setRailOpen(o => !o)} aria-label={railOpen ? 'Collapse preview' : 'Expand preview'}>
            {railOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Mobile: Edit / Preview segmented control */}
      <div className="lg:hidden bg-white border-b border-slate-200 px-4 py-2 flex gap-2">
        {['edit', 'preview'].map(v => (
          <button key={v} onClick={() => setMobileTab(v)}
            className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium ${mobileTab === v ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>
            {v === 'edit' ? 'Edit' : 'Preview'}
          </button>
        ))}
      </div>

      <div className="flex">
        {/* Left setup navigation */}
        <nav className={`bg-white border-r border-slate-200 w-56 flex-shrink-0 px-2 py-2 overflow-y-auto sticky top-[53px] self-start max-h-[calc(100vh-53px)] ${mobileTab === 'preview' ? 'hidden lg:block' : 'hidden lg:block'}`}>
          {MANAGER_NAV.map(n => (
            <button key={n.key} onClick={() => setTab(n.key)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${tab === n.key ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
              {n.label}
            </button>
          ))}
        </nav>

        {/* Center editor (desktop) / edit view (mobile) */}
        <main className={`flex-1 p-4 md:p-6 min-w-0 ${mobileTab === 'preview' ? 'hidden lg:block' : ''}`}>
          {editor()}
        </main>

        {/* Right live preview rail (desktop) */}
        {railOpen && (
          <aside className="hidden lg:block w-[460px] flex-shrink-0 border-l border-slate-200 bg-slate-50 p-4 overflow-y-auto sticky top-[53px] self-start max-h-[calc(100vh-53px)]">
            <LivePreviewRail websiteTenantId={tenantId} nonce={railNonce} />
          </aside>
        )}
      </div>

      {/* Mobile preview view */}
      {mobileTab === 'preview' && (
        <div className="lg:hidden p-3">
          <LivePreviewRail websiteTenantId={tenantId} nonce={railNonce} />
        </div>
      )}

      <InviteClientModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        tenantId={tenantId}
        companyName={(ov.company && ov.company.display_name) || ov.company.legal_name}
        websiteName={ov.tenant.name}
        onInvited={load}
      />
    </div>
  );
}