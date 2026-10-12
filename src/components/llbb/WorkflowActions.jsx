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
  const main = list.filter(t => t !== 'archived')[0];

  const go = async (to) => {
    setBusy(to); setError(null);
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