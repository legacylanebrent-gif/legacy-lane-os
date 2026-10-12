// Phase 5A — Admin pilot detail (Part 30, support mode): the full runbook,
// workflow state, checklist, milestones, friction/interventions/notes/feature
// requests, AI acceptance report, scorecard and safe maintenance actions.
// Reuses certified seams for anything operational; this view only records
// pilot metadata through the llbbPilot control plane.
import React, { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, Circle, Flag, Wrench, FileText, Lightbulb, RotateCcw, Trash2, ClipboardCheck, AlertTriangle, History } from 'lucide-react';

const MILESTONE_LABELS = {
  website_created: 'Website created', invitation_sent: 'Invitation sent', invitation_accepted: 'Invitation accepted',
  setup_started: 'Setup started', ai_interview_started: 'AI interview started', ai_interview_completed: 'AI interview completed',
  first_draft: 'First AI draft', first_preview: 'First preview', first_human_edit: 'First human edit',
  setup_completed: 'Setup completed', submitted_for_review: 'Submitted for review', changes_requested: 'Changes requested',
  resubmitted: 'Resubmitted', approved: 'Approved', published: 'Website published',
  first_sale_published: 'First sale published', first_inventory_update: 'First inventory update',
  first_seller_lead: 'First seller lead', first_buyer_signup: 'First buyer signup',
  custom_domain_pending: 'Custom domain pending', custom_domain_live: 'Custom domain live',
  check_7d: '7-day check', review_30d: '30-day review'
};

const RUNBOOK = [
  { n: 1, text: 'Create the website with the standard Business Builder provisioning flow (it must attach to this pilot\'s company).' },
  { n: 2, text: 'Send the invitation using the certified invite flow, then mark "Invitation sent" here.' },
  { n: 3, text: 'Support the operator through setup (AI Build or self-customize). Record friction and interventions as they happen.' },
  { n: 4, text: 'Guide them through Submit for Review — the certified review seam runs the readiness check.' },
  { n: 5, text: 'Approve the review, then publish the website (approval and publication are separate steps).' },
  { n: 6, text: 'Watch for the first sale, lead and buyer signup — mark each milestone as it lands.' },
  { n: 7, text: 'If a custom domain is requested, connect it through the certified domain seam and track pending → live.' },
  { n: 8, text: 'Complete the 24h, 7-day and 30-day checks, then record the 30-day recommendation.' }
];

const fmt = (v) => v ? new Date(v).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';

