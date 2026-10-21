import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save, Lock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { buildProposalSnapshot, unresolvedFacts, ESTIMATE_NOTE } from './proposalModel';

// Chapter 9 P1 — PROPOSAL BUILDER. Populates from canonical records so the
// operator never retypes known facts; UNKNOWN fields stay visibly unresolved —
// nothing is fabricated. Finalizing freezes the snapshot for this version.

export default function ProposalBuilder({ sale, deal, scope, nextVersion, onDone, onClose }) {
  const [saving, setSaving] = useState(null);
  const [snapshot, setSnapshot] = useState(() => buildProposalSnapshot({ sale, deal, scope }));
  const set = (path, value) => setSnapshot(s => {
    const next = { ...s };
    const parts = path.split('.');
    let cur = next;
    while (parts.length > 1) { cur[parts[0]] = { ...(cur[parts[0]] || {}) }; cur = cur[parts[0]]; parts.shift(); }
    cur[parts[0]] = value;
    return next;
  });

  const unresolved = useMemo(() => unresolvedFacts(snapshot), [snapshot]);

  const save = async (finalize) => {
    setSaving(finalize ? 'finalize' : 'draft');
    try {
      await base44.entities.SaleProposal.create({
        operator_id: sale.operator_id,
        sale_id: sale.id,
        deal_id: deal?.id || '',
        company_id: sale.company_id || '',
        sale_team_ids: sale.sale_team || [],
        status: finalize ? 'FINALIZED' : 'DRAFT',
        version: nextVersion,
        snapshot,
        finalized_at: finalize ? new Date().toISOString() : null,
      });
      onDone(finalize ? `Proposal v${nextVersion} finalized — the snapshot for this version is now preserved.` : `Proposal v${nextVersion} saved as draft.`);
    } catch (e) {
      console.error(e);
      alert('Could not save the proposal.');
    } finally {
      setSaving(null);
    }
  };

  const range = snapshot.estimated_range || {};

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Build Proposal — version {nextVersion}</DialogTitle>
        <p className="text-xs text-slate-500">Populated from your records (client, property, scope, dates, terms). Add the narrative; unknowns stay visible. THE PROPOSAL EXPLAINS WHAT YOU RECOMMEND.</p>
      </DialogHeader>
      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <div><Label className="text-xs">Client name</Label><Input value={snapshot.client?.name || ''} onChange={e => set('client.name', e.target.value)} /></div>
          <div><Label className="text-xs">Client phone</Label><Input value={snapshot.client?.phone || ''} onChange={e => set('client.phone', e.target.value)} /></div>
          <div className="sm:col-span-2"><Label className="text-xs">Property</Label><Input value={[snapshot.property?.street, snapshot.property?.city, snapshot.property?.state].filter(Boolean).join(', ')} onChange={e => set('property.street', e.target.value)} placeholder="Street, city, state" /></div>
        </div>

        <div>
          <Label className="text-xs">Project overview (what you recommend and why)</Label>
          <Textarea rows={3} value={snapshot.overview} onChange={e => set('overview', e.target.value)} placeholder="A short, client-facing overview of the recommended approach…" />
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Estimated range — low ($)</Label>
            <Input type="number" min="0" value={range.low ?? ''} onChange={e => set('estimated_range.low', e.target.value === '' ? null : Number(e.target.value))} placeholder="Not set" />
          </div>
          <div>
            <Label className="text-xs">Estimated range — high ($)</Label>
            <Input type="number" min="0" value={range.high ?? ''} onChange={e => set('estimated_range.high', e.target.value === '' ? null : Number(e.target.value))} placeholder="Not set" />
          </div>
          <div>
            <Label className="text-xs">Working estimate ($)</Label>
            <Input type="number" min="0" value={range.working_estimate ?? ''} onChange={e => set('estimated_range.working_estimate', e.target.value === '' ? null : Number(e.target.value))} placeholder="Not set" />
          </div>
          <div>
            <Label className="text-xs">Commission (%)</Label>
            <Input type="number" min="0" step="0.1" value={snapshot.compensation?.commission_rate ?? ''} onChange={e => set('compensation.commission_rate', e.target.value === '' ? null : Number(e.target.value))} />
          </div>
          <div>
            <Label className="text-xs">Minimum fee ($)</Label>
            <Input type="number" min="0" value={snapshot.compensation?.minimum_fee ?? ''} onChange={e => set('compensation.minimum_fee', e.target.value === '' ? null : Number(e.target.value))} />
          </div>
        </div>
        <p className="text-[11px] text-slate-500 flex items-start gap-1.5"><Lock className="w-3 h-3 mt-0.5 flex-shrink-0" />{ESTIMATE_NOTE}</p>

        <div>
          <Label className="text-xs">Sale strategy (preparation, marketing, schedule, pickup)</Label>
          <Textarea rows={3} value={snapshot.sale_strategy} onChange={e => set('sale_strategy', e.target.value)} placeholder="How the sale will be run, marketed, and closed out…" />
        </div>

        <div>
          <Label className="text-xs">Discount approach</Label>
          <Textarea rows={2} value={snapshot.discount_approach} onChange={e => set('discount_approach', e.target.value)} placeholder="e.g. No automatic discount schedule committed; day-2 discounts may be considered…" />
        </div>

        <div>
          <Label className="text-xs">Next steps</Label>
          <Textarea rows={2} value={snapshot.next_steps} onChange={e => set('next_steps', e.target.value)} placeholder="Review, confirm, agreement preparation…" />
        </div>

        {(snapshot.conditions || []).length > 0 && (
          <div className="text-xs bg-cyan-50 border border-cyan-200 rounded-md p-2 text-cyan-900">
            <p className="font-semibold text-[11px] mb-1">Acceptance conditions carried from the consultation (no re-entry):</p>
            {(snapshot.conditions || []).map((x, i) => (
              <p key={i}>• {x.condition}{x.due_date ? ` (by ${x.due_date})` : ''}{x.status === 'resolved' ? ' — resolved' : ''}</p>
            ))}
          </div>
        )}

        {unresolved.length > 0 && (
          <div className="text-xs bg-amber-50 border border-amber-200 rounded-md p-2 text-amber-800">
            Still unresolved (kept visible — never fabricated): {unresolved.join(', ')}.
          </div>
        )}
      </div>

      <div className="flex flex-wrap justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button variant="outline" disabled={!!saving} onClick={() => save(false)}>
          {saving === 'draft' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Draft
        </Button>
        <Button className="bg-orange-600 hover:bg-orange-700" disabled={!!saving} onClick={() => save(true)}>
          {saving === 'finalize' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />} Finalize v{nextVersion} (freeze snapshot)
        </Button>
      </div>
    </DialogContent>
  );
}