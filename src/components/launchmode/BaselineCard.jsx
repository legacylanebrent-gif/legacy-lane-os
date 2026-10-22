import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CalendarCheck, Loader2 } from 'lucide-react';

// Chapter 27 P1 — DAY 1 BASELINE. Assumptions recorded before operating history
// changes them. Unknown stays unknown ("UNKNOWN" / "NOT YET ESTIMATED" /
// "NOT APPLICABLE"). Historical truth: amending appends the prior version to
// baseline_history — Day 1 is never silently rewritten.

const FIELDS = [
  ['expected_project_volume', 'Expected project volume (per quarter)'],
  ['expected_prep_hours', 'Expected preparation labor (per project)'],
  ['expected_owner_hours', 'Expected owner hours (per week)'],
  ['expected_company_revenue', 'Expected company revenue (per project)'],
  ['expected_lead_source', 'Expected primary lead source'],
  ['expected_marketing_channels', 'Expected marketing channels'],
  ['expected_strong_categories', 'Expected strong merchandise categories'],
  ['expected_service_model', 'Expected service model'],
  ['expected_team', 'Expected team / staffing'],
  ['expected_capacity', 'Expected capacity'],
];

export default function BaselineCard({ launch, saving, onSave }) {
  const baseline = launch?.baseline;
  const [editing, setEditing] = useState(!baseline);
  const [confirmAmend, setConfirmAmend] = useState(false);
  const [amendReason, setAmendReason] = useState('');
  const [form, setForm] = useState(() => {
    const a = baseline?.assumptions || {};
    const o = {};
    FIELDS.forEach(([k]) => { o[k] = a[k] || ''; });
    return o;
  });

  const save = async () => {
    await onSave({ baseline: form, amendReason: confirmAmend ? amendReason : '' });
    setEditing(false); setConfirmAmend(false); setAmendReason('');
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <CalendarCheck className="w-4 h-4 text-cyan-600" /> Day 1 Baseline
        </p>
        {baseline && (
          <Badge className="bg-slate-100 text-slate-600 border border-slate-300">
            v{baseline.version} · {new Date(baseline.recorded_at).toLocaleDateString()} · {baseline.recorded_by_name}
          </Badge>
        )}
      </div>
      <p className="text-[11px] text-slate-500">
        Day 1 runs on assumptions; Day 90 runs on evidence. Record what you EXPECT now — before real projects change you.
        Values may honestly be <strong>UNKNOWN</strong>, <strong>NOT YET ESTIMATED</strong> or <strong>NOT APPLICABLE</strong>. Fake precision is never required.
      </p>
      {baseline && !editing ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {FIELDS.map(([k, label]) => (
            <div key={k} className="border border-slate-100 rounded-lg p-2">
              <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
              <p className="text-xs font-medium text-slate-800">{baseline.assumptions?.[k] || 'UNKNOWN'}</p>
            </div>
          ))}
          <div className="sm:col-span-2 border border-slate-100 rounded-lg p-2">
            <p className="text-[10px] uppercase tracking-wide text-slate-400">Key business assumptions</p>
            <p className="text-xs font-medium text-slate-800">{baseline.assumptions?.key_assumptions_note || '—'}</p>
          </div>
          {(launch.baseline_history || []).length > 0 && (
            <div className="sm:col-span-2 text-[10px] text-slate-400">
              {launch.baseline_history.length} earlier baseline version(s) preserved as history.
            </div>
          )}
          <div className="sm:col-span-2">
            <Button variant="outline" size="sm" onClick={() => { setEditing(true); setConfirmAmend(true); }} className="text-xs">
              Amend baseline (history is preserved)
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {confirmAmend && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
              <p className="text-xs text-amber-800 font-medium">You are about to AMEND the Day 1 baseline. The current version is preserved in history — Day 1 truth is never rewritten silently.</p>
              <Input value={amendReason} onChange={(e) => setAmendReason(e.target.value)} placeholder="Why is the baseline being amended? (recorded, never silent)" />
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {FIELDS.map(([k, label]) => (
              <label key={k} className="block">
                <span className="text-[10px] uppercase tracking-wide text-slate-400">{label}</span>
                <Input value={form[k]} onChange={(e) => setForm(f => ({ ...f, [k]: e.target.value }))} placeholder="e.g. 40 hours / UNKNOWN" className="text-xs h-8" />
              </label>
            ))}
          </div>
          <label className="block">
            <span className="text-[10px] uppercase tracking-wide text-slate-400">Other key assumptions (your own words)</span>
            <Textarea rows={2} value={form.key_assumptions_note} onChange={(e) => setForm(f => ({ ...f, key_assumptions_note: e.target.value }))} className="text-xs" />
          </label>
          <Button onClick={save} disabled={saving} size="sm" className="text-xs gap-1.5">
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : null}{baseline ? 'Save amended baseline' : 'Record Day 1 baseline'}
          </Button>
        </div>
      )}
    </div>
  );
}