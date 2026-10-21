import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { FileText, FileSignature, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

// Chapter 10 P1 — Chapter 9 progression RECOGNIZED from the canonical
// SaleProposal / SaleAgreement records (never duplicated as manual stages).
const PROPOSAL_LABEL = {
  DRAFT: 'Draft', FINALIZED: 'Finalized', ACCEPTED: 'Accepted', DECLINED: 'Declined', SUPERSEDED: 'Superseded',
};
const AGREEMENT_LABEL = {
  DRAFT: 'Draft', READY: 'Ready', EXECUTED: 'Executed', SUPERSEDED: 'Superseded', VOIDED: 'Voided',
};

export default function DealCh9Progression({ deal }) {
  const [proposal, setProposal] = useState(null);
  const [agreement, setAgreement] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [props, agrs] = await Promise.all([
          base44.entities.SaleProposal.filter({ deal_id: deal.id }, '-created_date', 10),
          base44.entities.SaleAgreement.filter({ deal_id: deal.id }, '-created_date', 10),
        ]);
        if (cancelled) return;
        setProposal((props || [])[0] || null);
        setAgreement((agrs || [])[0] || null);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [deal.id]);

  if (loading) {
    return <div className="flex items-center gap-2 text-xs text-slate-400 px-1"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking Chapter 9 records…</div>;
  }
  if (!proposal && !agreement) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5">
      <span className="font-semibold text-slate-600">Chapter 9 progression:</span>
      {proposal && (
        <span className="flex items-center gap-1">
          <FileText className="w-3.5 h-3.5 text-slate-400" />
          Proposal v{proposal.version || 1}
          <Badge variant="outline" className="text-[10px]">{PROPOSAL_LABEL[proposal.status] || proposal.status}</Badge>
          {proposal.accepted_at && <span className="text-green-600">accepted {format(parseISO(proposal.accepted_at), 'MMM d')}</span>}
        </span>
      )}
      {agreement && (
        <span className="flex items-center gap-1">
          <FileSignature className="w-3.5 h-3.5 text-slate-400" />
          Agreement v{agreement.version || 1}
          <Badge variant="outline" className="text-[10px]">{AGREEMENT_LABEL[agreement.status] || agreement.status}</Badge>
        </span>
      )}
      {deal.estate_sale_id && (
        <Link to={`/ProposalAgreement?saleId=${deal.estate_sale_id}`} className="text-cyan-600 hover:underline ml-auto">
          Open Proposal & Agreement →
        </Link>
      )}
    </div>
  );
}