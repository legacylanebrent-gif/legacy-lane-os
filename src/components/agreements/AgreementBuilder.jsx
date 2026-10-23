import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Lock, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { buildMergeValues, mergeTemplate, MERGE_FIELDS } from './agreementModel';

// Chapter 9 P1 — AGREEMENT BUILDER. The legal text comes from the operator's
// OWN stored template (BusinessDocument, category AGREEMENT); EstateSalen
// populates approved {{MERGE_VARIABLES}} from structured truth only. A
// placeholder with no source is flagged MISSING VALUE — never fabricated or
// silently removed. AI never writes agreement text.

export default function AgreementBuilder({ sale, deal, scope, acceptedProposal, templates, nextVersion, onDone, onClose }) {
  const [templateId, setTemplateId] = useState(templates[0]?.id || '');
  const [saving, setSaving] = useState(null);
  const [body, setBody] = useState('');

  const template = templates.find(t => t.id === templateId);
  const merged = useMemo(() => {
    const { values, missing } = buildMergeValues({ sale, deal, scope, acceptedProposal, companyName: sale?.operator_name });
    return { values, missing, ...mergeTemplate(template?.template_text || '', values) };
  }, [template, sale, deal, scope, acceptedProposal]);

  const usedTokens = useMemo(() => MERGE_FIELDS.filter(f => (template?.template_text || '').includes(f.token)), [template]);

  const save = async (finalize) => {
    if (!template) { alert('Select an agreement template first.'); return; }
    setSaving(finalize ? 'finalize' : 'draft');
    try {
      await base44.entities.SaleAgreement.create({
        operator_id: sale.operator_id,
        sale_id: sale.id,
        deal_id: deal?.id || '',
        company_id: sale.company_id || '',
        sale_team_ids: sale.sale_team || [],
        status: finalize ? 'READY' : 'DRAFT',
        version: nextVersion,
        proposal_id: acceptedProposal?.id || '',
        template_document_id: template.id,
        template_version: template.version || 1,
        template_title: template.title || '',
        merged_values: merged.values,
        body_text: body || merged.body,
        finalized_at: finalize ? new Date().toISOString() : null,
        scope_version: scope?.version || 1,
      });
      onDone(finalize ? `Agreement v${nextVersion} finalized — snapshot frozen.` : `Agreement v${nextVersion} saved as draft.`);
    } catch (e) {
      console.error(e);
      alert('Could not save the agreement.');
    } finally { setSaving(null); }
  };

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Build Estate Sale Contract — version {nextVersion}</DialogTitle>
        <p className="text-xs text-slate-500">Populates your own approved template with structured project facts. EstateSalen does not author or alter legal language — the surrounding terms are yours (have your attorney review them). No e-signature: print/download, sign externally, upload the signed copy, then mark executed.</p>
      </DialogHeader>

      <div className="space-y-4">
        <div>
          <Label className="text-xs">Company agreement template (BusinessDocument · AGREEMENT)</Label>
          <Select value={templateId} onValueChange={setTemplateId}>
            <SelectTrigger><SelectValue placeholder="Select template" /></SelectTrigger>
            <SelectContent>
              {templates.map(t => <SelectItem key={t.id} value={t.id}>{t.title} — v{t.version || 1}</SelectItem>)}
            </SelectContent>
          </Select>
          {!template && <p className="text-xs text-amber-700 mt-1">No agreement template stored yet. Add one in Business Documents (category AGREEMENT) with your attorney-approved text containing {`{{MERGE_VARIABLES}}`}.</p>}
          {template && !template.template_text && <p className="text-xs text-amber-700 mt-1">This template has no template text stored yet — add the agreement text (with {`{{MERGE_VARIABLES}}`}) in Business Documents first.</p>}
        </div>

        {template?.template_text && (
          <>
            {usedTokens.length > 0 && (
              <div className="text-xs bg-slate-50 border border-slate-200 rounded-md p-2 space-y-1">
                <p className="font-semibold text-slate-600">Merge values from structured truth:</p>
                {usedTokens.map(f => {
                  const v = String(merged.values[f.token] || '').trim();
                  return (
                    <p key={f.token} className={v ? 'text-slate-600' : 'text-red-600'}>
                      {f.label}: {v ? v.slice(0, 160) : 'MISSING VALUE — no source record'}
                    </p>
                  );
                })}
              </div>
            )}
            {merged.missing.length > 0 && (
              <p className="text-xs text-red-600 flex items-start gap-1.5"><AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />Missing values will appear as ‹MISSING VALUE› in the text — resolve them in your records or edit the draft before finalizing. Nothing is fabricated.</p>
            )}

            <div>
              <Label className="text-xs">Rendered agreement text (your template's text — edits are yours)</Label>
              <Textarea rows={14} value={body || merged.body} onChange={e => setBody(e.target.value)} className="font-mono text-xs" />
            </div>
          </>
        )}
      </div>

      <div className="flex flex-wrap justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button variant="outline" disabled={!!saving || !template} onClick={() => save(false)}>
          {saving === 'draft' ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save Draft
        </Button>
        <Button className="bg-orange-600 hover:bg-orange-700" disabled={!!saving || !template} onClick={() => save(true)}>
          {saving === 'finalize' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />} Finalize v{nextVersion} (freeze snapshot)
        </Button>
      </div>
    </DialogContent>
  );
}