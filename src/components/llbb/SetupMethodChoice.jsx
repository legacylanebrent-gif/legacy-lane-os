// Phase 4F (Part 3, Pilot #1 P1 repair) — first setup-method decision screen.
// Reuses the certified 4F interview (tab 'ai_build') and the existing Setup
// Studio (tab 'business'). Never auto-selects a mode; never discards content.
// Choice remembered per website (localStorage) and reported to the pilot
// program only as analytics (operator_signal, non-blocking).
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowRight, Check, Wrench, RotateCcw } from 'lucide-react';

const METHOD_KEY = (tenantId) => `llbbSetupMethod_${tenantId}`;
const METHOD_LABELS = { ai_build: 'Guided Website Builder', self_custom: 'Manual Setup' };

export default function SetupMethodChoice({ websiteTenantId, inPilot, onNavigate }) {
  const [stored] = useState(() => {
    try { return localStorage.getItem(METHOD_KEY(websiteTenantId)) || null; } catch { return null; }
  });

  const pick = (method) => {
    try { localStorage.setItem(METHOD_KEY(websiteTenantId), method); } catch { /* preference only */ }
    if (inPilot) {
      base44.functions.invoke('llbbPilot', {
        action: 'operator_signal', website_tenant_id: websiteTenantId,
        kind: 'setup_choice', value: method
      }).catch(() => { /* analytics never blocks setup */ });
    }
    onNavigate(method === 'ai_build' ? 'ai_build' : 'business');
  };

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <div className="text-xs font-semibold tracking-widest text-slate-400 uppercase">Setup method</div>
        <h1 className="font-heading text-2xl font-bold text-slate-900 mt-0.5">Choose how you want to get started</h1>
        <p className="text-sm text-slate-500 mt-1">You can switch methods anytime before submitting for review — nothing is lost.</p>
      </div>

      {stored && METHOD_LABELS[stored] && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg px-4 py-2.5">
          <span className="text-slate-500">You previously chose</span>
          <span className="font-semibold text-slate-800">{METHOD_LABELS[stored]}</span>
          <span className="text-slate-400">— continuing or switching is up to you.</span>
        </div>
      )}

      {/* Option A — primary */}
      <div className="bg-white rounded-xl border-2 border-cyan-500 overflow-hidden">
        <div className="px-5 py-4 bg-cyan-50 flex flex-wrap items-center gap-3">
          <Sparkles className="w-6 h-6 text-cyan-700 flex-shrink-0" />
          <div className="flex-1 min-w-[180px]">
            <div className="font-heading text-lg font-bold text-slate-900">Build My Website For Me</div>
            <span className="inline-block mt-1 text-[11px] font-bold uppercase tracking-wide bg-cyan-600 text-white rounded-full px-2.5 py-0.5">Recommended</span>
          </div>
          <span className="text-xs font-semibold text-cyan-800 bg-cyan-100 rounded-full px-3 py-1">15–30 minutes</span>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-700">Answer a few questions about your company and we'll create the first version of your website for you. You can review and change anything before it goes live.</p>
          <ul className="text-sm text-slate-600 space-y-1.5">
            <li className="flex gap-2"><Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /> We'll use your existing business information.</li>
            <li className="flex gap-2"><Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /> You'll choose your services and style.</li>
            <li className="flex gap-2"><Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /> We'll create your starting content.</li>
            <li className="flex gap-2"><Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" /> Nothing goes live until you approve it.</li>
          </ul>
          <Button className="w-full sm:w-auto h-11 px-6 bg-cyan-600 hover:bg-cyan-700 text-white text-base" onClick={() => pick('ai_build')}>
            <Sparkles className="w-4 h-4 mr-1.5" /> Build My Website
          </Button>
          {stored === 'self_custom' && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">Switching to the guided builder may replace content you edited manually — you'll be asked to confirm each section, and your previous version is always kept.</p>
          )}
        </div>
      </div>

      {/* Option B — secondary */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 flex items-center gap-3">
          <Wrench className="w-5 h-5 text-slate-500 flex-shrink-0" />
          <div className="flex-1 min-w-[180px]">
            <div className="font-heading font-bold text-slate-900">I'll Customize It Myself</div>
            <p className="text-sm text-slate-500 mt-0.5">Prefer to control each section yourself? Start with the full Website Setup Studio.</p>
          </div>
        </div>
        <div className="px-5 pb-5">
          <Button variant="outline" className="w-full sm:w-auto h-11 px-6 border-slate-300 text-slate-700" onClick={() => pick('self_custom')}>
            Customize Manually <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      </div>

      {stored === 'ai_build' && (
        <button type="button" onClick={() => onNavigate('ai_build')} className="text-sm text-cyan-700 hover:underline inline-flex items-center gap-1.5">
          <RotateCcw className="w-3.5 h-3.5" /> Continue where you left off in the guided builder
        </button>
      )}
    </div>
  );
}