import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RECOMMENDATION_OPTIONS, ALTERNATIVE_TYPES, ALTERNATIVE_LABEL, recommendationIssue } from '@/components/consultation/consultationModel';
import VoiceNoteInput from '@/components/consultation/VoiceNoteInput';

// Chapter 12 P1 — STRUCTURED HUMAN RECOMMENDATION (P1-31..36). This is the
// OPERATOR'S recommendation — the deterministic Sale Acceptance Review is advisory
// evidence and NEVER writes it. Decline does NOT force the Chapter 10 outcome; the
// operator separately chooses the truthful CRM outcome (LOST / REFERRED / NURTURE).
export default function RecommendationSection({ deal, user, consult, saveConsult }) {
  const rec = consult.recommendation || {};
  const issue = recommendationIssue(rec.classification, consult);

  const setRec = (patch) => saveConsult({
    recommendation: {
      ...rec,
      ...patch,
      selected_by: user?.id,
      selected_at: new Date().toISOString(),
    },
  });

  const setClassification = (value) => setRec({ classification: value, alternative_type: undefined, decline_reason: undefined });

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
        <p className="text-sm font-semibold text-slate-800">Your recommendation</p>
        <p className="text-[10px] text-slate-400">
          A HUMAN choice. The Sale Acceptance Review above is advisory evidence — it cannot write this. Client GOALS are what the client
          wants; this is what YOU recommend.
        </p>
        <Select value={rec.classification || ''} onValueChange={setClassification}>
          <SelectTrigger className="h-12 text-base font-medium"><SelectValue placeholder="Choose your recommendation" /></SelectTrigger>
          <SelectContent>
            {RECOMMENDATION_OPTIONS.map(r => <SelectItem key={r.value} value={r.value} className="text-base">{r.label}</SelectItem>)}
          </SelectContent>
        </Select>

        {rec.classification === 'conditional_candidate' && (
          <p className="text-xs text-slate-500 bg-amber-50 border border-amber-200 rounded p-2">
            Add the conditions on the Acceptance Review section — a conditional recommendation needs at least one OPEN condition.
          </p>
        )}

        {rec.classification === 'research_required' && (
          <p className="text-xs text-slate-500 bg-sky-50 border border-sky-200 rounded p-2">
            The recommendation stays ON HOLD until the research is resolved. The proposal is not falsely represented as ready.
          </p>
        )}

        {rec.classification === 'alternative_solution' && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-600">Alternative path</p>
            <div className="grid grid-cols-2 gap-2">
              {ALTERNATIVE_TYPES.map(a => (
                <button key={a.value} onClick={() => setRec({ alternative_type: a.value })}
                  className={`min-h-[44px] rounded-lg border text-xs font-medium ${rec.alternative_type === a.value ? 'bg-purple-600 border-purple-600 text-white' : 'bg-white border-slate-200 text-slate-600'}`}>
                  {a.label}
                </button>
              ))}
            </div>
            {rec.alternative_type && (
              <div className="text-xs space-y-1">
                {['donation', 'cleanout', 'buyout', 'specialist'].includes(rec.alternative_type) && (
                  <Link to={`/ProfessionalNetwork?category=${rec.alternative_type === 'specialist' ? 'collectibles_specialty' : rec.alternative_type}${deal.property_state ? `&state=${deal.property_state}` : ''}`} className="text-cyan-600 hover:underline block">
                    Launch WHO CAN HELP? for {ALTERNATIVE_LABEL(rec.alternative_type).toLowerCase()} professionals →
                  </Link>
                )}
                {rec.alternative_type === 'real_estate_houszu' && (
                  <p className="text-slate-500">Real estate referral path: record it as the Chapter 10 REFERRED outcome, or use the agent referral exchange.</p>
                )}
              </div>
            )}
          </div>
        )}

        {rec.classification === 'decline' && (
          <VoiceNoteInput label="Decline reason (your words)" value={rec.decline_reason || ''} onChange={v => setRec({ decline_reason: v })} placeholder="Why the company is declining" rows={2} />
        )}

        <VoiceNoteInput label="Recommendation note (optional)" value={rec.note || ''} onChange={v => setRec({ note: v })} placeholder="Context for this recommendation" rows={2} />

        {rec.classification && (
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={RECOMMENDATION_OPTIONS.find(r => r.value === rec.classification)?.tone}>{RECOMMENDATION_OPTIONS.find(r => r.value === rec.classification)?.label.toUpperCase()}</Badge>
            {rec.selected_at && <span className="text-[10px] text-slate-400">selected {new Date(rec.selected_at).toLocaleString()}</span>}
          </div>
        )}
        {issue && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">{issue}</p>}
      </div>

      {(rec.classification === 'decline' || rec.classification === 'alternative_solution') && (
        <div className="bg-white border border-cyan-200 rounded-lg p-4 space-y-2">
          <p className="text-sm font-semibold text-slate-800">Choose the truthful CRM outcome</p>
          <p className="text-xs text-slate-600">
            {rec.classification === 'decline'
              ? 'A declined project is not automatically LOST. If the family may return, NURTURE is more truthful; if you pointed them to a better-fit service, REFERRED is more truthful.'
              : 'If the family was directed to the alternative service/professional, the Chapter 10 REFERRED outcome records it with provenance.'}
          </p>
          <Button asChild variant="outline" className="w-full h-11">
            <Link to="/SaleConversionPipeline">Open the opportunity and record the outcome (LOST / REFERRED / NURTURE) →</Link>
          </Button>
        </div>
      )}
    </div>
  );
}