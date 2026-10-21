import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { buildInternalSummary, clientRecommendationDraft, DECLINE_TEMPLATE, GOAL_LABEL, DEADLINE_LABEL, CONDITION_LABEL, ALTERNATIVE_LABEL, RECOMMENDATION_LABEL, RECOMMENDATION_TONE, RISK_LEVELS } from '@/components/consultation/consultationModel';

// Chapter 12 P1 — CONSULTATION SUMMARY (P1-37/P1-38/P1-39/P1-40): an INTERNAL
// assembled view of canonical records (no duplicated truth), a CLIENT-FACING
// recommendation draft (private fit notes / profitability excluded), the reusable
// decline template (never auto-sent), and the proposal handoff.
const Block = ({ title, children }) => (
  <div className="bg-white border border-slate-200 rounded-lg p-3">
    <p className="text-xs font-semibold text-slate-700 mb-1.5">{title}</p>
    {children}
  </div>
);
const CopyBtn = ({ text }) => (
  <button onClick={() => navigator.clipboard?.writeText(text)} className="text-[10px] text-cyan-600 hover:underline">Copy</button>
);

export default function SummarySection({ deal, linkedSale, authority, allDeals, unresolvedResearchCount, review, riskItems, consult, saveConsult }) {
  const summary = useMemo(
    () => buildInternalSummary({ deal, linkedSale, authority, review, riskItems }),
    [deal, linkedSale, authority, review, riskItems]
  );
  const clientDraft = useMemo(() => clientRecommendationDraft(deal), [deal]);
  const openConditions = (consult.acceptance_conditions || []).filter(c => (c.status || 'open') !== 'resolved');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-800">Internal consultation summary</p>
        <Button size="sm" variant={consult.completed_at ? 'outline' : 'default'} className={consult.completed_at ? '' : 'bg-cyan-600 hover:bg-cyan-700'}
          onClick={() => saveConsult({ completed_at: consult.completed_at || new Date().toISOString() })}>
          {consult.completed_at ? `Completed ${new Date(consult.completed_at).toLocaleDateString()} — review any time` : 'Mark Consultation Complete'}
        </Button>
      </div>

      <Block title={`Client — ${summary.client.name || 'Unnamed'}`}>
        <p className="text-xs text-slate-600">{[summary.client.phone, summary.client.email].filter(Boolean).join(' · ') || 'No contact details'}</p>
        <p className="text-xs text-slate-600 mt-0.5">{summary.property.address || 'No property address'}</p>
        <p className="text-xs text-slate-500">Reason: {summary.reason ? String(summary.reason).replace(/_/g, ' ') : 'UNKNOWN'}</p>
      </Block>

      <Block title="Timeline">
        <p className="text-xs text-slate-600">
          Sale: {summary.timeline.saleStart || 'UNKNOWN'}{summary.timeline.saleEnd ? ` – ${summary.timeline.saleEnd}` : ''}
          {summary.timeline.consultationDate ? ` · Consultation ${new Date(summary.timeline.consultationDate).toLocaleDateString()}` : ''}
        </p>
        {summary.timeline.deadlines.map(d => (
          <p key={d.deadline_id} className="text-xs text-slate-600">Deadline: {DEADLINE_LABEL(d.type)} — {d.date}{d.is_estimated ? ' (estimated)' : ''}</p>
        ))}
        {summary.timeline.flags.map((f, i) => (
          <p key={i} className={`text-[11px] mt-1 ${f.level === 'conflict' ? 'text-red-600' : f.level === 'needs_review' ? 'text-amber-600' : 'text-slate-500'}`}>{f.text}</p>
        ))}
      </Block>

      <Block title="Client goals (what the client wants)">
        <p className="text-xs text-slate-600">{summary.goals.goals.length ? summary.goals.goals.map(g => GOAL_LABEL(g)).join(', ') : 'Not recorded'}</p>
        {summary.goals.notes && <p className="text-[11px] text-slate-500 mt-0.5">{summary.goals.notes}</p>}
      </Block>

      <Block title="Authority">
        {summary.authority ? (
          <p className="text-xs text-slate-600">
            {summary.authority.name}{summary.authority.role ? ` (${summary.authority.role})` : ''} — <strong>{summary.authority.status}</strong>
          </p>
        ) : <p className="text-xs text-slate-500">No authority record (no linked sale, or none added).</p>}
      </Block>

      <Block title={`Rooms (${summary.rooms.length})`}>
        {summary.rooms.length ? summary.rooms.map(r => (
          <p key={r.room_id} className="text-xs text-slate-600">
            • {r.name} — {r.prep_level || 'unknown'} prep{r.research_needed ? ' · RESEARCH NEEDED' : ''}{r.access_concern ? ` · access: ${r.access_concern}` : ''}
          </p>
        )) : <p className="text-xs text-slate-500">No rooms captured.</p>}
      </Block>

      <Block title={`Condition observations (${summary.conditions.filter(c => !c.resolved).length} unresolved)`}>
        {summary.conditions.length ? summary.conditions.map(c => (
          <p key={c.observation_id} className={`text-xs ${c.resolved ? 'text-slate-400 line-through' : 'text-slate-600'}`}>
            • {CONDITION_LABEL(c.category)}{c.location ? ` (${c.location})` : ''} — {c.note}{c.attention === 'requires_professional_review' ? ' — PROFESSIONAL REVIEW RECOMMENDED' : ''}
          </p>
        )) : <p className="text-xs text-slate-500">None recorded.</p>}
      </Block>

      <Block title="Preparation & expectations">
        <p className="text-xs text-slate-600">Work: {summary.preparation.work.length ? summary.preparation.work.map(w => w.replace(/_/g, ' ')).join(', ') : 'none flagged'}</p>
        {Object.entries(summary.expectations).filter(([, v]) => v).map(([k, v]) => (
          <p key={k} className="text-[11px] text-slate-500">Client expects {k.replace(/_/g, ' ')}: {v}</p>
        ))}
      </Block>

      <Block title="Sale Acceptance Review">
        {review ? (
          <>
            <Badge className="bg-slate-100 text-slate-700 border border-slate-300">{review.rating}</Badge>
            <ul className="mt-1.5">{review.reasons.slice(0, 4).map((r, i) => <li key={i} className="text-[11px] text-slate-600">• {r}</li>)}</ul>
            {review.reasons.length > 4 && <p className="text-[10px] text-slate-400">+{review.reasons.length - 4} more reasons on the Acceptance Review section</p>}
          </>
        ) : <p className="text-xs text-slate-500">Needs estimated value to run.</p>}
      </Block>

      <Block title="Risks & unknowns">
        {riskItems.map((it, i) => (
          <p key={i} className="text-[11px] text-slate-600">
            <span className={`font-semibold ${(RISK_LEVELS[it.level] || RISK_LEVELS.unknown).label === 'UNKNOWN' ? 'text-slate-500' : 'text-slate-700'}`}>{it.area}</span> — {it.text}
          </p>
        ))}
      </Block>

      <Block title={`Operator recommendation${summary.recommendation.classification ? ` — ${RECOMMENDATION_LABEL(summary.recommendation.classification)}` : ' (not recorded)'}`}>
        {summary.recommendation.classification ? (
          <>
            <Badge className={RECOMMENDATION_TONE(summary.recommendation.classification)}>{RECOMMENDATION_LABEL(summary.recommendation.classification).toUpperCase()}</Badge>
            {summary.recommendation.alternative_type && <p className="text-xs text-slate-600 mt-1">Alternative path: {ALTERNATIVE_LABEL(summary.recommendation.alternative_type)}</p>}
            {summary.recommendation.note && <p className="text-[11px] text-slate-500 mt-1">{summary.recommendation.note}</p>}
          </>
        ) : <p className="text-xs text-slate-500">Record your recommendation on the Recommendation section.</p>}
        {openConditions.length > 0 && (
          <div className="mt-1.5">
            <p className="text-[11px] font-semibold text-amber-700">Open conditions:</p>
            {openConditions.map(c => <p key={c.condition_id} className="text-[11px] text-slate-600">• {c.condition}{c.due_date ? ` (by ${c.due_date})` : ''}</p>)}
          </div>
        )}
      </Block>

      <div className="bg-white border border-green-200 rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-slate-700">Client-facing recommendation draft</p>
          <CopyBtn text={clientDraft.text} />
        </div>
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 text-[10px]">{clientDraft.headline}</Badge>
        <p className="text-[10px] text-slate-400">
          Assembled from your recorded findings only. Excludes private client-fit notes, internal profitability, staffing concerns, and any
          observation you did not choose to state. Review and deliver it yourself — nothing sends automatically.
        </p>
        <pre className="text-[11px] text-slate-700 whitespace-pre-wrap font-sans bg-slate-50 rounded p-2 border border-slate-100">{clientDraft.text}</pre>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-slate-700">Professional decline template</p>
          <CopyBtn text={DECLINE_TEMPLATE} />
        </div>
        <p className="text-[10px] text-slate-400">Respectful, nonjudgmental, optional reason and alternative path. Edit before use — never auto-sent.</p>
        <details>
          <summary className="text-[11px] text-cyan-600 cursor-pointer">Show template</summary>
          <pre className="text-[11px] text-slate-700 whitespace-pre-wrap font-sans bg-slate-50 rounded p-2 border border-slate-100 mt-1">{DECLINE_TEMPLATE}</pre>
        </details>
      </div>

      <div className="bg-white border border-cyan-200 rounded-lg p-4 space-y-2">
        <p className="text-sm font-semibold text-slate-800">Proposal handoff</p>
        {openConditions.length > 0 && (
          <p className="text-xs text-slate-600">These open conditions will carry into the proposal automatically: {openConditions.map(c => c.condition).join('; ')}</p>
        )}
        {deal.estate_sale_id ? (
          <Button asChild className="w-full h-11 bg-cyan-600 hover:bg-cyan-700 text-base">
            <Link to={`/ProposalAgreement?saleId=${deal.estate_sale_id}`}>Create Proposal (no re-entry)</Link>
          </Button>
        ) : (
          <p className="text-xs text-slate-500">
            Proposals are built from the linked Estate Sale (Chapter 9). Link or create the sale for this opportunity first, then return
            here — your economics, scope and conditions will populate it without retyping.
          </p>
        )}
      </div>
    </div>
  );
}