// Phase 4F (Part 48) — "Build My Website For Me" onboarding interview.
// Radio-first questions with a short optional story. Answers form a STRUCTURED
// input (never free-text into the AI prompt directly); generation runs through
// the llbbAiBuilder server seam and lands as an editable draft — never
// published automatically. AI failing never blocks the website (fallbacks).
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import AiBuildResult from '@/components/llbb/AiBuildResult';
import { Sparkles, ArrowLeft, ArrowRight, Loader2, Check, AlertTriangle, User, Users, Award, ClipboardCheck } from 'lucide-react';

// Matches the server-side controlled vocabulary (llbbAiContent.ts).
const SERVICES = [
  { key: 'estate_sales', label: 'Estate Sales' },
  { key: 'online_estate_sales', label: 'Online Estate Sales' },
  { key: 'downsizing', label: 'Downsizing' },
  { key: 'senior_transitions', label: 'Senior Transitions' },
  { key: 'cleanouts', label: 'Cleanouts' },
  { key: 'consignment', label: 'Consignment' },
  { key: 'valuation', label: 'Valuation' },
  { key: 'real_estate', label: 'Real Estate Services' },
  { key: 'moving', label: 'Moving Assistance' },
  { key: 'donation_coordination', label: 'Donation Coordination' },
  { key: 'buyouts', label: 'Buyouts' },
  { key: 'probate_assistance', label: 'Probate Assistance' }
];
const SITUATIONS = [
  { key: 'family_estate_settlement', label: 'Family estate settlement' },
  { key: 'probate', label: 'Probate' },
  { key: 'downsizing', label: 'Downsizing' },
  { key: 'senior_transition', label: 'Senior transition' },
  { key: 'moving', label: 'Moving' },
  { key: 'divorce_transition', label: 'Divorce / household transition' },
  { key: 'cleanout', label: 'Cleanout' },
  { key: 'inherited_property', label: 'Inherited property' },
  { key: 'selling_a_home', label: 'Selling a home' },
  { key: 'collectors', label: 'Collectors' },
  { key: 'other', label: 'Other' }
];
const DIFFERENTIATORS = [
  { key: 'local_experience', label: 'Local experience' },
  { key: 'compassionate_service', label: 'Compassionate service' },
  { key: 'full_service', label: 'Full-service approach' },
  { key: 'fast_turnaround', label: 'Fast turnaround' },
  { key: 'strong_marketing', label: 'Strong marketing' },
  { key: 'professional_inventory', label: 'Professional inventory' },
  { key: 'buyer_network', label: 'Large buyer network' },
  { key: 'real_estate_expertise', label: 'Real estate expertise' },
  { key: 'cleanout_coordination', label: 'Cleanout coordination' },
  { key: 'donation_coordination', label: 'Donation coordination' },
  { key: 'online_marketing', label: 'Online marketing' },
  { key: 'transparent_communication', label: 'Transparent communication' }
];
const YEARS_OPTIONS = [
  { key: 'under_5', label: 'Less than 5 years', value: null },
  { key: '5_10', label: '5–10 years', value: '5-10 years' },
  { key: '10_20', label: '10–20 years', value: '10-20 years' },
  { key: '20_plus', label: '20+ years', value: '20+ years' },
  { key: 'prefer_not', label: 'Rather not say', value: null }
];
const CREDENTIAL_OPTIONS = ['licensed', 'insured', 'bonded', 'certified', 'realtor', 'broker'];
const STEP_TITLES = ['Your business', 'Your services', 'Who you help', 'What makes you different', 'Your story & review'];
const STEP_ICONS = [User, Sparkles, Users, Award, ClipboardCheck];

function initialInterview(settings, company) {
  const biz = (settings && settings.business) || {};
  const existingServices = ((settings && settings.services && settings.services.items) || [])
    .map(i => i.library_key).filter(Boolean);
  return {
    owner_name: biz.owner_name || '',
    primary_city: biz.primary_city || '',
    primary_state: '',
    counties_served: (biz.counties_served || []).join(', '),
    services: existingServices.length ? existingServices : ['estate_sales'],
    situations: [],
    differentiators: [],
    tone: 'warm',
    years_key: 'prefer_not',
    verified_credentials: [],
    story: { started: '', helping: '', why: '', families_know: '', anything_else: '' }
  };
}

