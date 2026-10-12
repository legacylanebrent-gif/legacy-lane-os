// Phase 4F (Parts 48/49) — AI studio result view: what the AI wrote, factual
// confirmation, per-section regeneration (human edits protected), and version
// history / restore. Presented in plain product language — provenance details
// are never shown as technical metadata.
import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertTriangle, ShieldCheck, History, RotateCcw, Loader2, ArrowRight, Sparkles, Pencil, Lock, Undo2, Eye } from 'lucide-react';

const AI_SECTIONS = [
  { key: 'hero', label: 'Hero & Homepage', tab: 'homepage' },
  { key: 'about', label: 'About page', tab: 'about' },
  { key: 'services', label: 'Services', tab: 'services' },
  { key: 'faq', label: 'FAQ', tab: 'faq' },
  { key: 'seo', label: 'SEO', tab: 'seo' }
];

const ORIGIN_LABELS = {
  ai_generation: 'AI version', human_edit: 'Manual save', restore: 'Restore point'
};

export default function AiBuildResult({ websiteTenantId, settings, result, onSaved, onNavigate, onRebuild }) {
  const prov = (settings && settings.ai_provenance) || {};
  const facts = prov.factual_inputs || {};
  const confirmed = prov.factual_confirmation && prov.factual_confirmation.confirmed;
  const [regenBusy, setRegenBusy] = useState(null);
  const [confirmSection, setConfirmSection] = useState(null);
  const [versions, setVersions] = useState([]);
  const [restoring, setRestoring] = useState(null);
  const [factsBusy, setFactsBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  const loadVersions = async () => {
    try {
      const res = await base44.functions.invoke('llbbAiBuilder', { action: 'versions', website_tenant_id: websiteTenantId });
      setVersions((res.data && res.data.versions) || []);
    } catch (e) { /* version history is optional */ }
  };
  useEffect(() => { loadVersions(); }, [websiteTenantId]); // eslint-disable-line

  const regenerate = async (section, force) => {
    setRegenBusy(section); setNotice(null);
    try {
      const res = await base44.functions.invoke('llbbAiBuilder', {
        action: 'regenerate_section', website_tenant_id: websiteTenantId,
        request_id: `ai_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        section, confirm_human_overwrite: force === true
      });
      if (res.data && res.data.needs_confirm) setConfirmSection(section);
      else { setConfirmSection(null); if (onSaved) onSaved(); }
    } catch (e) {
      setNotice('AI could not rewrite that section right now. You can try again or edit it manually.');
    }
    setRegenBusy(null);
  };

  const confirmFacts = async () => {
    setFactsBusy(true);
    try {
      await base44.functions.invoke('llbbAiBuilder', { action: 'confirm_facts', website_tenant_id: websiteTenantId });
      if (onSaved) onSaved();
    } catch (e) { /* stays pending; retry available */ }
    setFactsBusy(false);
  };

  const restore = async (version) => {
    setRestoring(version.id);
    try {
      await base44.functions.invoke('llbbAiBuilder', {
        action: 'restore_version', website_tenant_id: websiteTenantId, version_id: version.id
      });
      if (onSaved) onSaved();
      loadVersions();
    } catch (e) {
      setNotice('Restore failed. Please try again.');
    }
    setRestoring(null);
  };

  const FactRow = ({ label, value }) => (
    <div className="flex flex-wrap justify-between gap-2 py-1.5 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-900 text-right">{value}</span>
    </div>
  );

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Ready banner */}
      <div className="bg-white rounded-lg border border-cyan-200 overflow-hidden">
        <div className="px-5 py-4 bg-cyan-50 flex flex-wrap items-center gap-3">
          <Sparkles className="w-5 h-5 text-cyan-700" />
          <div className="flex-1 min-w-[200px]">
            <div className="font-heading font-bold text-slate-900">Your AI draft is in</div>
            <p className="text-sm text-slate-600">Every word below is a suggestion you own — open any editor and change it freely. Nothing has been published.</p>
          </div>
          {result && result.rejected_fields && result.rejected_fields.length > 0 && (
            <Badge className="bg-amber-100 text-amber-800 border border-amber-200">
              {result.rejected_fields.length} item{result.rejected_fields.length === 1 ? '' : 's'} fell back to safe starter copy
            </Badge>
          )}
        </div>
        <div className="px-5 py-3 border-b border-slate-100 bg-white flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => onNavigate('preview')}><Eye className="w-3.5 h-3.5" /> Preview Website</Button>
          <Button variant="ghost" size="sm" className="text-cyan-700" onClick={() => onNavigate('overview')}>Continue Setup <ArrowRight className="w-3.5 h-3.5" /></Button>
        </div>
        <div className="p-5 grid sm:grid-cols-2 gap-3">
          {AI_SECTIONS.map(s => (
            <div key={s.key} className="border border-slate-200 rounded-md p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-800 mb-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" /> {s.label}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => onNavigate(s.tab)}>
                  <Pencil className="w-3.5 h-3.5" /> Review & edit
                </Button>
                {regenBusy === s.key ? (
                  <Button variant="outline" size="sm" disabled><Loader2 className="w-3.5 h-3.5 animate-spin" /> Rewriting…</Button>
                ) : confirmSection === s.key ? (
                  <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => regenerate(s.key, true)}>
                    <AlertTriangle className="w-3.5 h-3.5" /> Replace my edits?
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" className="text-cyan-700" onClick={() => regenerate(s.key)}>
                    <RotateCcw className="w-3.5 h-3.5" /> Regenerate
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {notice && (
        <div className="bg-amber-50 border border-amber-200 rounded-md px-4 py-2.5 text-sm text-amber-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {notice}
        </div>
      )}

      {/* Factual confirmation (Part 36) */}
      {!confirmed && (
        <div className="bg-white rounded-lg border border-amber-300 overflow-hidden">
          <div className="px-5 py-3 bg-amber-50 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-semibold text-amber-900">Confirm the facts used in your draft</span>
          </div>
          <div className="p-5">
            <p className="text-sm text-slate-600 mb-2">Only what you told us appears on your website. Please confirm this is accurate:</p>
            <FactRow label="Business name" value={facts.business_name || '—'} />
            <FactRow label="Phone shown" value={facts.phone ? 'Yes' : 'Not shown'} />
            <FactRow label="Email shown" value={facts.email ? 'Yes' : 'Not shown'} />
            <FactRow label="Service area" value={(facts.service_area || []).join(', ') || '—'} />
            {facts.years_experience && <FactRow label="Years of experience" value={facts.years_experience} />}
            {(facts.credentials || []).length > 0 && <FactRow label="Credentials" value={facts.credentials.join(', ')} />}
            <div className="flex flex-wrap gap-2 mt-3">
              <Button className="bg-cyan-600 hover:bg-cyan-700 text-white" onClick={confirmFacts} disabled={factsBusy}>
                {factsBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Yes, this is correct
              </Button>
              <Button variant="outline" onClick={() => onNavigate('business')}>Not quite — fix it</Button>
            </div>
          </div>
        </div>
      )}
      {confirmed && (
        <div className="bg-green-50 border border-green-200 rounded-md px-4 py-2.5 text-sm text-green-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> Facts confirmed — your draft uses only details you provided.
        </div>
      )}

      {/* Version history */}
      {versions.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
            <History className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-semibold text-slate-800">Version history</span>
            <span className="text-xs text-slate-400">A snapshot is kept every time content is replaced</span>
          </div>
          <ul className="divide-y divide-slate-100">
            {versions.map(v => (
              <li key={v.id} className="px-5 py-2.5 flex items-center gap-3 text-sm">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-800">{v.label || ORIGIN_LABELS[v.origin] || 'Saved version'}</div>
                  <div className="text-xs text-slate-400">{v.section} · {new Date(v.created_date).toLocaleString()}</div>
                </div>
                <Badge variant="outline" className="text-xs">{ORIGIN_LABELS[v.origin] || v.origin}</Badge>
                {restoring === v.id ? (
                  <Button variant="outline" size="sm" disabled><Loader2 className="w-3.5 h-3.5 animate-spin" /></Button>
                ) : (
                  <Button variant="ghost" size="sm" className="text-slate-600" onClick={() => restore(v)}>
                    <Undo2 className="w-3.5 h-3.5" /> Restore
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Rebuild / continue */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => onRebuild && onRebuild()}>Rebuild full draft</Button>
        <Button variant="ghost" onClick={() => onNavigate('overview')}>Back to setup overview <ArrowRight className="w-4 h-4 ml-1" /></Button>
      </div>
    </div>
  );
}