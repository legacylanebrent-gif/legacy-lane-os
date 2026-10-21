// Chapter 7 P2 — OPERATOR WEBSITE GA BRIDGE.
// The smallest safe bridge from an eligible EstateSalen operator to the
// existing Business Builder website architecture. NO new website platform:
// provisioning goes through the certified provisionWebsiteTenant seam
// (company membership + entitlement enforced server-side), editing through
// the existing Website Studio, launch through the new operator launch
// action on the platform subdomain. Custom domain stays a later step.
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, Globe, Rocket, ExternalLink, CheckCircle2, Circle, AlertTriangle } from 'lucide-react';
import { WORKFLOW_LABELS, WORKFLOW_BADGE } from '@/components/llbb/managerConfig';

const SETUP_STEPS = [
  { key: 'business', label: 'Company', desc: 'Canonical business identity and contact facts' },
  { key: 'branding', label: 'Brand', desc: 'Logo, colors, typography' },
  { key: 'services', label: 'Services', desc: 'What your company offers' },
  { key: 'about', label: 'About / Value Proposition', desc: 'Your story and why families choose you' },
  { key: 'faq', label: 'FAQ', desc: 'Answer the questions sellers actually ask' },
  { key: 'contact_social', label: 'Contact + Seller Inquiry', desc: 'How sellers reach you and the inquiry form' },
  { key: 'estate_sales', label: 'Sale Feed', desc: 'Your published sales appear automatically' },
  { key: 'preview', label: 'Preview', desc: 'See the site privately before it is live' },
];

