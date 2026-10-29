import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, PenLine, Sparkles, Check } from 'lucide-react';
import { opportunities } from './listingApi';

export default function OutreachPanel({ opportunity, onUpdated }) {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const ai = opportunity.ai_next_step || {};
  const draft = opportunity.outreach_draft || {};

  const run = async (action) => {
    setBusy(action);
    setError('');
    try {
      await opportunities.act(action, opportunity.id);
      onUpdated?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h4 className="text-sm font-semibold text-slate-900">Next step and outreach</h4>

      {ai.recommended_action ? (
        <div className="mt-2 rounded-lg border border-cyan-200 bg-cyan-50 p-2 text-xs text-cyan-900">
          <p className="font-medium">Suggested next action</p>
          <p className="mt-0.5">{ai.recommended_action}</p>
          {ai.summary && <p className="mt-1 text-cyan-800">{ai.summary}</p>}
          {(ai.missing_info || []).length > 0 && (
            <p className="mt-1 text-cyan-800">Still unknown: {ai.missing_info.join('; ')}</p>
          )}
        </div>
      ) : (
        <p className="mt-1 text-xs text-slate-500">
          Ask for a suggestion based only on what is recorded here — nothing is contacted or sent.
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => run('ai_next_step')} disabled={!!busy} className="gap-1.5">
          {busy === 'ai_next_step' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          Suggest next step
        </Button>
        <Button size="sm" variant="outline" onClick={() => run('draft_intro')} disabled={!!busy} className="gap-1.5">
          {busy === 'draft_intro' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PenLine className="h-3.5 w-3.5" />}
          Draft introduction
        </Button>
      </div>

      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}

      {draft.body && (
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-2">
          <p className="text-xs font-medium text-slate-800">{draft.subject}</p>
          <p className="mt-1 whitespace-pre-line text-xs text-slate-700">{draft.body}</p>
          <div className="mt-2 flex items-center gap-2">
            {draft.status === 'approved' ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                <Check className="h-3.5 w-3.5" /> Approved — send it from your own email
              </span>
            ) : (
              <Button size="sm" variant="outline" onClick={() => run('approve_outreach')} disabled={!!busy}>
                Approve draft
              </Button>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500">Drafts only. Nothing is sent from this workspace.</p>
        </div>
      )}
    </section>
  );
}