import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, FileDown, Eye, CheckCircle2, XCircle, Lock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { PROPOSAL_STATUS, OUTCOME_LABELS } from './proposalModel';
import { downloadProposalPdf } from './proposalPdf';

// Chapter 9 P1 — one proposal VERSION card. PROPOSED ≠ ACCEPTED ≠ CURRENT:
// each finalized version preserves what was proposed on that date.
// Accepting writes acceptance metadata to the canonical deal (the deal remains
// the settlement-facing source of commercial terms).

const money = (n) => (n == null || n === '' ? null : `$${Number(n).toLocaleString()}`);

export default function ProposalCard({ proposal, deal, onChanged }) {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(null);
  const [accepting, setAccepting] = useState(false);
  const [acceptBy, setAcceptBy] = useState('');
  const [acceptSource, setAcceptSource] = useState('signed proposal');
  const s = proposal.snapshot || {};
  const cfg = PROPOSAL_STATUS[proposal.status] || PROPOSAL_STATUS.DRAFT;

  const accept = async () => {
    if (!acceptBy.trim()) { alert('Record who accepted the terms.'); return; }
    setBusy('accept');
    try {
      const now = new Date().toISOString();
      await base44.entities.SaleProposal.update(proposal.id, {
        status: 'ACCEPTED', accepted_at: now, accepted_by: acceptBy.trim(), acceptance_source: acceptSource,
      });
      // A newer acceptance supersedes the previously accepted version.
      const res = await base44.entities.SaleProposal.filter({ sale_id: proposal.sale_id });
      for (const p of (Array.isArray(res) ? res : res.items || [])) {
        if (p.id !== proposal.id && p.status === 'ACCEPTED') {
          await base44.entities.SaleProposal.update(p.id, { status: 'SUPERSEDED', superseded_by: proposal.id, superseded_at: now });
        }
      }
      // Acceptance metadata lands on the canonical deal — the structured truth.
      if (deal) {
        await base44.entities.SaleConversionPipeline.update(deal.id, {
          commercial_terms_accepted_at: now,
          commercial_terms_accepted_by: acceptBy.trim(),
          commercial_terms_acceptance_source: acceptSource,
          accepted_proposal_id: proposal.id,
          accepted_terms_snapshot: {
            commission_rate: s.compensation?.commission_rate ?? deal.commission_rate ?? null,
            minimum_fee: s.compensation?.minimum_fee ?? deal.minimum_fee ?? null,
            estimated_value_low: s.estimated_range?.low ?? null,
            estimated_value_high: s.estimated_range?.high ?? null,
            accepted_at: now,
          },
        });
      }
      onChanged(`Proposal v${proposal.version} accepted — commercial terms recorded on the deal.`);
    } catch (e) {
      console.error(e);
      alert('Could not record acceptance.');
    } finally {
      setBusy(null);
      setAccepting(false);
    }
  };

  const decline = async () => {
    setBusy('decline');
    try {
      await base44.entities.SaleProposal.update(proposal.id, { status: 'DECLINED', declined_at: new Date().toISOString() });
      onChanged(`Proposal v${proposal.version} marked declined (history preserved).`);
    } catch (e) { alert('Could not record decline.'); } finally { setBusy(null); }
  };

  const Row = ({ k, v }) => <div className="flex justify-between gap-3 text-sm py-0.5"><span className="text-slate-500 min-w-0">{k}</span><span className="text-slate-800 text-right min-w-0 break-words">{v || '—'}</span></div>;

  return (
    <Card className="border-slate-200">
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-900">Proposal v{proposal.version}</span>
            <Badge variant="outline" className={cfg.tone}>{cfg.label}</Badge>
            {proposal.finalized_at && <span className="text-xs text-slate-400">finalized {new Date(proposal.finalized_at).toLocaleDateString()}</span>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setShow(x => !x)}><Eye className="w-3.5 h-3.5 mr-1" />{show ? 'Hide' : 'Preview'}</Button>
            {proposal.status !== 'DRAFT' && <Button size="sm" variant="outline" onClick={() => downloadProposalPdf(proposal, s.client?.name ? `Estate sale services for ${s.client.name}` : undefined)}><FileDown className="w-3.5 h-3.5 mr-1" />PDF (snapshot)</Button>}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-x-6">
          <Row k="Client" v={s.client?.name} />
          <Row k="Sale dates" v={(s.sale_dates || []).map(d => d?.date).filter(Boolean).join(', ')} />
          <Row k="Estimated range" v={s.estimated_range?.low && s.estimated_range?.high ? `${money(s.estimated_range.low)} – ${money(s.estimated_range.high)} (estimate)` : money(s.estimated_range?.working_estimate) ? `${money(s.estimated_range.working_estimate)} (working estimate)` : null} />
          <Row k="Commission" v={s.compensation?.commission_rate != null ? `${s.compensation.commission_rate}%` : null} />
          <Row k="Minimum fee" v={money(s.compensation?.minimum_fee)} />
          <Row k="Post-sale plan" v={s.post_sale_plan?.default_outcome ? (OUTCOME_LABELS[s.post_sale_plan.default_outcome] || s.post_sale_plan.default_outcome) : null} />
        </div>

        {proposal.status === 'ACCEPTED' && proposal.accepted_at && (
          <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md p-2">
            Accepted {new Date(proposal.accepted_at).toLocaleDateString()}{proposal.accepted_by ? ` by ${proposal.accepted_by}` : ''}{proposal.acceptance_source ? ` (${proposal.acceptance_source})` : ''}. The accepted commercial terms are recorded on the deal — the structured truth settlement reads.
          </p>
        )}

        {show && (
          <div className="text-sm space-y-2 bg-slate-50 border border-slate-200 rounded-md p-3">
            {s.overview && <p><strong>Overview:</strong> {s.overview}</p>}
            <p><strong>Recommended services:</strong> {(s.recommended_services || []).map(r => r.name).join(', ') || '—'}</p>
            <p><strong>Scope:</strong> included {(s.scope_summary?.included || []).join(', ') || '—'}; optional {(s.scope_summary?.optional || []).join(', ') || '—'}</p>
            <p><strong>Excluded:</strong> {(s.scope_summary?.excluded || []).join('; ') || '—'}</p>
            {s.sale_strategy && <p><strong>Sale strategy:</strong> {s.sale_strategy}</p>}
            {s.discount_approach && <p><strong>Discount approach:</strong> {s.discount_approach}</p>}
            {s.next_steps && <p><strong>Next steps:</strong> {s.next_steps}</p>}
            <p className="text-xs text-slate-500">{s.estimate_note}</p>
          </div>
        )}

        {proposal.status === 'FINALIZED' && (
          accepting ? (
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <div className="grid sm:grid-cols-2 gap-2">
                <div><Input placeholder="Accepted by (name)" value={acceptBy} onChange={e => setAcceptBy(e.target.value)} /></div>
                <Select value={acceptSource} onValueChange={setAcceptSource}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="signed proposal">Signed proposal</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="in_person">In person</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="ghost" onClick={() => setAccepting(false)}>Cancel</Button>
                <Button size="sm" className="bg-green-600 hover:bg-green-700" disabled={busy === 'accept'} onClick={accept}>
                  {busy === 'accept' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />} Record Acceptance
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
              <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => setAccepting(true)}><CheckCircle2 className="w-3.5 h-3.5 mr-1" />Client Accepted</Button>
              <Button size="sm" variant="outline" disabled={busy === 'decline'} onClick={decline}><XCircle className="w-3.5 h-3.5 mr-1" />Declined</Button>
              <span className="text-[11px] text-slate-400 self-center">Acceptance writes the accepted commercial terms to the deal — additional services stay authorization-driven.</span>
            </div>
          )
        )}

        {proposal.status === 'DRAFT' && (
          <p className="text-xs text-slate-500 flex items-center gap-1.5 border-t border-slate-100 pt-3"><Lock className="w-3.5 h-3.5" />Draft — edit in the builder, then finalize to freeze this version's snapshot.</p>
        )}
      </CardContent>
    </Card>
  );
}