export default function AiWebsiteBuilderPanel({ websiteTenantId, settings, company, onSaved, onNavigate }) {
  const prov = (settings && settings.ai_provenance) || null;
  const [view, setView] = useState(prov ? 'studio' : 'intro');
  const [iv, setIv] = useState(() => initialInterview(settings, company));
  const [step, setStep] = useState(0);
  const [building, setBuilding] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const toggle = (list, key) => setIv(s => ({
    ...s, [list]: s[list].includes(key) ? s[list].filter(x => x !== key) : [...s[list], key]
  }));

  const build = async (mode) => {
    setBuilding(true); setError(null);
    const years = YEARS_OPTIONS.find(y => y.key === iv.years_key);
    const payload = {
      action: mode === 'starter' ? 'apply_starter' : 'generate',
      website_tenant_id: websiteTenantId,
      request_id: `ai_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      interview: {
        tone: iv.tone,
        services: iv.services,
        situations: iv.situations,
        differentiators: iv.differentiators,
        primary_city: iv.primary_city,
        primary_state: iv.primary_state,
        counties_served: iv.counties_served.split(',').map(x => x.trim()).filter(Boolean),
        owner_name: iv.owner_name,
        years_experience: years ? years.value : null,
        verified_credentials: iv.verified_credentials,
        story: iv.story,
        use_company_phone: true,
        use_company_email: true
      }
    };
    try {
      const res = await base44.functions.invoke('llbbAiBuilder', payload);
      const d = res.data || {};
      if (d.status === 'ready') {
        setResult(d);
        setView('studio');
        if (onSaved) onSaved();
      } else {
        setView('failed');
        setError(null);
      }
    } catch (e) {
      setView('failed');
    }
    setBuilding(false);
  };

  // ── Intro view ──────────────────────────────────────────────────────────────
  if (view === 'intro') {
    return (
      <div className="max-w-3xl space-y-4">
        <div className="bg-white rounded-lg border border-cyan-200 overflow-hidden">
          <div className="px-5 py-4 bg-cyan-50 flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-cyan-700" />
            <div className="font-heading font-bold text-slate-900">Build My Website For Me</div>
          </div>
          <div className="p-5 space-y-4">
            <p className="text-sm text-slate-700">Answer a few short questions — mostly multiple choice — and AI writes a professional first draft of your homepage, about page, services, FAQ and SEO. You review and edit every word. Only facts you provide are ever used, and nothing is published automatically.</p>
            <ul className="text-sm text-slate-600 space-y-1.5">
              <li className="flex gap-2"><Check className="w-4 h-4 text-green-600 mt-0.5" /> Takes about 3 minutes</li>
              <li className="flex gap-2"><Check className="w-4 h-4 text-green-600 mt-0.5" /> Drafts only professional, claim-safe content</li>
              <li className="flex gap-2"><Check className="w-4 h-4 text-green-600 mt-0.5" /> You keep your previous version — undo anytime</li>
            </ul>
            <div className="flex flex-wrap gap-2">
              <Button className="bg-cyan-600 hover:bg-cyan-700 text-white" onClick={() => setView('interview')}>
                Start the interview <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
              <Button variant="outline" onClick={() => onNavigate('overview')}>Continue manually</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Building view ───────────────────────────────────────────────────────────
  if (building) {
    return (
      <div className="max-w-3xl">
        <div className="bg-white rounded-lg border border-cyan-200 p-10 text-center">
          <Loader2 className="w-8 h-8 text-cyan-600 animate-spin mx-auto mb-3" />
          <div className="font-heading font-bold text-slate-900">Building your website draft…</div>
          <p className="text-sm text-slate-500 mt-1">This usually takes under a minute. Keep this page open.</p>
        </div>
      </div>
    );
  }

  // ── Failed view (AI unavailable — the website is never blocked) ─────────────
  if (view === 'failed') {
    return (
      <div className="max-w-3xl">
        <div className="bg-white rounded-lg border border-amber-300 p-8 text-center">
          <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
          <div className="font-heading font-bold text-slate-900">AI drafting couldn't finish right now</div>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">Your website is completely fine — no content was changed. You can try again, start from professionally written starter content, or keep editing manually.</p>
          <div className="flex flex-wrap gap-2 justify-center mt-4">
            <Button className="bg-cyan-600 hover:bg-cyan-700 text-white" onClick={() => setView('interview')}>Try again</Button>
            <Button variant="outline" onClick={() => build('starter')}>Use starter content</Button>
            <Button variant="ghost" onClick={() => onNavigate('overview')}>Continue manually</Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Studio result view ──────────────────────────────────────────────────────
  if (view === 'studio') {
    return (
      <AiBuildResult
        websiteTenantId={websiteTenantId}
        settings={settings}
        result={result}
        onSaved={onSaved}
        onNavigate={onNavigate}
        onRebuild={() => setView('interview')}
      />
    );
  }

  // ── Interview ───────────────────────────────────────────────────────────────
  const canNext = () => {
    if (step === 0) return (iv.primary_city || iv.counties_served).trim().length > 0;
    if (step === 1) return iv.services.length > 0;
    return true;
  };

  const ChoiceGrid = ({ list, selected, onToggle, max }) => (
    <div className="grid sm:grid-cols-2 gap-2">
      {list.map(o => {
        const on = selected.includes(o.key);
        return (
          <button key={o.key} type="button" onClick={() => onToggle(o.key)}
            className={`text-left px-3.5 py-2.5 rounded-md border text-sm transition-colors flex items-center justify-between gap-2 ${on ? 'border-cyan-500 bg-cyan-50 text-cyan-900 font-medium' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}>
            {o.label}
            {on && <Check className="w-4 h-4 text-cyan-600 flex-shrink-0" />}
          </button>
        );
      })}
    </div>
  );

  const stepContent = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Your name</label>
                <Input value={iv.owner_name} onChange={(e) => setIv(s => ({ ...s, owner_name: e.target.value }))} placeholder="e.g. Maria" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">City you work from</label>
                <Input value={iv.primary_city} onChange={(e) => setIv(s => ({ ...s, primary_city: e.target.value }))} placeholder="e.g. Austin" />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">State</label>
                <Input value={iv.primary_state} onChange={(e) => setIv(s => ({ ...s, primary_state: e.target.value }))} placeholder="e.g. TX" maxLength={20} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Counties you serve</label>
                <Input value={iv.counties_served} onChange={(e) => setIv(s => ({ ...s, counties_served: e.target.value }))} placeholder="Comma-separated, e.g. Travis, Williamson" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">How long have you been doing this?</label>
              <div className="grid sm:grid-cols-2 gap-2">
                {YEARS_OPTIONS.map(o => (
                  <button key={o.key} type="button" onClick={() => setIv(s => ({ ...s, years_key: o.key }))}
                    className={`px-3.5 py-2.5 rounded-md border text-sm text-left ${iv.years_key === o.key ? 'border-cyan-500 bg-cyan-50 text-cyan-900 font-medium' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Credentials you actually hold</label>
              <p className="text-xs text-slate-400">Only check what's true — checked credentials may appear on your website.</p>
              <div className="grid sm:grid-cols-3 gap-2">
                {CREDENTIAL_OPTIONS.map(c => (
                  <button key={c} type="button" onClick={() => toggle('verified_credentials', c)}
                    className={`px-3 py-2 rounded-md border text-sm capitalize ${iv.verified_credentials.includes(c) ? 'border-cyan-500 bg-cyan-50 text-cyan-900 font-medium' : 'border-slate-200 bg-white text-slate-700'}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">Choose everything you offer — a service page is drafted for each.</p>
            <ChoiceGrid list={SERVICES} selected={iv.services} onToggle={(k) => toggle('services', k)} />
          </div>
        );
      case 2:
        return (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">Pick the situations you help families with most.</p>
            <ChoiceGrid list={SITUATIONS} selected={iv.situations} onToggle={(k) => toggle('situations', k)} />
          </div>
        );
      case 3:
        return (
          <div className="space-y-5">
            <div className="space-y-3">
              <p className="text-sm text-slate-500">What should families know about working with you? Pick up to 4.</p>
              <ChoiceGrid list={DIFFERENTIATORS} selected={iv.differentiators} onToggle={(k) => toggle('differentiators', k)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Overall tone for your website copy</label>
              <div className="grid sm:grid-cols-3 gap-2">
                {[
                  { key: 'warm', label: 'Warm & compassionate' },
                  { key: 'professional', label: 'Professional' },
                  { key: 'friendly', label: 'Friendly & local' },
                  { key: 'elegant', label: 'Elegant & upscale' },
                  { key: 'modern', label: 'Modern & clean' },
                  { key: 'bold', label: 'Bold & energetic' }
                ].map(t => (
                  <button key={t.key} type="button" onClick={() => setIv(s => ({ ...s, tone: t.key }))}
                    className={`px-3 py-2.5 rounded-md border text-sm ${iv.tone === t.key ? 'border-cyan-500 bg-cyan-50 text-cyan-900 font-medium' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}>
                    {t.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400">Tone also picks a matching, accessible color style you can change anytime in Branding.</p>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">Optional — one or two sentences on any of these make the draft feel like you. Plain language is perfect.</p>
            {[
              ['started', 'How did you get started?'],
              ['helping', 'Who do you help most?'],
              ['why', 'Why do you love this work?'],
              ['anything_else', 'Anything else you want mentioned?']
            ].map(([key, label]) => (
              <div key={key} className="space-y-1">
                <label className="text-sm font-medium text-slate-700">{label}</label>
                <Textarea rows={2} value={iv.story[key]} onChange={(e) => setIv(s => ({ ...s, story: { ...s.story, [key]: e.target.value } }))} />
              </div>
            ))}
            <div className="border-t border-slate-100 pt-3">
              <div className="text-sm font-semibold text-slate-700 mb-1.5">Review</div>
              <div className="flex flex-wrap gap-1.5">
                <Badge className="bg-slate-100 text-slate-700">{(company && (company.display_name || company.legal_name)) || 'Your company'}</Badge>
                {iv.primary_city && <Badge className="bg-slate-100 text-slate-700">{iv.primary_city}{iv.primary_state ? `, ${iv.primary_state}` : ''}</Badge>}
                {iv.services.map(k => <Badge key={k} className="bg-cyan-50 text-cyan-800 border border-cyan-200">{(SERVICES.find(s => s.key === k) || {}).label || k}</Badge>)}
              </div>
              <p className="text-xs text-slate-400 mt-2">When you confirm, AI drafts your homepage, about page, services, FAQ and SEO. Nothing is published automatically, and your current content is kept in version history.</p>
            </div>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="max-w-3xl space-y-4">
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {/* Step header */}
        <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-3">
          {STEP_ICONS.map((Icon, i) => (
            <div key={i} className={`flex items-center gap-1.5 text-xs font-medium ${i === step ? 'text-cyan-700' : i < step ? 'text-slate-400' : 'text-slate-300'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center ${i === step ? 'bg-cyan-600 text-white' : i < step ? 'bg-slate-200 text-slate-600' : 'bg-slate-100'}`}><Icon className="w-3.5 h-3.5" /></span>
              <span className="hidden sm:inline">{STEP_TITLES[i]}</span>
            </div>
          ))}
          <span className="ml-auto text-xs text-slate-400">Step {step + 1} of 5</span>
        </div>
        <div className="p-5">{stepContent()}</div>
        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
          <Button variant="ghost" onClick={() => (step === 0 ? setView(prov ? 'studio' : 'intro') : setStep(step - 1))}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          {step < 4 ? (
            <Button className="bg-cyan-600 hover:bg-cyan-700 text-white" disabled={!canNext()} onClick={() => setStep(step + 1)}>
              Next <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button className="bg-cyan-600 hover:bg-cyan-700 text-white" onClick={() => build('generate')}>
              <Sparkles className="w-4 h-4 mr-1" /> Confirm & build
            </Button>
          )}
        </div>
      </div>
      <button type="button" onClick={() => build('starter')} className="text-xs text-slate-400 hover:text-slate-600 underline">
        Skip AI — use professionally written starter content instead
      </button>
    </div>
  );
}