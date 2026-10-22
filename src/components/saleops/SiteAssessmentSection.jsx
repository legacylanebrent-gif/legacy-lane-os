import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Home, Info } from 'lucide-react';

// Chapter 5 P1 — canonical operational site assessment (lives on EstateSale —
// the single editable copy; no second property entity, no deal-side duplicate).
// Answers one question: what about this property will affect the work?
// Fast enough to complete during a consultation or site visit. "unknown" is the
// honest default — the system never guesses site conditions.

const SELECTS = [
  {
    key: 'stairs_levels', label: 'Stairs / levels',
    options: [['single_level', 'Single level'], ['one_flight', 'One flight'], ['multiple_flights', 'Multiple flights'], ['unknown', 'Unknown']],
  },
  {
    key: 'elevator', label: 'Elevator',
    options: [['yes', 'Yes'], ['no', 'No'], ['unknown', 'Unknown']],
  },
  {
    key: 'parking', label: 'Parking',
    options: [['easy', 'Easy'], ['limited', 'Limited'], ['difficult', 'Difficult'], ['unknown', 'Unknown']],
  },
  {
    key: 'gated_access', label: 'Gated / controlled access',
    options: [['no', 'No'], ['gated', 'Gated'], ['controlled_entry', 'Controlled entry'], ['unknown', 'Unknown']],
  },
  {
    key: 'community_restrictions', label: 'HOA / community restrictions',
    options: [['none', 'None'], ['some', 'Some'], ['significant', 'Significant'], ['unknown', 'Unknown']],
  },
  {
    key: 'loading_access', label: 'Loading / removal access',
    options: [['easy', 'Easy'], ['limited', 'Limited'], ['difficult', 'Difficult'], ['unknown', 'Unknown']],
  },
  {
    key: 'merchandise_volume', label: 'Merchandise volume',
    options: [['light', 'Light'], ['moderate', 'Moderate'], ['heavy', 'Heavy'], ['unknown', 'Unknown']],
  },
  {
    key: 'pickup_constraints', label: 'Pickup constraints',
    options: [['none', 'None'], ['limited', 'Limited'], ['difficult', 'Difficult'], ['unknown', 'Unknown']],
  },
];

export default function SiteAssessmentSection({ value, onChange }) {
  const site = value || {};
  const set = (key, v) => onChange({ ...site, [key]: v });

  return (
    <div className="space-y-3">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Home className="w-4 h-4 text-slate-500" /> Operational Site Assessment
        </CardTitle>
        <p className="text-xs text-slate-500">
          What about this property will affect the work? Fill this in during the consultation or site visit —
          it feeds the acceptance scorecard and your market intelligence. Not a home inspection.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-500">Property type</label>
            <input
              value={site.property_type || ''}
              onChange={e => set('property_type', e.target.value)}
              placeholder="Single-family home, condo, estate property…"
              className="w-full mt-1 h-9 px-2 rounded-md border border-input bg-white text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">Approximate size</label>
            <input
              value={site.approx_size || ''}
              onChange={e => set('approx_size', e.target.value)}
              placeholder="e.g. 2-bedroom, ~3000 sq ft, packed 3-story house"
              className="w-full mt-1 h-9 px-2 rounded-md border border-input bg-white text-sm"
            />
          </div>
          {SELECTS.map(s => (
            <div key={s.key}>
              <label className="text-xs text-slate-500">{s.label}</label>
              <select
                value={site[s.key] || 'unknown'}
                onChange={e => set(s.key, e.target.value)}
                className="w-full mt-1 h-9 px-2 rounded-md border border-input bg-white text-sm"
              >
                {s.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          ))}
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-500">Garage / outbuildings / storage areas</label>
            <input
              value={site.storage_areas || ''}
              onChange={e => set('storage_areas', e.target.value)}
              placeholder="Garage, shed, attic, basement, off-site storage…"
              className="w-full mt-1 h-9 px-2 rounded-md border border-input bg-white text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">Sale-day restrictions (HOA hours, signs, traffic…)</label>
            <input
              value={site.sale_day_restrictions || ''}
              onChange={e => set('sale_day_restrictions', e.target.value)}
              placeholder="Permitted hours, no signage allowed, single entry road…"
              className="w-full mt-1 h-9 px-2 rounded-md border border-input bg-white text-sm"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-500">Other operational notes</label>
          <textarea
            value={site.notes || ''}
            onChange={e => set('notes', e.target.value)}
            rows={2}
            className="w-full mt-1 rounded-md border border-input bg-white p-2 text-sm"
            placeholder="Anything else that affects the work…"
          />
        </div>
        <div className="flex items-start gap-2 text-xs text-slate-500">
          <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>This is the single canonical copy of these facts — it is saved with the sale and never duplicated on the deal or a separate property record. Fields left as Unknown stay honestly unknown.</span>
        </div>
      </CardContent>
    </Card>
    </div>
  );
}