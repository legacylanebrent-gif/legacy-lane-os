import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, Users, Info } from 'lucide-react';

// Chapter 5 P1 — structured client-fit assessment on the canonical pipeline deal.
// Rates OBSERVABLE PROJECT CONDITIONS (never personality/psychology/character).
// Feeds the existing Sale Acceptance Scorecard as advisory, explainable input —
// it never auto-accepts or auto-rejects a client.

export const CLIENT_FIT_DIMENSIONS = [
  { key: 'communication', label: 'Communication' },
  { key: 'authority_clarity', label: 'Decision authority clarity' },
  { key: 'expectation_realism', label: 'Expectation realism' },
  { key: 'deadline_realism', label: 'Deadline realism' },
  { key: 'responsiveness', label: 'Responsiveness' },
  { key: 'family_complexity', label: 'Family / decision complexity' },
  { key: 'scope_stability', label: 'Scope stability' },
  { key: 'property_access', label: 'Property access / cooperation' },
];

export const CLIENT_FIT_OPTIONS = [
  { value: 'good', label: 'GOOD', tone: 'bg-green-100 text-green-700 border-green-300' },
  { value: 'caution', label: 'CAUTION', tone: 'bg-amber-100 text-amber-700 border-amber-300' },
  { value: 'concern', label: 'CONCERN', tone: 'bg-red-100 text-red-700 border-red-300' },
  { value: 'unknown', label: 'UNKNOWN', tone: 'bg-slate-100 text-slate-600 border-slate-300' },
];

export default function ClientFitPanel({ deal, onPersist }) {
  const [saving, setSaving] = useState(false);
  const [ratings, setRatings] = useState(() => {
    const existing = deal?.client_fit || {};
    const init = { notes: existing.notes || '' };
    CLIENT_FIT_DIMENSIONS.forEach(d => { init[d.key] = existing[d.key] || 'unknown'; });
    return init;
  });

  const save = async () => {
    setSaving(true);
    try {
      const client_fit = { ...ratings };
      CLIENT_FIT_DIMENSIONS.forEach(d => { client_fit[d.key] = client_fit[d.key] || 'unknown'; });
      await onPersist({ client_fit });
    } catch (e) {
      alert('Could not save client fit assessment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Users className="w-4 h-4 text-slate-500" /> Client Fit Assessment
        </CardTitle>
        <p className="text-xs text-slate-500">
          Rate the observable project conditions — not the person. This is a planning tool that feeds the
          acceptance scorecard as advice; it never makes the accept/reject decision for you.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          {CLIENT_FIT_DIMENSIONS.map(d => (
            <div key={d.key} className="flex items-center justify-between gap-2 border border-slate-200 rounded-md p-2">
              <span className="text-sm text-slate-700">{d.label}</span>
              <div className="flex gap-1">
                {CLIENT_FIT_OPTIONS.map(o => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setRatings(p => ({ ...p, [d.key]: o.value }))}
                    className={`px-2 py-1 rounded text-[10px] font-semibold border transition-colors ${
                      ratings[d.key] === o.value ? o.tone : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div>
          <label className="text-xs text-slate-500">Notes (optional — context where it matters)</label>
          <textarea
            value={ratings.notes}
            onChange={e => setRatings(p => ({ ...p, notes: e.target.value }))}
            rows={2}
            className="w-full mt-1 rounded-md border border-input bg-white p-2 text-sm"
            placeholder="e.g. Two executors must both approve; very tight move-out deadline; excellent phone responsiveness…"
          />
        </div>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-start gap-2 text-xs text-slate-500 max-w-md">
            <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>Assess observable conditions only. This tool does not make psychological, medical, legal, or character judgments, and CAUTION or CONCERN never blocks accepting a sale.</span>
          </div>
          <Button onClick={save} disabled={saving} className="bg-orange-600 hover:bg-orange-700 gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Assessment
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}