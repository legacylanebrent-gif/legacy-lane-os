// Chapter 7 P2 — SELLER ONBOARDING (guided view).
// WHAT HAPPENS AFTER THE CLIENT SAYS YES: a readiness view over the canonical
// records that already exist (pipeline deal, authorities, scope, documents,
// site assessment, decisions, dates, tasks, communications). It creates NO
// duplicate records — every step opens the canonical system. Readiness is
// progress language only, never a legal conclusion.
import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ClipboardList, CheckCircle2, Circle, ArrowRight, Sparkles, Copy, ExternalLink } from 'lucide-react';

const READINESS_BADGE = {
  'NOT STARTED': 'bg-slate-100 text-slate-600 border-slate-200',
  'IN PROGRESS': 'bg-amber-100 text-amber-800 border-amber-200',
  'READY FOR PREPARATION': 'bg-green-100 text-green-800 border-green-200',
};
const STATE_ICON = {
  complete: <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />,
  in_progress: <ArrowRight className="w-5 h-5 text-amber-500 flex-shrink-0" />,
  not_started: <Circle className="w-5 h-5 text-slate-300 flex-shrink-0" />,
};

export default function SellerOnboarding() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const saleId = params.get('saleId');
  const [sales, setSales] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState(null);
  const [removals, setRemovals] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadSaleList = async () => {
    const me = await base44.auth.me();
    const page = await base44.entities.EstateSale.filter(
      { operator_id: me.id, status: { $in: ['draft', 'upcoming', 'active'] } },
      { sort: '-updated_date', limit: 50 });
    setSales(page.items || []);
    setLoading(false);
  };

  const loadStatus = async (sid) => {
    try {
      const res = await base44.functions.invoke('sellerOnboardingAi', { action: 'status', sale_id: sid });
      setData(res.data);
    } catch (e) {
      navigate('/MySales');
    }
    setLoading(false);
  };

  useEffect(() => {
    setDraft(null); setRemovals(null); setCopied(false);
    if (saleId) loadStatus(saleId); else loadSaleList();
  }, [saleId]);

  const generateDraft = async () => {
    setGenerating(true); setCopied(false);
    try {
      const res = await base44.functions.invoke('sellerOnboardingAi', {
        action: 'draft_client_update', sale_id: saleId
      });
      setDraft(res.data.draft);
      setRemovals(res.data.removals || []);
    } catch (e) {
      setDraft('Could not draft the update — try again.');
    }
    setGenerating(false);
  };

  const copyDraft = async () => {
    try { await navigator.clipboard.writeText(draft); setCopied(true); } catch (e) {}
  };

  if (loading) {
    return <div className="min-h-[50vh] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  }

  // Sale picker
  if (!saleId) {
    return (
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <h1 className="text-2xl md:text-3xl font-serif font-bold text-slate-900 flex items-center gap-2">
          <ClipboardList className="w-7 h-7 text-cyan-700" /> Seller Onboarding
        </h1>
        <p className="text-slate-600 mt-2 mb-6 text-sm md:text-base">
          What happens after the client says yes — one readiness view over the records you already keep.
        </p>
        {!sales || sales.length === 0 ? (
          <p className="text-slate-500 text-sm bg-white border border-slate-200 rounded-lg p-4">
            No active sales yet. Create a sale first, then come back to walk it through onboarding.
          </p>
        ) : (
          <div className="space-y-3">
            {sales.map(s => (
              <Link key={s.id} to={`/SellerOnboarding?saleId=${s.id}`}
                className="block bg-white rounded-xl border border-slate-200 p-4 hover:border-cyan-400 transition">
                <p className="font-medium text-slate-900">{s.title}</p>
                <p className="text-sm text-slate-500 capitalize">{s.status} · open onboarding checklist</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList className="w-7 h-7 text-cyan-700" /> Seller Onboarding
          </h1>
          <p className="text-slate-600 mt-1">{data && data.sale ? data.sale.title : ''}</p>
        </div>
        {data && (
          <Badge variant="outline" className={READINESS_BADGE[data.readiness] || ''}>{data.readiness}</Badge>
        )}
      </div>

      {data && (
        <>
          <p className="text-xs text-slate-500">
            Readiness is progress language only — it is not a legal or compliance conclusion.
          </p>

          <div className="space-y-3">
            {data.steps.map(step => (
              <div key={step.key} className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-3">
                {STATE_ICON[step.state] || STATE_ICON.not_started}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900">{step.label}</p>
                  <p className="text-sm text-slate-600">{step.detail}</p>
                </div>
                {step.link && (
                  <Link to={step.link} className="text-cyan-700 hover:text-cyan-900 text-sm font-medium inline-flex items-center gap-1 flex-shrink-0">
                    Open <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            ))}
          </div>

          {/* AI client-update draft — review only, sent through the operator's own channel */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-5 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-600" /> Draft a client update
              </h2>
              <Button size="sm" onClick={generateDraft} disabled={generating}>
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {draft ? 'Redraft' : 'Draft it'}
              </Button>
            </div>
            {draft && (
              <>
                <Textarea rows={7} value={draft} onChange={e => setDraft(e.target.value)} />
                {removals && removals.length > 0 && (
                  <p className="text-xs text-amber-700">
                    The brand-truth guard removed {removals.length} unsupported claim{removals.length > 1 ? 's' : ''} from this draft.
                  </p>
                )}
                <div className="flex items-center gap-3">
                  <Button size="sm" variant="outline" onClick={copyDraft}><Copy className="w-3.5 h-3.5" /> {copied ? 'Copied' : 'Copy'}</Button>
                  <p className="text-xs text-slate-500">A draft for you to review — send it through your own channel.</p>
                </div>
              </>
            )}
            {!draft && (
              <p className="text-sm text-slate-500">
                Summarizes what is complete and what is next from your onboarding facts — it never invents work, dates or promises.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}