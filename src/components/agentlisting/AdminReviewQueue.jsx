import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { adminApi } from './listingApi';

export default function AdminReviewQueue({ queue, onResolved }) {
  const [picked, setPicked] = useState({});
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const resolve = async (row, decision) => {
    setBusy(`${row.id}:${decision}`);
    setError('');
    try {
      await adminApi.resolveMatch(row.id, decision, picked[row.id], '');
      onResolved?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-base font-semibold text-slate-900">Match review queue</h3>
      <p className="mt-1 text-xs text-slate-600">
        Possible matches and conflicting evidence across every agent. Confirming a candidate marks ownership verified for
        that agent; nothing is auto-confirmed.
      </p>
      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
      {queue.length === 0 && <p className="mt-3 text-sm text-slate-500">Nothing waiting for review.</p>}
      <div className="mt-3 space-y-3">
        {queue.map((row) => (
          <div key={row.id} className="rounded-lg border border-slate-200 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-slate-900">{row.address}</p>
                <p className="text-xs text-slate-500">
                  {row.agent_name} · {row.match_status} · {row.rule_used?.replace(/_/g, ' ')} ·{' '}
                  {row.candidate_count} candidate{row.candidate_count === 1 ? '' : 's'}
                </p>
                {row.conflict_note && <p className="mt-1 text-xs text-amber-800">{row.conflict_note}</p>}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => resolve(row, 'confirm')}
                  disabled={!!busy}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {busy === `${row.id}:confirm` && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  Confirm
                </Button>
                <Button size="sm" variant="outline" onClick={() => resolve(row, 'reject')} disabled={!!busy}>
                  {busy === `${row.id}:reject` && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  Reject
                </Button>
              </div>
            </div>
            <input
              value={picked[row.id] || ''}
              onChange={(e) => setPicked({ ...picked, [row.id]: e.target.value })}
              placeholder="Candidate record id (from the agent's candidate list)"
              className="mt-2 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
            />
          </div>
        ))}
      </div>
    </section>
  );
}