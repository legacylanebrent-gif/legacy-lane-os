import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Sparkles, CheckCircle2, Loader2, ShieldCheck, Link as LinkIcon } from 'lucide-react';

// Chapter 24 P0-2A/P1 — RECAP REVIEW & PUBLICATION GATE + AI PROVENANCE.
// The completion automation creates a PRIVATE DRAFT recap (AI-generated summary
// from canonical sale records — no financial figures). Nothing is public until
// the operator reviews and approves. This card is the provenance surface:
// AI-ASSISTED status, source data, verification status, human approval state.
export default function RecapPublishCard({ sale }) {
  const [recap, setRecap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (sale?.id) load(); }, [sale?.id]);

  async function load() {
    setLoading(true);
    try {
      const recaps = await base44.entities.SaleRecap.filter({ sale_id: sale.id });
      setRecap(recaps[0] || null);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function generateDraft() {
    setBusy(true);
    try {
      await base44.functions.invoke('generateSaleRecap', { sale_id: sale.id });
      await load();
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || 'Could not generate the draft.';
      alert(typeof msg === 'string' ? msg : 'Could not generate the draft.');
    }
    setBusy(false);
  }

  async function publish() {
    if (!window.confirm('Publish this recap to the public site? Private financial figures are never included. This records you as the approving operator.')) return;
    setBusy(true);
    try {
      await base44.functions.invoke('publishSaleRecap', { sale_id: sale.id });
      await load();
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || 'Could not publish.';
      alert(typeof msg === 'string' ? msg : 'Could not publish.');
    }
    setBusy(false);
  }

  return (
    <Card className="border-slate-200">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-orange-500" /> Sale Recap — Review & Publish
          </h3>
          {loading ? <Loader2 className="w-4 h-4 animate-spin text-slate-400" /> : (
            recap?.status === 'published'
              ? <Badge className="bg-green-100 text-green-800 border border-green-300"><CheckCircle2 className="w-3 h-3 mr-1" />PUBLISHED</Badge>
              : <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50">DRAFT — NOT PUBLIC</Badge>
          )}
        </div>

        {loading ? null : !recap ? (
          <div className="text-sm text-slate-600 space-y-2">
            <p>No recap draft exists yet. Completing the project generates one automatically; you can also create it now.</p>
            <Button size="sm" onClick={generateDraft} disabled={busy}>
              {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Create draft recap
            </Button>
          </div>
        ) : recap.status === 'published' ? (
          <div className="text-sm text-slate-600 space-y-2">
            <p className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>
                Human approved by <strong>{recap.published_by_name || 'the operator'}</strong>
                {recap.published_at ? ` on ${new Date(recap.published_at).toLocaleString()}` : ''}. The AI-generated summary is
                public only because you approved it. Private financial figures are never published.
              </span>
            </p>
            <a href={`/sale-recap?slug=${encodeURIComponent(recap.slug)}`} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm text-orange-600 hover:underline">
              <LinkIcon className="w-3.5 h-3.5" /> View public recap
            </a>
          </div>
        ) : (
          <div className="text-sm text-slate-600 space-y-3">
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">AI provenance</p>
              <p><strong className="text-slate-800">Status:</strong> AI-GENERATED DRAFT — not published, not evidence.</p>
              <p><strong className="text-slate-800">Source data:</strong> canonical sale records only (title, categories, merchandise, dates). No financial figures are included in the draft or its summary.</p>
              <p><strong className="text-slate-800">Verification:</strong> the AI summary is model-generated language, not verified fact.</p>
              <p><strong className="text-slate-800">Human approval:</strong> required before anything is public.</p>
            </div>
            {recap.ai_summary && (
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Draft AI summary</p>
                <p className="text-slate-700">{recap.ai_summary}</p>
              </div>
            )}
            <Button size="sm" onClick={publish} disabled={busy}>
              {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
              Review & publish
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}