// LLBB product workflow actions (Phase 4A — Part 6).
// Buttons for the server-validated transitions available on the current
// workflow state. Launch-blocker denials surface the exact reasons.
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { TRANSITION_LABELS } from '@/components/llbb/managerConfig';
import { Loader2 } from 'lucide-react';

export default function WorkflowActions({ overview, onDone, primary }) {
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const list = (overview && overview.allowed_transitions) || [];
  // Phase 4D — review-gated transitions (ready_for_review / approved /
  // changes_requested) run exclusively through the ReviewActions seam, which
  // enforces readiness, review notes and staleness. They never render here.
  const REVIEW_SEAM_TRANSITIONS = ['ready_for_review', 'approved', 'changes_requested'];
  const filtered = list.filter(t => !REVIEW_SEAM_TRANSITIONS.includes(t));
  const main = filtered.filter(t => t !== 'archived')[0];

  const go = async (to) => {
    setBusy(to); setError(null);
    // Phase 4E (Part 3) — publishing always runs the publish preflight first:
    // the same extended checks the server enforces, shown BEFORE the attempt.
    if (to === 'live') {
      try {
        const pre = await base44.functions.invoke('llbbAdmin', { action: 'publish_preflight', website_tenant_id: overview.tenant.id });
        if (pre.data && pre.data.can_publish === false) {
          setError(`Publish blocked: ${pre.data.blockers.map(b => b.label).join(', ')}`);
          setBusy(null);
          return;
        }
      } catch (e) {
        setError('Could not run the publish preflight.');
        setBusy(null);
        return;
      }
    }
    try {
      await base44.functions.invoke('llbbAdmin', { action: 'workflow', website_tenant_id: overview.tenant.id, to });
      if (onDone) await onDone();
    } catch (e) {
      const d = e.response && e.response.data && e.response.data.error;
      setError(d
        ? (d.blockers ? `${d.message}: ${d.blockers.map(b => b.label).join(', ')}` : (d.message || d.code))
        : 'Transition failed.');
    }
    setBusy(null);
  };

  if (!list.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {primary && main && (
        <Button size="sm" disabled={!!busy} onClick={() => go(main)}>
          {busy === main && <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />}
          {TRANSITION_LABELS[main] || main}
        </Button>
      )}
      {!primary && list.map((t) => (
        <Button key={t} size="sm" variant={t === 'archived' ? 'ghost' : 'outline'} disabled={!!busy} onClick={() => go(t)}>
          {busy === t && <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />}
          {TRANSITION_LABELS[t] || t}
        </Button>
      ))}
      {error && <span className="text-xs text-red-600 max-w-xs">{error}</span>}
    </div>
  );
}