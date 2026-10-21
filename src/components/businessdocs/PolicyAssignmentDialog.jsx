import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Loader2, CheckCircle2, Send, ClipboardCopy } from 'lucide-react';
import { fmtDateTime } from './documentModel';

// Operator-side policy assignment + acknowledgment tracking for ONE POLICY
// document, at its CURRENT version. Assignment snapshots the current version;
// acknowledgment (in-app by the worker, or recorded offline by the operator)
// always records the version actually acknowledged — a replaced policy is
// never silently considered acknowledged.
export default function PolicyAssignmentDialog({ open, doc, teamMembers, operatorId, onClose, onChanged }) {
  const [acks, setAcks] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    if (!open) { setAcks(null); return; }
    let alive = true;
    setLoading(true);
    base44.entities.PolicyAcknowledgment.filter({ business_document_id: doc.id })
      .then(r => { if (alive) setAcks(Array.isArray(r) ? r : (r.items || [])); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [open, doc?.id]);

  if (!open || !doc) return null;
  const version = doc.version || 1;

  const recordFor = (member) => (acks || []).filter(a => a.team_member_id === member.id);

  const assign = async (member) => {
    setBusyId(member.id);
    try {
      const existing = recordFor(member).find(a => a.document_version === version);
      if (existing) {
        await base44.entities.PolicyAcknowledgment.update(existing.id, {
          status: 'ASSIGNED', acknowledged_at: null, acknowledged_version: null,
        });
      } else {
        await base44.entities.PolicyAcknowledgment.create({
          operator_id: operatorId,
          business_document_id: doc.id,
          team_member_id: member.id,
          user_id: member.user_id || null,
          document_version: version,
          document_title: doc.title,
          status: 'ASSIGNED',
          assigned_at: new Date().toISOString(),
        });
      }
      const r = await base44.entities.PolicyAcknowledgment.filter({ business_document_id: doc.id });
      setAcks(Array.isArray(r) ? r : (r.items || []));
      onChanged?.();
    } catch (e) {
      alert('Could not assign the policy');
    } finally {
      setBusyId(null);
    }
  };

  const markOffline = async (record) => {
    setBusyId(record.team_member_id);
    try {
      await base44.entities.PolicyAcknowledgment.update(record.id, {
        status: 'ACKNOWLEDGED',
        acknowledged_at: new Date().toISOString(),
        acknowledged_version: version,
        notes: (record.notes ? record.notes + ' ' : '') + 'Recorded by operator.',
      });
      const r = await base44.entities.PolicyAcknowledgment.filter({ business_document_id: doc.id });
      setAcks(Array.isArray(r) ? r : (r.items || []));
      onChanged?.();
    } catch {
      alert('Could not record the acknowledgment');
    } finally {
      setBusyId(null);
    }
  };

  const shareLink = `${window.location.origin}/MyPolicies`;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-900 truncate">{doc.title}</h3>
            <p className="text-xs text-slate-500">Version {version} — acknowledgment status per team member</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
        </div>

        <div className="rounded-lg bg-slate-50 p-2.5 text-[11px] text-slate-600 space-y-1">
          <p>Workers with an account sign in and open <strong>Team Policies</strong> to read and acknowledge in-app.</p>
          <div className="flex items-center gap-2">
            <code className="text-[10px] bg-white border rounded px-1.5 py-0.5 truncate flex-1">{shareLink}</code>
            <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => { navigator.clipboard?.writeText(shareLink); setCopied(true); }}>
              {copied ? <CheckCircle2 className="w-3 h-3 text-green-600" /> : <ClipboardCopy className="w-3 h-3" />} Copy
            </Button>
          </div>
        </div>

        {loading ? (
          <p className="text-center text-slate-400 py-4 text-sm"><Loader2 className="w-4 h-4 animate-spin inline mr-1" />Loading…</p>
        ) : (teamMembers || []).length === 0 ? (
          <p className="text-center text-slate-400 py-4 text-sm">No active team members yet — add workers on the Team Members page.</p>
        ) : (
          <div className="space-y-2">
            {teamMembers.map(m => {
              const records = recordFor(m);
              const ackedCurrent = records.find(a => a.status === 'ACKNOWLEDGED' && (a.acknowledged_version || 0) === version);
              const pendingCurrent = records.find(a => a.document_version === version && !ackedCurrent);
              const busy = busyId === m.id;
              let badge;
              if (ackedCurrent) badge = <Badge className="bg-green-100 text-green-700">Acknowledged v{version}</Badge>;
              else if (pendingCurrent) badge = <Badge className="bg-amber-100 text-amber-700">Pending v{version}</Badge>;
              else if (records.some(a => a.status === 'ACKNOWLEDGED')) badge = <Badge className="bg-slate-100 text-slate-500">Acknowledged an earlier version</Badge>;
              else badge = <Badge variant="outline" className="bg-slate-50 text-slate-400">Not assigned</Badge>;
              return (
                <div key={m.id} className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-slate-200">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {m.name} {!m.user_id && <span className="text-[10px] text-slate-400">(no account)</span>}
                    </p>
                    {ackedCurrent && <p className="text-[10px] text-slate-400">Acknowledged {fmtDateTime(ackedCurrent.acknowledged_at)}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {badge}
                    {!ackedCurrent && (
                      pendingCurrent && !pendingCurrent.user_id ? (
                        <Button size="sm" variant="outline" className="h-7" disabled={busy} onClick={() => markOffline(pendingCurrent)}>
                          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />} Mark acknowledged
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" className="h-7" disabled={busy} onClick={() => assign(m)}>
                          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />} Assign v{version}
                        </Button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}