// LLBB Launch New Website wizard (Phase 4A — Part 3).
// 5 steps: Company → Management Mode → Template → Website Identity → Confirm.
// Creation goes ONLY through the certified provisioning function
// (provisionWebsiteTenant, created_via=llbb) — never raw client CRUD.
import React, { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Search, CheckCircle2, XCircle, ArrowLeft, ArrowRight, Rocket, Building2, LayoutTemplate, Ban, Globe } from 'lucide-react';

const MODES = [
  { id: 'admin_managed', title: 'Admin Managed', desc: 'The EstateSalen team builds and manages the website end to end.' },
  { id: 'client_managed', title: 'Client Managed', desc: 'The company manages its own website configuration.' },
  { id: 'collaborative', title: 'Collaborative', desc: 'Admin and company work on setup together.' }
];

const suggestSlug = (s) => (s || '').toLowerCase()
  .replace(/https?:\/\//g, '').replace(/[^a-z0-9\s._-]/g, '')
  .replace(/[\s._]+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '').slice(0, 63);

const STEPS = ['Company', 'Mode', 'Template', 'Identity', 'Confirm'];

export default function LaunchWizard({ open, onClose, onCreated }) {
  const [step, setStep] = useState(1);
  const [companies, setCompanies] = useState(null);
  const [q, setQ] = useState('');
  const [company, setCompany] = useState(null);
  const [mode, setMode] = useState('admin_managed');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugCheck, setSlugCheck] = useState(null);
  const [checking, setChecking] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const slugTouchedRef = useRef(false);

  const search = async () => {
    setCompanies(null); setCompany(null);
    try {
      const res = await base44.functions.invoke('llbbAdmin', { action: 'company_search', q });
      setCompanies(res.data.companies || []);
    } catch (e) { setCompanies([]); }
  };
  useEffect(() => { if (open) { setStep(1); setQ(''); setCompany(null); setMode('admin_managed'); setName(''); setSlug(''); setSlugCheck(null); setError(null); search(); } }, [open]);
  useEffect(() => { if (open) search(); }, [q]); // eslint-disable-line

  // Debounced slug availability check (server-authoritative).
  useEffect(() => {
    if (step !== 4 || !slug) { setSlugCheck(null); return; }
    let cancelled = false;
    setChecking(true);
    const t = setTimeout(async () => {
      try {
        const res = await base44.functions.invoke('llbbAdmin', { action: 'slug_check', slug });
        if (!cancelled) setSlugCheck(res.data);
      } catch (e) { if (!cancelled) setSlugCheck(null); }
      if (!cancelled) setChecking(false);
    }, 400);
    return () => { cancelled = true; clearTimeout(t); };
  }, [slug, step]);

  const pickCompany = (c) => {
    setCompany(c);
    setName(c.display_name || '');
    setSlug(suggestSlug(c.display_name || c.legal_name || ''));
    setSlugCheck(null);
  };

  const canNext = () => {
    if (step === 1) return !!company && company.can_launch;
    if (step === 2) return !!mode;
    if (step === 4) return name.trim().length >= 1 && !!slugCheck && slugCheck.available;
    return true;
  };

  const create = async () => {
    setCreating(true); setError(null);
    try {
      const res = await base44.functions.invoke('provisionWebsiteTenant', {
        action: 'provision', created_via: 'llbb',
        company_id: company.id, name: name.trim(), slug: slugCheck.normalized || slug,
        management_mode: mode,
        idempotency_key: `llbb-${company.id}-${Date.now()}`
      });
      onCreated(res.data.tenant);
    } catch (e) {
      const d = e.response && e.response.data && e.response.data.error;
      setError((d && (d.message || d.code)) || 'Provisioning failed. Please try again.');
      setCreating(false);
    }
  };

  const existingSite = company && !company.can_launch && (company.existing_tenants || []).find(t => t.status !== 'archived');

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Launch New Website</DialogTitle>
        </DialogHeader>
        {/* Step indicator */}
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-1.5">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center font-semibold ${step > i + 1 ? 'bg-green-100 text-green-700' : step === i + 1 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}>{i + 1}</span>
              <span className={step === i + 1 ? 'text-slate-900 font-medium' : 'text-slate-400'}>{s}</span>
              {i < STEPS.length - 1 && <span className="text-slate-300">→</span>}
            </div>
          ))}
        </div>

        {/* STEP 1 — Company */}
        {step === 1 && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search existing companies" className="pl-8" />
            </div>
            {!companies ? <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div> : (
              <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
                {companies.length === 0 && <div className="p-4 text-sm text-slate-500 text-center">No companies found.</div>}
                {companies.map((c) => (
                  <button key={c.id} onClick={() => pickCompany(c)}
                    className={`w-full text-left px-4 py-3 transition-colors ${company && company.id === c.id ? 'bg-slate-900 text-white' : 'hover:bg-slate-50'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium flex items-center gap-2"><Building2 className="w-3.5 h-3.5 opacity-60" />{c.display_name}</span>
                      {company && company.id === c.id && <CheckCircle2 className="w-4 h-4" />}
                    </div>
                    <div className={`text-xs mt-0.5 ${company && company.id === c.id ? 'text-slate-300' : 'text-slate-500'}`}>
                      {c.owner ? `Owner: ${c.owner.full_name || c.owner.email}` : 'No owner contact'}
                      {c.entitlement.allowed ? ` · Entitlement: ${c.entitlement.tier} (${c.entitlement.allowance === 'unlimited' ? 'unlimited' : c.entitlement.allowance})` : ' · No website entitlement'}
                      {c.live_tenant_count > 0 && ` · ${c.live_tenant_count} website${c.live_tenant_count === 1 ? '' : 's'}`}
                    </div>
                  </button>
                ))}
              </div>
            )}
            {company && !company.can_launch && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-center gap-2 font-medium text-amber-800"><Ban className="w-4 h-4" /> Website Already Exists</div>
                <p className="text-sm text-amber-700 mt-1">
                  {company.entitlement.allowed
                    ? `This Company's entitlement (${company.entitlement.tier}) allows ${company.entitlement.allowance} website${company.entitlement.allowance === 1 ? '' : 's'} and it is already in use.`
                    : 'This Company has no website entitlement.'}
                </p>
                {existingSite && (
                  <Button size="sm" variant="outline" className="mt-2" asChild>
                    <a href={`/WebsiteManager?tenant=${existingSite.id}`}>Open Website Manager</a>
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* STEP 2 — Management mode */}
        {step === 2 && (
          <div className="space-y-2">
            {MODES.map((m) => (
              <button key={m.id} onClick={() => setMode(m.id)}
                className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${mode === m.id ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900' : 'border-slate-200 hover:bg-slate-50'}`}>
                <div className="font-medium text-slate-900">{m.title}</div>
                <div className="text-sm text-slate-500">{m.desc}</div>
              </button>
            ))}
            <p className="text-xs text-slate-400 mt-2">Management mode controls workflow and UI access — it never bypasses server authorization.</p>
          </div>
        )}

        {/* STEP 3 — Template */}
        {step === 3 && (
          <div className="space-y-3">
            <div className="border-2 border-slate-900 rounded-lg p-4 bg-slate-50">
              <div className="flex items-center gap-2 font-medium text-slate-900"><LayoutTemplate className="w-4 h-4" /> Legacy Lane Classic</div>
              <div className="text-sm text-slate-500 mt-0.5">operator_template_1 · v1 — the certified estate-sale website template.</div>
              <div className="mt-3 rounded-md overflow-hidden border border-slate-200 bg-white">
                <div className="h-7 bg-amber-500" />
                <div className="p-3 space-y-2">
                  <div className="h-3 w-2/3 bg-slate-800 rounded" />
                  <div className="h-2 w-full bg-slate-200 rounded" />
                  <div className="h-2 w-5/6 bg-slate-200 rounded" />
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div className="h-10 bg-amber-100 rounded" /><div className="h-10 bg-slate-100 rounded" /><div className="h-10 bg-amber-100 rounded" />
                  </div>
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-400">Template selection is generically architected — additional platform templates register here in later phases.</p>
          </div>
        )}

        {/* STEP 4 — Identity */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Website Name</Label>
              <Input value={name} onChange={(e) => { setName(e.target.value); if (!slugTouchedRef.current) setSlug(suggestSlug(e.target.value)); }} placeholder="e.g. Smith Estate Sales" />
            </div>
            <div className="space-y-1">
              <Label>Platform Hostname</Label>
              <Input value={slug} onChange={(e) => { slugTouchedRef.current = true; setSlug(e.target.value); }} placeholder="smith-estate-sales" />
              <div className="flex items-center gap-2 text-sm mt-1">
                {checking && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
                {!checking && slugCheck && slugCheck.available && (
                  <span className="text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />
                    {slugCheck.hostname ? `${slugCheck.hostname} is available` : 'Available'}</span>
                )}
                {!checking && slugCheck && !slugCheck.available && (
                  <span className="text-red-600 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" />{slugCheck.reason || 'Not available'}</span>
                )}
              </div>
            </div>
            <p className="text-xs text-slate-400">Every website includes its EstateSalen platform hostname — a valid product website with no custom domain required. Uniqueness is enforced server-side.</p>
          </div>
        )}

        {/* STEP 5 — Confirm */}
        {step === 5 && (
          <div className="space-y-3">
            <div className="rounded-lg border border-slate-200 divide-y divide-slate-100 text-sm">
              {[
                ['Company', company && (company.display_name || company.legal_name)],
                ['Management Mode', MODES.find(m => m.id === mode)?.title],
                ['Template', 'Legacy Lane Classic (operator_template_1 v1)'],
                ['Website Name', name.trim()],
                ['Platform Hostname', (slugCheck && slugCheck.hostname) || `${suggestSlug(slug)}.estatesalen.com`],
                ['Entitlement', company && company.entitlement.tier],
                ['Initial State', 'Draft (not publicly accessible)']
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 px-4 py-2.5">
                  <span className="text-slate-500">{k}</span>
                  <span className="font-medium text-slate-900 text-right truncate">{v || '—'}</span>
                </div>
              ))}
            </div>
            {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}
          </div>
        )}

        {/* Nav buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <Button variant="ghost" size="sm" disabled={step === 1 || creating} onClick={() => setStep(s => s - 1)}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
          {step < 5
            ? <Button size="sm" disabled={!canNext()} onClick={() => setStep(s => s + 1)}>Continue <ArrowRight className="w-4 h-4 ml-1" /></Button>
            : <Button size="sm" disabled={creating} onClick={create}>{creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Rocket className="w-4 h-4 mr-2" />} Create Draft Website</Button>}
        </div>
      </DialogContent>
    </Dialog>
  );
}