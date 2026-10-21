import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Eye, CheckCircle2, FileCheck2, ShieldCheck } from 'lucide-react';

// Chapter 6 P1 — the worker's policy page. Workers only see policies assigned
// to THEM (served by the policyAcknowledgments seam — the vault itself stays
// operator-only). Viewing a policy is never the same as acknowledging it:
// acknowledgment is an explicit action that records who, what version, when.
export default function MyPolicies() {
  const [items, setItems] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    try {
      const res = await base44.functions.invoke('policyAcknowledgments', { action: 'list' });
      setItems(res.data?.items || []);
    } catch (e) {
      console.error(e);
      setItems([]);
    }
  };

  useEffect(() => { load(); }, []);

  const acknowledge = async (item) => {
    if (!confirm('Confirm you have read and understood this policy. Your acknowledgment records the current version and today\'s date.')) return;
    setBusyId(item.id);
    try {
      await base44.functions.invoke('policyAcknowledgments', { action: 'acknowledge', acknowledgment_id: item.id });
      await load();
    } catch (e) {
      alert(e?.response?.data?.error || 'Could not record the acknowledgment');
    } finally {
      setBusyId(null);
    }
  };

  if (items === null) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-indigo-600" /> Team Policies
        </h1>
        <p className="text-xs text-slate-500">Policies your company assigned to you. Reading a policy is not acknowledging it — confirm after you've read it.</p>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <FileCheck2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p className="text-sm">No policies assigned to you right now.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id} className="p-4 rounded-xl border border-slate-200 bg-white">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{item.document_title}</p>
                  <p className="text-xs text-slate-500">
                    {item.policy_type || 'Policy'} · Version {item.current_version}
                  </p>
                </div>
                {item.status === 'ACKNOWLEDGED' ? (
                  <Badge className={item.acknowledged_current ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
                    {item.acknowledged_current ? `Acknowledged v${item.acknowledged_version}` : 'Policy updated — needs re-acknowledgment'}
                  </Badge>
                ) : (
                  <Badge className="bg-amber-100 text-amber-700">Assigned — awaiting acknowledgment</Badge>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5 mt-3">
                <Button size="sm" variant="outline" disabled={!item.signed_url} onClick={() => window.open(item.signed_url, '_blank')}>
                  <Eye className="w-3.5 h-3.5" /> Read policy
                </Button>
                {item.status !== 'ACKNOWLEDGED' && item.document_status === 'ACTIVE' && (
                  <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" disabled={busyId === item.id} onClick={() => acknowledge(item)}>
                    {busyId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    I acknowledge this policy
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}