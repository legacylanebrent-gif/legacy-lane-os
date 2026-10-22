import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, ClipboardCheck, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

// Chapter 23 P1 — FIVE-MINUTE POST-SALE REVIEW on the canonical SaleRecap
// (no new entity): what worked / didn't / surprised / change next time + team
// input. Also records NEAR MISSES as SaleIssue records (is_near_miss), with
// the control weakness and a corrective action destination. Human judgment
// only — AI never writes these.

const FIELDS = [
  ['what_worked', 'What worked?'],
  ['what_didnt', "What didn't?"],
  ['surprised_us', 'What surprised us?'],
  ['change_next_time', 'What would we change next time?'],
  ['team_input', 'Team input'],
];

export default function PostSaleReviewCard({ sale }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recapId, setRecapId] = useState(null);
  const [review, setReview] = useState({});
  const [savedAt, setSavedAt] = useState(null);

  const [near, setNear] = useState({ open: false, what_happened: '', prevented: '', weakness: 'process', impact: '', action_type: 'NONE', action_note: '' });

  useEffect(() => { load(); }, [sale?.id]);

  const load = async () => {
    if (!sale?.id) { setLoading(false); return; }
    try {
      const existing = await base44.entities.SaleRecap.filter({ sale_id: sale.id });
      if (existing.length > 0) {
        setRecapId(existing[0].id);
        setReview(existing[0].post_sale_review || {});
        setSavedAt(existing[0].post_sale_review?.recorded_at || null);
      }
    } catch (e) {
      console.error('Could not load post-sale review:', e);
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const me = await base44.auth.me();
      const fields = { post_sale_review: { ...review, recorded_at: new Date().toISOString(), recorded_by_name: me?.full_name || '' } };
      if (recapId) await base44.entities.SaleRecap.update(recapId, fields);
      else {
        const created = await base44.entities.SaleRecap.create({ sale_id: sale.id, operator_id: sale.operator_id, ...fields });
        setRecapId(created.id);
      }
      setSavedAt(fields.post_sale_review.recorded_at);
      toast.success('Post-sale review saved');
    } catch (e) {
      toast.error('Could not save the review');
    } finally {
      setSaving(false);
    }
  };

  const saveNearMiss = async () => {
    if (!near.what_happened.trim() || !near.prevented.trim()) {
      toast.error('Describe what almost happened and what prevented the loss');
      return;
    }
    setSaving(true);
    try {
      const me = await base44.auth.me();
      await base44.entities.SaleIssue.create({
        sale_id: sale.id,
        operator_id: sale.operator_id,
        sale_team_ids: sale.sale_team || [],
        title: `NEAR MISS — ${near.what_happened.trim().slice(0, 80)}`,
        description: `What almost happened: ${near.what_happened.trim()}\nWhat prevented the loss: ${near.prevented.trim()}`,
        category: 'other',
        urgency: 'ROUTINE',
        status: 'RESOLVED',
        resolution: near.prevented.trim(),
        resolution_source: 'answer_only',
        resolved_at: new Date().toISOString(),
        is_near_miss: true,
        control_weakness: near.weakness,
        impact_avoided_note: near.impact.trim(),
        corrective_action: {
          action_type: near.action_type,
          note: near.action_note.trim(),
          recorded_by_name: me?.full_name || '',
          recorded_at: new Date().toISOString(),
        },
        source_type: 'MANUAL',
        source_label: 'Chapter 23 post-sale near-miss review',
      });
      toast.success('Near miss recorded with its corrective action');
      setNear({ open: false, what_happened: '', prevented: '', weakness: 'process', impact: '', action_type: 'NONE', action_note: '' });
    } catch (e) {
      toast.error('Could not record the near miss');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2 flex-wrap">
          <ClipboardCheck className="w-4 h-4 text-slate-600" /> Five-Minute Post-Sale Review
          {savedAt && <Badge variant="outline" className="bg-emerald-50 text-emerald-700">saved {new Date(savedAt).toLocaleDateString()}</Badge>}
        </CardTitle>
        <p className="text-xs text-slate-500">
          Operator-owned reflection on the project record — the plain conclusions that make the next project easier to estimate and run.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid md:grid-cols-2 gap-3">
          {FIELDS.map(([key, label]) => (
            <div key={key}>
              <p className="text-xs font-medium text-slate-600 mb-1">{label}</p>
              <Textarea
                rows={2}
                className="text-sm"
                value={review[key] || ''}
                onChange={e => setReview(r => ({ ...r, [key]: e.target.value }))}
                placeholder="Plain words…"
              />
            </div>
          ))}
        </div>
        <Button size="sm" className="text-xs" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />} Save review
        </Button>

        {/* Near miss */}
        <div className="pt-2 border-t border-slate-100">
          {!near.open ? (
            <Button size="sm" variant="outline" className="text-xs" onClick={() => setNear(n => ({ ...n, open: true }))}>
              <ShieldAlert className="w-3 h-3 mr-1" /> Record a near miss
            </Button>
          ) : (
            <div className="space-y-2 border border-slate-200 rounded p-3">
              <p className="text-xs font-semibold text-slate-700">Near miss — a problem caught before meaningful loss</p>
              <Textarea rows={2} className="text-xs" placeholder="What almost happened (e.g. a paid item nearly entered the cleanout scope)" value={near.what_happened} onChange={e => setNear(n => ({ ...n, what_happened: e.target.value }))} />
              <Textarea rows={2} className="text-xs" placeholder="What prevented the loss (the guard, check, or person that caught it)" value={near.prevented} onChange={e => setNear(n => ({ ...n, prevented: e.target.value }))} />
              <Textarea rows={1} className="text-xs" placeholder="Impact avoided, if honestly known" value={near.impact} onChange={e => setNear(n => ({ ...n, impact: e.target.value }))} />
              <div className="grid grid-cols-2 gap-2">
                <select className="text-xs border rounded p-1.5" value={near.weakness} onChange={e => setNear(n => ({ ...n, weakness: e.target.value }))}>
                  <option value="process">Control weakness: process</option>
                  <option value="policy">Control weakness: policy</option>
                  <option value="training">Control weakness: training</option>
                  <option value="system">Control weakness: system</option>
                  <option value="authority">Control weakness: authority</option>
                  <option value="communication">Control weakness: communication</option>
                  <option value="other">Control weakness: other</option>
                </select>
                <select className="text-xs border rounded p-1.5" value={near.action_type} onChange={e => setNear(n => ({ ...n, action_type: e.target.value }))}>
                  <option value="NONE">Corrective action: none yet</option>
                  <option value="SALE_TASK">Corrective action: task on this sale</option>
                  <option value="POLICY_SUGGESTION">Corrective action: policy/SOP suggestion</option>
                  <option value="TRAINING_ITEM">Corrective action: training item</option>
                  <option value="SYSTEM_IMPROVEMENT">Corrective action: system improvement</option>
                </select>
              </div>
              {near.action_type !== 'NONE' && (
                <Textarea rows={1} className="text-xs" placeholder="The suggestion/draft (policy wording, training scenario…)" value={near.action_note} onChange={e => setNear(n => ({ ...n, action_note: e.target.value }))} />
              )}
              <div className="flex gap-1.5">
                <Button size="sm" className="h-7 text-xs" onClick={saveNearMiss} disabled={saving}>Save near miss</Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setNear(n => ({ ...n, open: false }))}>Cancel</Button>
              </div>
              <p className="text-[10px] text-slate-400">A corrective action here is a recorded suggestion — company policy is never changed automatically.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}