export default function MyWebsite() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [deniedCode, setDeniedCode] = useState(null);
  const [deniedMsg, setDeniedMsg] = useState(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [createError, setCreateError] = useState(null);
  const [launching, setLaunching] = useState(false);
  const [blockers, setBlockers] = useState(null);

  const load = async () => {
    try {
      const res = await base44.functions.invoke('websiteCollab', { action: 'my_website' });
      setData(res.data);
      setDeniedCode(null);
      if (res.data && res.data.company) {
        const c = res.data.company;
        setName(n => n || (c.display_name || c.legal_name || 'My Company Website'));
      }
    } catch (e) {
      const d = e.response && e.response.data && e.response.data.error;
      setDeniedCode(d ? d.code : 'error');
      setDeniedMsg(d ? d.message : 'Could not load your website.');
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const slugify = (v) => String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

  const createWebsite = async () => {
    setCreating(true); setCreateError(null);
    try {
      await base44.functions.invoke('provisionWebsiteTenant', {
        action: 'provision',
        created_via: 'llbb',
        management_mode: 'client_managed',
        name: name.trim(),
        slug: slugify(slug || name),
        idempotency_key: `ga-${Date.now()}`
      });
      await load();
    } catch (e) {
      const d = e.response && e.response.data && e.response.data.error;
      setCreateError(d ? (d.message || d.code) : 'Could not create the website.');
    }
    setCreating(false);
  };

  const launch = async () => {
    setLaunching(true); setBlockers(null);
    try {
      await base44.functions.invoke('websiteCollab', { action: 'launch_website', website_tenant_id: data.website.id });
      await load();
    } catch (e) {
      const d = e.response && e.response.data && e.response.data.error;
      if (d && d.blockers) setBlockers(d.blockers);
      else setBlockers([{ label: 'Launch failed', reason: (d && d.message) || 'Try again.' }]);
    }
    setLaunching(false);
  };

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="w-7 h-7 animate-spin text-slate-400" /></div>;

  // No website yet — the CREATE MY WEBSITE entry point.
  if (!data || deniedCode === 'no_website') {
    return (
      <div className="p-4 md:p-8 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-1">
          <Globe className="w-6 h-6 text-cyan-700" />
          <h1 className="text-2xl font-heading font-bold text-slate-900">Your Company Website</h1>
        </div>
        <p className="text-slate-600 mb-6">
          Launch a professional website for your estate sale company. It starts from your company profile and
          service catalog — no re-entering information — and goes live on an EstateSalen web address you can
          share right away. A custom domain can be connected later.
        </p>
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Website name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your company name" className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Web address</label>
            <div className="flex items-center gap-2 mt-1">
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder={slugify(name) || 'your-company'} className="flex-1" />
              <span className="text-sm text-slate-500 whitespace-nowrap">.estatesalen.com</span>
            </div>
          </div>
          {createError && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-800">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" /><span>{createError}</span>
            </div>
          )}
          <Button onClick={createWebsite} disabled={creating || !name.trim()} className="w-full">
            {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Rocket className="w-4 h-4 mr-2" />}
            Create My Website
          </Button>
          <p className="text-xs text-slate-500">
            Setup starts as a private draft — nothing is public until you launch it, and your data stays in your
            EstateSalen records.
          </p>
        </div>
      </div>
    );
  }

  if (deniedCode) {
    const needCompany = deniedCode === 'no_company_membership' || deniedCode === 'company_not_found';
    const needPlan = !!deniedCode && deniedCode.includes('entitlement');
    return (
      <div className="p-4 md:p-8 max-w-xl mx-auto">
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <h1 className="text-xl font-heading font-bold text-slate-900 mb-2">Your Company Website</h1>
          <p className="text-slate-600 text-sm">
            {needCompany && 'Your account needs a verified company profile before you can create a website. Complete your company information in your profile, then come back.'}
            {needPlan && 'Website setup requires an active subscription that includes a company website. Once your plan includes it, this page becomes your website setup.'}
            {!needCompany && !needPlan && (deniedMsg || 'Website setup is not available right now.')}
          </p>
        </div>
      </div>
    );
  }

  const w = data.website;
  const workflow = w.workflow_status;
  const isLive = workflow === 'live';
  const domainInfo = data.domains || {};
  const platformDomain = domainInfo.platform_hostname
    ? { hostname: domainInfo.platform_hostname, status: domainInfo.platform_status }
    : null;
  const readiness = data.readiness || { percent: 0, blockers: [] };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Globe className="w-6 h-6 text-cyan-700" />
        <h1 className="text-2xl font-heading font-bold text-slate-900">{w.name}</h1>
        <Badge className={WORKFLOW_BADGE[workflow]}>{WORKFLOW_LABELS[workflow]}</Badge>
        <span className="text-sm text-slate-500">Setup {readiness.percent}%</span>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/ClientWebsiteManager">Open Website Studio</Link>
          </Button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="font-semibold text-slate-900 mb-1">Your web address</div>
        {platformDomain ? (
          <div className="flex flex-wrap items-center gap-3">
            <code className="text-cyan-800 font-semibold">{platformDomain.hostname}</code>
            {isLive ? (
              <a href={`https://${platformDomain.hostname}`} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-cyan-700 font-medium hover:underline">
                Visit live site <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ) : (
              <span className="text-sm text-slate-500">Goes live here the moment you launch — private until then.</span>
            )}
          </div>
        ) : <p className="text-slate-500 text-sm">No platform address yet.</p>}
        <p className="text-xs text-slate-500 mt-2">
          A custom domain (like yourcompany.com) can be connected later from the Studio's Domain tab — it is never
          required to launch.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="font-semibold text-slate-900 mb-3">Setup steps — everything starts from your records</div>
        <div className="grid gap-2">
          {SETUP_STEPS.map(s => (
            <Link key={s.key} to={`/ClientWebsiteManager?tenant=${w.id}&tab=${s.key}`}
              className="flex items-start gap-3 rounded-md border border-slate-100 hover:border-cyan-300 hover:bg-cyan-50/40 p-3 transition-colors">
              <Circle className="w-4 h-4 text-slate-300 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-sm font-medium text-slate-800">{s.label}</div>
                <div className="text-xs text-slate-500">{s.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {blockers && blockers.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-2 font-medium text-amber-800 mb-2"><AlertTriangle className="w-4 h-4" /> Finish these first</div>
          <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
            {blockers.map((b, i) => <li key={i}>{b.label}{b.reason ? ` — ${b.reason}` : ''}</li>)}
          </ul>
        </div>
      )}

      {isLive ? (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-4 text-green-800 text-sm">
          <CheckCircle2 className="w-5 h-5" /> Your website is live. Publish sales and they appear automatically.
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={launch} disabled={launching}>
            {launching ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Rocket className="w-4 h-4 mr-2" />}
            Launch on {platformDomain ? platformDomain.hostname : 'my web address'}
          </Button>
          <span className="text-sm text-slate-500">Required setup items must be complete — the launch checks them for you.</span>
        </div>
      )}
    </div>
  );
}