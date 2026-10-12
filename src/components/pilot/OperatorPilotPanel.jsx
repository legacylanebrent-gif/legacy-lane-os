// Phase 5A — operator-side pilot panel: setup choice (Part 10), draft rating
// and publication feedback (Parts 15/16). Signals travel through the certified
// llbbPilot operator seam with server-derived identity; nothing technical shows.
import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, Star, MessageSquareText } from 'lucide-react';

const CHOICES = [
  { key: 'ai_build', label: 'Build My Website For Me', desc: 'Answer a few questions and we draft your website automatically.' },
  { key: 'self_custom', label: "I'll Customize It Myself", desc: 'Start from the starter template and edit everything yourself.' }
];

const RATINGS = [
  { key: 'very_easy', label: 'Very easy' }, { key: 'easy', label: 'Easy' },
  { key: 'okay', label: 'Okay' }, { key: 'difficult', label: 'Difficult' }, { key: 'very_difficult', label: 'Very difficult' }
];

export default function OperatorPilotPanel({ websiteTenantId }) {
  const [pilot, setPilot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sent, setSent] = useState(null);
  const [rating, setRating] = useState('');
  const [ratingComment, setRatingComment] = useState('');
  const [survey, setSurvey] = useState('');
  const [surveyComment, setSurveyComment] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await base44.functions.invoke('llbbPilot', { action: 'operator_status', website_tenant_id: websiteTenantId });
        setPilot(res.data.pilot);
      } catch { setPilot(null); }
      setLoading(false);
    })();
  }, [websiteTenantId]);

  const signal = async (kind, value, comment) => {
    setBusy(true);
    try {
      await base44.functions.invoke('llbbPilot', { action: 'operator_signal', website_tenant_id: websiteTenantId, kind, value, comment });
      if (kind === 'draft_rating' || kind === 'publication_survey') setSent(kind);
      else {
        const res = await base44.functions.invoke('llbbPilot', { action: 'operator_status', website_tenant_id: websiteTenantId });
        setPilot(res.data.pilot);
      }
    } catch { /* feedback is optional — never block the operator */ }
    setBusy(false);
  };

  if (loading) return <div className="p-6 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  if (!pilot) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-6 text-center">
        <Sparkles className="w-7 h-7 text-slate-300 mx-auto mb-2" />
        <p className="text-slate-600 font-medium">This website isn't part of the guided pilot.</p>
        <p className="text-sm text-slate-400 mt-1">No action needed — everything here works the same either way.</p>
      </div>
    );
  }

  const given = pilot.feedback_given || [];

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex items-center gap-2 mb-1"><Sparkles className="w-4 h-4 text-cyan-600" /><span className="font-heading font-bold text-slate-900">You're in the guided pilot</span></div>
        <p className="text-sm text-slate-500">A few short questions help us make website setup better for every operator. Everything is optional.</p>
      </div>

      {pilot.setup_choice === 'none' && (
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="font-heading font-bold text-slate-900 mb-1">How do you want to build your website?</div>
          <div className="grid sm:grid-cols-2 gap-3 mt-3">
            {CHOICES.map(c => (
              <button key={c.key} onClick={() => signal('setup_choice', c.key)} disabled={busy}
                className={`text-left p-4 rounded-lg border transition-colors ${c.key === 'ai_build' ? 'border-cyan-300 bg-cyan-50 hover:bg-cyan-100' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                <div className="font-semibold text-slate-900 text-sm mb-1">{c.label}</div>
                <div className="text-xs text-slate-500">{c.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {pilot.can_rate_draft && !given.includes('draft_rating') && sent !== 'draft_rating' && (
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-1"><Star className="w-4 h-4 text-amber-500" /><span className="font-heading font-bold text-slate-900">How did building your website draft feel?</span></div>
          <div className="flex flex-wrap gap-2 mt-3">
            {RATINGS.map(r => (
              <button key={r.key} onClick={() => setRating(r.key)} disabled={busy}
                className={`px-3 py-1.5 rounded-md text-sm border ${rating === r.key ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                {r.label}
              </button>
            ))}
          </div>
          <textarea value={ratingComment} onChange={e => setRatingComment(e.target.value)} rows={2} placeholder="Anything that got in your way? (optional)"
            className="w-full mt-3 px-3 py-2 rounded-md border border-slate-200 text-sm" />
          <div className="flex justify-end mt-3">
            <Button size="sm" disabled={!rating || busy} onClick={() => signal('draft_rating', rating, ratingComment)}>Send feedback</Button>
          </div>
        </div>
      )}

      {pilot.can_survey && !given.includes('publication_survey') && sent !== 'publication_survey' && (
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-1"><MessageSquareText className="w-4 h-4 text-cyan-600" /><span className="font-heading font-bold text-slate-900">Are you happy with your website?</span></div>
          <div className="flex flex-wrap gap-2 mt-3">
            {[['satisfied', 'Yes, happy with it'], ['not_satisfied', 'Not quite yet']].map(([k, l]) => (
              <button key={k} onClick={() => setSurvey(k)} disabled={busy}
                className={`px-3 py-1.5 rounded-md text-sm border ${survey === k ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                {l}
              </button>
            ))}
          </div>
          {survey === 'not_satisfied' && (
            <textarea value={surveyComment} onChange={e => setSurveyComment(e.target.value)} rows={2} placeholder="What was the hardest part, and what should change? (optional)"
              className="w-full mt-3 px-3 py-2 rounded-md border border-slate-200 text-sm" />
          )}
          <div className="flex justify-end mt-3">
            <Button size="sm" disabled={!survey || busy} onClick={() => signal('publication_survey', survey, surveyComment)}>Send feedback</Button>
          </div>
        </div>
      )}

      {(sent === 'draft_rating' || sent === 'publication_survey' || given.includes('draft_rating') || given.includes('publication_survey')) && pilot.setup_choice !== 'none' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
          Thanks — your feedback is in. We use it to make setup better for everyone.
        </div>
      )}
    </div>
  );
}