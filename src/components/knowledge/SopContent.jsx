// Chapter 25 P1 — renders a structured procedure's content. Purely
// presentational; consumes the safe projection from the companyKnowledge seam.
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, GitBranch, ListOrdered, ShieldAlert } from 'lucide-react';
import { CATEGORY_LABELS, SOURCE_LABELS, fmtDate, fmtDateTime } from './knowledgeModel';

const Section = ({ icon: Icon, title, children }) => (
  <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
      <Icon className="w-3.5 h-3.5" /> {title}
    </p>
    {children}
  </div>
);

export default function SopContent({ doc, showProvenance = true }) {
  const k = doc;
  return (
    <div className="space-y-3">
      {k.purpose && (
        <Section icon={CheckCircle2} title="Purpose">
          <p className="text-sm text-slate-700">{k.purpose}</p>
        </Section>
      )}
      {(k.steps || []).length > 0 && (
        <Section icon={ListOrdered} title="Normal steps">
          <ol className="list-decimal list-inside text-sm text-slate-700 space-y-1">
            {k.steps.map((s, i) => <li key={i}>{s.text}</li>)}
          </ol>
        </Section>
      )}
      {(k.decision_points || []).length > 0 && (
        <Section icon={GitBranch} title="Decision points">
          <div className="space-y-1.5">
            {k.decision_points.map((p, i) => (
              <div key={i} className="text-sm text-slate-700">
                <span className="font-medium">IF {p.condition}</span>
                <span className="block pl-3 text-slate-600">→ {p.if_yes}</span>
                {p.if_no && <span className="block pl-3 text-slate-400">Otherwise → {p.if_no}</span>}
              </div>
            ))}
          </div>
        </Section>
      )}
      {(k.exceptions || []).length > 0 && (
        <Section icon={AlertTriangle} title="When the normal path does not apply">
          <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
            {k.exceptions.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </Section>
      )}
      {k.escalation && (k.escalation.stop_when || k.escalation.escalate_to) && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3">
          <p className="text-xs font-semibold text-red-700 uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
            <ShieldAlert className="w-3.5 h-3.5" /> Escalate instead of guessing
          </p>
          {k.escalation.stop_when && <p className="text-sm text-red-800"><span className="font-medium">Stop when:</span> {k.escalation.stop_when}</p>}
          {k.escalation.escalate_to && <p className="text-sm text-red-800"><span className="font-medium">Escalate to:</span> {k.escalation.escalate_to}</p>}
          {k.escalation.provide && <p className="text-sm text-red-800"><span className="font-medium">Provide:</span> {k.escalation.provide}</p>}
          <p className="text-xs text-red-500 mt-1">This procedure never grants you authority — use Ask for Help on your sale day.</p>
        </div>
      )}
      {k.completion_standard && (
        <Section icon={CheckCircle2} title="Done means">
          <p className="text-sm text-slate-700">{k.completion_standard}</p>
        </Section>
      )}
      {showProvenance && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          <Badge variant="outline" className="bg-white">{CATEGORY_LABELS[k.category] || k.category} · v{k.version}</Badge>
          {k.approved_at && <Badge variant="outline" className="bg-white">Approved {fmtDateTime(k.approved_at)}{k.approved_by_name ? ` by ${k.approved_by_name}` : ''}</Badge>}
          {k.review_date && <Badge variant="outline" className="bg-white">Review {fmtDate(k.review_date)}</Badge>}
          {k.supersedes_document_id && <Badge variant="outline" className="bg-white">Supersedes v{(k.version || 2) - 1}</Badge>}
          {k.ai_generated && <Badge variant="outline" className="bg-white">Started from AI draft</Badge>}
          {k.contributor_name && <Badge variant="outline" className="bg-white">Contributed by {k.contributor_name}</Badge>}
          {k.source_type && k.source_type !== 'MANUAL' && <Badge variant="outline" className="bg-white">From {SOURCE_LABELS[k.source_type]}</Badge>}
        </div>
      )}
    </div>
  );
}