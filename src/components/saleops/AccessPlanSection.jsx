import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { KeyRound, Lock } from 'lucide-react';

// Chapter 9 P1 — PRIVATE property access plan (lives inside the canonical
// EstateSale.site_assessment — no new entity). Alarm codes, gate codes, and key
// locations stay here: they are NEVER projected to proposals, agreements,
// public pages, Marketing Kit, case studies, or marketing AI contexts. Client
// documents reference access RESPONSIBILITIES only.

const FIELDS = [
  ['key_access_method', 'Key / access method (responsibility)', 'Client meets the team at 9am, lockbox on rear rail, agent holds keys…'],
  ['alarm_considerations', 'Alarm considerations (private)', 'System behavior, who disarms, monitoring-company notes…'],
  ['gate_access', 'Gate / entry procedures (private)', 'Gate codes and entry procedures stay here — never in client documents'],
  ['pets', 'Pets on site', 'Pets present and handling expectations…'],
  ['association_requirements', 'Association / HOA access requirements', 'Check-in, insurance certificate, vendor rules…'],
  ['contractors', 'Expected contractors', 'Cleanout crew, movers, specialists and their access…'],
  ['occupied_areas', 'Occupied areas', 'Areas still occupied or off-limits for family use…'],
  ['restricted_rooms', 'Restricted rooms', 'Rooms where work is restricted or requires client presence…'],
  ['access_windows', 'Access windows', 'Permitted working hours agreed with the client/association…'],
];

export default function AccessPlanSection({ value, onChange }) {
  const access = value || {};
  const set = (key, v) => onChange({ ...access, [key]: v });

  return (
    <Card className="border-amber-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-amber-600" /> Property Access Plan <Badge className="bg-amber-100 text-amber-700 border-amber-300">PRIVATE</Badge>
        </CardTitle>
        <p className="text-xs text-slate-500">
          Who provides access, when, and under what conditions. Highly sensitive: codes and key locations are never
          placed in proposals, agreements, public pages, or marketing — client documents reference access
          responsibilities only.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          {FIELDS.map(([key, label, ph]) => (
            <div key={key}>
              <label className="text-xs text-slate-500">{label}</label>
              <input
                value={access[key] || ''}
                onChange={e => set(key, e.target.value)}
                placeholder={ph}
                className="w-full mt-1 h-9 px-2 rounded-md border border-input bg-white text-sm"
              />
            </div>
          ))}
        </div>
        <div>
          <label className="text-xs text-slate-500">Access notes</label>
          <textarea
            value={access.notes || ''}
            onChange={e => set('notes', e.target.value)}
            rows={2}
            className="w-full mt-1 rounded-md border border-input bg-white p-2 text-sm"
            placeholder="Any other access-plan context…"
          />
        </div>
        <div className="flex items-start gap-2 text-xs text-slate-500">
          <Lock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-amber-600" />
          <span>Saved with the sale's private site assessment. Blank fields stay honestly unknown — nothing is guessed.</span>
        </div>
      </CardContent>
    </Card>
  );
}