export default function AdminPilotDetail({ pilotId, summary, onChanged }) {
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await base44.functions.invoke('llbbPilot', { action: 'detail', pilot_id: pilotId });
      setD(res.data);
      setError(null);
    } catch (e) {
      const er = e.response && e.response.data && e.response.data.error;
      setError(er ? (er.message || er.code) : 'Could not load pilot.');
    }
    setLoading(false);
  }, [pilotId]);

  useEffect(() => { load(); }, [load]);

  const act = async (payload, confirmKey) => {
    setBusy(payload.action + (payload.key || ''));
    try {
      await base44.functions.invoke('llbbPilot', { pilot_id: pilotId, ...payload });
      await load();
      if (onChanged) onChanged();
    } catch (e) {
      const er = e.response && e.response.data && e.response.data.error;
      setError(er ? (er.message || er.code) : 'Action failed.');
    }
    setConfirmAction(null);
    setBusy(null);
  };

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="w-7 h-7 animate-spin text-slate-400" /></div>;
  if (error && !d) return <div className="bg-red-50 border border-red-200 text-red-700 rounded-md p-4 text-sm">{error}</div>;
  if (!d) return null;

  const { pilot, website, company, support, acceptance, scorecard } = d;
  const checklist = pilot.checklist || [];
  const doneCount = checklist.filter(c => c.done).length;

  return (
    <div className="space-y-4">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-md px-4 py-2.5 rounded-md text-sm flex items-start gap-2"><AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />{error}</div>}

      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-heading font-bold text-xl text-slate-900">{pilot.company_name}</h2>
          <Badge className="bg-cyan-50 text-cyan-800">{pilot.stage_label}</Badge>
          {pilot.is_synthetic && <Badge className="bg-violet-50 text-violet-700">Synthetic certification</Badge>}
        </div>
        <div className="grid sm:grid-cols-4 gap-3 mt-4 text-sm">
          <div><span className="text-slate-400 text-xs block">Company</span>{company ? `${company.display_name}` : '—'}</div>
          <div><span className="text-slate-400 text-xs block">Contact</span>{(company && company.email) || '—'}</div>
          <div><span className="text-slate-400 text-xs block">Management mode</span>{pilot.management_mode}</div>
          <div><span className="text-slate-400 text-xs block">Setup choice</span>{pilot.setup_choice === 'none' ? 'Not chosen yet' : pilot.setup_choice}</div>
        </div>
        {website && (
          <div className="grid sm:grid-cols-4 gap-3 mt-3 pt-3 border-t border-slate-100 text-sm">
            <div><span className="text-slate-400 text-xs block">Website</span><span className="truncate block max-w-[200px]">{website.platform_hostname || '—'}</span></div>
            <div><span className="text-slate-400 text-xs block">Workflow</span>{website.workflow_status}</div>
            <div><span className="text-slate-400 text-xs block">Setup</span>{website.readiness.percent}%</div>
            <div><span className="text-slate-400 text-xs block">Leads captured</span>{website.lead_count}</div>
          </div>
        )}
        {!website && (
          <div className="mt-3 pt-3 border-t border-slate-100 text-sm text-slate-500">
            No website attached yet — create it with the standard Business Builder provisioning flow, then attach it below.
          </div>
        )}
      </div>

      {/* Support mode */}
      {website && (
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-3"><Flag className="w-4 h-4 text-cyan-600" /><span className="font-heading font-bold text-slate-900">Support mode</span></div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
            <div><span className="text-slate-400 text-xs block">Current step</span>{support.current_step || '—'}</div>
            <div><span className="text-slate-400 text-xs block">Readiness blockers</span>{(support.readiness_blockers || []).length === 0 ? 'None' : support.readiness_blockers.map(b => b.label).join(', ')}</div>
            <div><span className="text-slate-400 text-xs block">Open review notes</span>{support.open_review_notes}</div>
            <div><span className="text-slate-400 text-xs block">Site health</span>{support.health ? `${support.health.status}${support.health.detail ? ' — ' + support.health.detail : ''}` : '—'}</div>
            <div><span className="text-slate-400 text-xs block">Domain state</span>{(support.domain_state || []).length === 0 ? 'No custom domain' : support.domain_state.map(x => `${x.hostname}: ${x.status}`).join(', ')}</div>
            <div><span className="text-slate-400 text-xs block">Last error</span>{support.last_error || 'None'}</div>
            <div><span className="text-slate-400 text-xs block">Last activity</span>{fmt(support.last_activity_at)}</div>
          </div>
        </div>
      )}

      {/* Runbook */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="font-heading font-bold text-slate-900 mb-3 text-sm">Launch runbook</div>
        <ol className="space-y-1.5 text-sm text-slate-600">
          {RUNBOOK.map(s => (
            <li key={s.n} className="flex gap-2"><span className="font-bold text-slate-400 w-4">{s.n}.</span>{s.text}</li>
          ))}
        </ol>
        <div className="flex flex-wrap gap-2 mt-4">
          {!pilot.website_tenant_id && (
            <AttachTenantBox busy={busy} act={act} />
          )}
          {pilot.is_synthetic && (
            <Button size="sm" variant="outline" onClick={() => act({ action: 'simulate_invitation' })} disabled={!!busy}>
              <History className="w-4 h-4 mr-1.5" /> Record simulated invitation
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => act({ action: 'record_milestone', key: 'first_sale_published' })} disabled={!!busy}>Mark first sale published</Button>
          <Button size="sm" variant="outline" onClick={() => act({ action: 'record_milestone', key: 'first_seller_lead' })} disabled={!!busy}>Mark first seller lead</Button>
          <Button size="sm" variant="outline" onClick={() => act({ action: 'record_milestone', key: 'published' })} disabled={!!busy}>Mark published</Button>
        </div>
      </div>

      {/* Checklist */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2"><ClipboardCheck className="w-4 h-4 text-cyan-600" /><span className="font-heading font-bold text-slate-900 text-sm">Launch checklist</span></div>
          <span className="text-xs text-slate-400">{doneCount}/{checklist.length} complete</span>
        </div>
        <div className="space-y-1">
          {checklist.map(item => (
            <button key={item.key} onClick={() => act({ action: 'toggle_checklist', key: item.key, done: !item.done })} disabled={!!busy}
              className="w-full flex items-center gap-2 text-sm px-2 py-1.5 rounded hover:bg-slate-50 text-left">
              {item.done ? <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" /> : <Circle className="w-4 h-4 text-slate-300 flex-shrink-0" />}
              <span className={item.done ? 'text-slate-400 line-through' : 'text-slate-700'}>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Timeline + checks */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-3"><History className="w-4 h-4 text-cyan-600" /><span className="font-heading font-bold text-slate-900 text-sm">Milestone timeline</span></div>
          {(pilot.milestones || []).length === 0 && <div className="text-sm text-slate-400">No milestones yet.</div>}
          <div className="space-y-2">
            {(pilot.milestones || []).map((m, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-1 flex-shrink-0" />
                <div>
                  <span className="text-slate-800">{m.label || MILESTONE_LABELS[m.key] || m.key}</span>
                  <span className="text-slate-400 text-xs block">{fmt(m.at)}{m.detail ? ` · ${m.detail}` : ''}</span>
                </div>
              </div>
            ))}
          </div>
          {d.timing && d.timing.total && (
            <div className="mt-3 pt-3 border-t border-slate-100 text-sm text-slate-600">
              Total elapsed: <span className="font-semibold">{Math.round(d.timing.total.hours * 10) / 10} hours</span>
              {d.timing.provision_to_published && <> · Provision → published: <span className="font-semibold">{Math.round(d.timing.provision_to_published.hours * 10) / 10} hours</span></>}
            </div>
          )}
          <div className="flex flex-wrap gap-2 mt-3">
            {[['24h', 'Record 24h check'], ['7d', 'Record 7-day check']].map(([k, label]) => (
              <Button key={k} size="sm" variant="outline" onClick={() => setConfirmAction({ kind: 'check', kind2: k, label })} disabled={!!busy}>{label}</Button>
            ))}
          </div>
          {(pilot.checks || []).map((c, i) => (
            <div key={i} className="mt-2 text-xs text-slate-500 border-l-2 border-slate-200 pl-2">
              <Badge className={c.result === 'pass' ? 'bg-green-50 text-green-700' : c.result === 'warn' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}>{c.kind} check · {c.result}</Badge>
              {c.summary && <div className="mt-1">{c.summary}</div>}
            </div>
          ))}
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-3"><Wrench className="w-4 h-4 text-cyan-600" /><span className="font-heading font-bold text-slate-900 text-sm">Friction, interventions & feedback</span></div>
          <div className="space-y-1 text-sm">
            {(pilot.friction_events || []).map((f, i) => (
              <div key={i} className="flex items-start gap-2"><AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-1 flex-shrink-0" /><div><span className="text-slate-700">{f.kind}</span>{f.detail && <span className="text-slate-400"> — {f.detail}</span>}</div></div>
            ))}
            {(pilot.interventions || []).map((x, i) => (
              <div key={`i${i}`} className="flex items-start gap-2"><Wrench className="w-3.5 h-3.5 text-slate-400 mt-1 flex-shrink-0" /><div><span className="text-slate-700">{x.category}</span>{x.note && <span className="text-slate-400"> — {x.note}</span>}</div></div>
            ))}
            {(pilot.operator_feedback || []).map((f, i) => (
              <div key={`f${i}`} className="flex items-start gap-2"><FileText className="w-3.5 h-3.5 text-cyan-500 mt-1 flex-shrink-0" /><div><span className="text-slate-700">{f.kind}: {f.value}</span>{f.comment && <span className="text-slate-400"> — {f.comment}</span>}</div></div>
            ))}
            {(pilot.friction_events || []).length + (pilot.interventions || []).length + (pilot.operator_feedback || []).length === 0 && (
              <div className="text-slate-400 text-sm">Nothing recorded yet.</div>
            )}
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <Button size="sm" variant="outline" onClick={() => setConfirmAction({ kind: 'friction', label: 'Record a friction event' })}>Record friction</Button>
            <Button size="sm" variant="outline" onClick={() => setConfirmAction({ kind: 'intervention', label: 'Record an intervention' })}>Record intervention</Button>
          </div>
        </div>
      </div>

      {/* Acceptance + scorecard */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="font-heading font-bold text-slate-900 text-sm mb-3">AI acceptance report</div>
          {!acceptance.has_ai_content ? (
            <div className="text-sm text-slate-400">No AI-generated content yet.</div>
          ) : (
            <div>
              <div className="grid grid-cols-3 gap-2 text-center mb-3">
                <div className="bg-slate-50 rounded-md p-2"><div className="font-bold text-slate-900">{acceptance.accepted_count}</div><div className="text-[11px] text-slate-400">Accepted as-is</div></div>
                <div className="bg-slate-50 rounded-md p-2"><div className="font-bold text-slate-900">{acceptance.edited_count}</div><div className="text-[11px] text-slate-400">Human-edited</div></div>
                <div className="bg-slate-50 rounded-md p-2"><div className="font-bold text-slate-900">{acceptance.factual_confirmed ? 'Yes' : 'No'}</div><div className="text-[11px] text-slate-400">Facts confirmed</div></div>
              </div>
              <div className="space-y-1 text-sm">
                {acceptance.sections.map(s => (
                  <div key={s.section} className="flex items-center justify-between">
                    <span className="text-slate-600 capitalize">{s.section.replace(/_/g, ' ')}</span>
                    <span className={s.accepted_unchanged ? 'text-green-700' : 'text-amber-700'}>{s.accepted_unchanged ? 'Accepted' : 'Edited'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="font-heading font-bold text-slate-900 text-sm mb-3">Pilot scorecard</div>
          <div className="space-y-1 text-sm">
            {(scorecard.categories || []).map(c => (
              <div key={c.key} className="flex items-center justify-between">
                <span className="text-slate-600">{c.label}</span>
                <Badge className={c.status === 'GREEN' ? 'bg-green-50 text-green-700' : c.status === 'RED' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}>{c.status}</Badge>
              </div>
            ))}
          </div>
          {pilot.review_30d && pilot.review_30d.recommendation && (
            <div className="mt-3 pt-3 border-t border-slate-100 text-sm">
              <span className="text-slate-400 text-xs block">30-day review</span>
              <span className="font-semibold text-slate-800 capitalize">{pilot.review_30d.recommendation.replace(/_/g, ' ')}</span>
            </div>
          )}
          {['PLATFORM_SITE_LIVE', 'CUSTOM_DOMAIN_PENDING', 'CUSTOM_DOMAIN_LIVE', 'FIRST_SALE_PUBLISHED', 'FIRST_LEAD_RECEIVED'].includes(pilot.stage) && !pilot.review_30d?.recommendation && (
            <Button size="sm" className="mt-3" onClick={() => setConfirmAction({ kind: 'review30', label: 'Complete the 30-day review' })}>Complete 30-day review…</Button>
          )}
        </div>
      </div>

      {/* Notes + feature requests */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex items-center gap-2 mb-3"><FileText className="w-4 h-4 text-cyan-600" /><span className="font-heading font-bold text-slate-900 text-sm">Admin notes</span></div>
        {(pilot.pilot_notes || []).map((n, i) => (
          <div key={i} className="text-sm text-slate-600 border-b border-slate-100 py-1.5 last:border-0">{n.text} <span className="text-slate-400 text-xs">{fmt(n.at)}</span></div>
        ))}
        {(pilot.pilot_notes || []).length === 0 && <div className="text-sm text-slate-400">No notes yet.</div>}
        <NoteBox busy={busy} act={act} />
        <div className="mt-4 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2 mb-2"><Lightbulb className="w-4 h-4 text-amber-500" /><span className="font-heading font-bold text-slate-900 text-sm">Feature requests (captured only)</span></div>
          {(pilot.feature_requests || []).map((f, i) => (
            <div key={i} className="text-sm text-slate-600">{f.title} <Badge className="ml-1 bg-slate-100 text-slate-600">{f.bucket}</Badge></div>
          ))}
          {(pilot.feature_requests || []).length === 0 && <div className="text-sm text-slate-400">None captured.</div>}
          <FeatureRequestBox busy={busy} act={act} />
        </div>
      </div>

      {/* Maintenance */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="font-heading font-bold text-slate-900 text-sm mb-2">Maintenance</div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setConfirmAction({ kind: 'reset', label: 'Reset website presentation' })} disabled={!website || website.status === 'active'}>
            <RotateCcw className="w-4 h-4 mr-1.5" /> Reset presentation to defaults
          </Button>
          {pilot.is_synthetic && (
            <Button size="sm" variant="destructive" onClick={() => setConfirmAction({ kind: 'cleanup', label: 'Clean up synthetic pilot' })}>
              <Trash2 className="w-4 h-4 mr-1.5" /> Delete synthetic pilot & its data
            </Button>
          )}
        </div>
        {website && website.status === 'active' && <div className="text-xs text-slate-400 mt-2">Suspend the website before resetting its presentation.</div>}
      </div>

      {/* Confirm / input modals */}
      {confirmAction && (
        <ActionModal
          config={confirmAction}
          busy={!!busy}
          onClose={() => setConfirmAction(null)}
          onConfirm={async (payload) => { await act(payload); }}
        />
      )}
    </div>
  );
}

function AttachTenantBox({ busy, act }) {
  const [tenantId, setTenantId] = useState('');
  const [open, setOpen] = useState(false);
  return open ? (
    <div className="flex gap-2 items-center">
      <input value={tenantId} onChange={e => setTenantId(e.target.value)} placeholder="Website tenant ID"
        className="px-3 py-1.5 rounded-md border border-slate-200 text-sm w-64" />
      <Button size="sm" disabled={!tenantId.trim() || !!busy} onClick={async () => { await act({ action: 'attach_tenant', website_tenant_id: tenantId.trim() }); setTenantId(''); setOpen(false); }}>Attach</Button>
      <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
    </div>
  ) : (
    <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Attach a launched website</Button>
  );
}

function NoteBox({ busy, act }) {
  const [text, setText] = useState('');
  return (
    <div className="flex gap-2 mt-2">
      <input value={text} onChange={e => setText(e.target.value)} placeholder="Add an admin note…"
        className="flex-1 px-3 py-1.5 rounded-md border border-slate-200 text-sm" />
      <Button size="sm" variant="outline" disabled={!text.trim() || !!busy}
        onClick={async () => { await act({ action: 'add_note', text }); setText(''); }}>Add</Button>
    </div>
  );
}

function FeatureRequestBox({ busy, act }) {
  const [title, setTitle] = useState('');
  const [bucket, setBucket] = useState('high_value');
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Feature request…"
        className="flex-1 min-w-[180px] px-3 py-1.5 rounded-md border border-slate-200 text-sm" />
      <select value={bucket} onChange={e => setBucket(e.target.value)} className="px-2 py-1.5 rounded-md border border-slate-200 text-sm bg-white">
        {['launch_blocker', 'high_value', 'nice_to_have', 'future'].map(b => <option key={b} value={b}>{b}</option>)}
      </select>
      <Button size="sm" variant="outline" disabled={!title.trim() || !!busy}
        onClick={async () => { await act({ action: 'add_feature_request', title, bucket }); setTitle(''); }}>Capture</Button>
    </div>
  );
}

function ActionModal({ config, busy, onClose, onConfirm }) {
  const { kind, kind2, label } = config;
  const [value, setValue] = useState('');
  const [result, setResult] = useState('pass');
  const [recommendation, setRecommendation] = useState('pass_with_improvements');
  const [detail, setDetail] = useState('');
  const [category, setCategory] = useState('other');
  const [resolved, setResolved] = useState(true);

  const confirm = async () => {
    if (kind === 'check') return onConfirm({ action: 'record_check', kind: kind2, result, summary: detail });
    if (kind === 'friction') return onConfirm({ action: 'record_friction', kind: value, detail, resolved });
    if (kind === 'intervention') return onConfirm({ action: 'record_intervention', category, note: detail });
    if (kind === 'review30') return onConfirm({ action: 'complete_30d', recommendation, summary: detail });
    if (kind === 'reset') return onConfirm({ action: 'reset_presentation', confirm: true });
    if (kind === 'cleanup') return onConfirm({ action: 'cleanup_synthetic' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg max-w-md w-full max-h-[85vh] overflow-y-auto p-5" onClick={e => e.stopPropagation()}>
        <h3 className="font-heading font-bold text-lg text-slate-900 mb-1">{label}</h3>
        {kind === 'reset' && <p className="text-sm text-slate-500 mb-4">This restores the website's content sections to platform defaults. A version snapshot is saved first, so the operator's current version can be recovered. Their company data, sales and leads are never touched.</p>}
        {kind === 'cleanup' && <p className="text-sm text-slate-500 mb-4">This permanently deletes the synthetic pilot and every record it created (tracked by exact ID). This cannot be undone.</p>}

        {kind === 'check' && (
          <div className="space-y-3 mb-4">
            <div><label className="text-xs font-semibold text-slate-500 block mb-1">Result</label>
              <select value={result} onChange={e => setResult(e.target.value)} className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm bg-white">
                {['pass', 'warn', 'fail'].map(r => <option key={r} value={r}>{r}</option>)}
              </select></div>
            <div><label className="text-xs font-semibold text-slate-500 block mb-1">Summary</label>
              <textarea value={detail} onChange={e => setDetail(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm" /></div>
          </div>
        )}
        {kind === 'friction' && (
          <div className="space-y-3 mb-4">
            <div><label className="text-xs font-semibold text-slate-500 block mb-1">Kind</label>
              <input value={value} onChange={e => setValue(e.target.value)} placeholder="e.g. ai_generation_failed" className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm" /></div>
            <div><label className="text-xs font-semibold text-slate-500 block mb-1">Detail</label>
              <textarea value={detail} onChange={e => setDetail(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm" /></div>
            <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={resolved} onChange={e => setResolved(e.target.checked)} /> Already resolved</label>
          </div>
        )}
        {kind === 'intervention' && (
          <div className="space-y-3 mb-4">
            <div><label className="text-xs font-semibold text-slate-500 block mb-1">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm bg-white">
                {['account', 'business_info', 'branding', 'content', 'media', 'services', 'sales', 'domain', 'seo', 'lead_forms', 'other'].map(c => <option key={c} value={c}>{c}</option>)}
              </select></div>
            <div><label className="text-xs font-semibold text-slate-500 block mb-1">Note</label>
              <textarea value={detail} onChange={e => setDetail(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm" /></div>
          </div>
        )}
        {kind === 'review30' && (
          <div className="space-y-3 mb-4">
            <div><label className="text-xs font-semibold text-slate-500 block mb-1">Recommendation</label>
              <select value={recommendation} onChange={e => setRecommendation(e.target.value)} className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm bg-white">
                {[['pass', 'Pass'], ['pass_with_improvements', 'Pass with improvements'], ['extend_pilot', 'Extend pilot'], ['fail', 'Fail']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select></div>
            <div><label className="text-xs font-semibold text-slate-500 block mb-1">Summary</label>
              <textarea value={detail} onChange={e => setDetail(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm" /></div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={confirm} disabled={busy || ((kind === 'friction') && !value.trim())} className={(kind === 'cleanup') ? 'bg-red-600 hover:bg-red-700 text-white' : ''}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm'}
          </Button>
        </div>
      </div>
    </div>
  );
}