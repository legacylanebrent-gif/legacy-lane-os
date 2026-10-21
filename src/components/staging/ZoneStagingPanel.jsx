// Chapter 17 P1-1 — ZONE STAGING panel: the smallest staging layer on the
// EXISTING Chapter 14 prep zones (EstateSale.prep_zones). No second room
// system, no private consultation content, no codes/credentials. Everything
// here is team-safe operational planning; controlled locations and custody
// NEVER appear in this panel.
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, Store, X, Plus } from 'lucide-react';
import {
  STAGING_PURPOSES, LIGHTING_STATES, SALE_DAY_STATUSES, ZONE_CATEGORY_OPTIONS,
  categoryLabel, ZONE_STAGING_POINTS, zoneStagingTaskName, zoneStagingReadiness,
} from '@/components/staging/stagingModel';

const tone = (ok) => ok ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200';

export default function ZoneStagingPanel({ sale, items = [], tasks = [], onChanged }) {
  const [zones, setZones] = useState(sale?.prep_zones || []);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(null);

  const persist = async (next) => {
    setSaving(true);
    setZones(next);
    try {
      await base44.entities.EstateSale.update(sale.id, { prep_zones: next });
      if (onChanged) onChanged();
    } catch (e) {
      console.error('Zone staging save failed', e);
      setZones(sale?.prep_zones || []);
    } finally { setSaving(false); }
  };

  const updateZone = (zoneId, patch) => {
    persist(zones.map(z => z.zone_id === zoneId ? { ...z, ...patch } : z));
  };

  const addCategoryPlan = (zone, category, intent) => {
    if (!category) return;
    updateZone(zone.zone_id, {
      category_plan: [...(zone.category_plan || []), { category, intent, note: '' }],
    });
  };
  const removeCategoryPlan = (zone, idx) => {
    updateZone(zone.zone_id, { category_plan: (zone.category_plan || []).filter((_, i) => i !== idx) });
  };

  // P1-35 — per-zone STAGING CHECKLIST through the existing SaleTask system
  // (same prefix pattern as Security:/Checkout Setup:). Idempotent by name.
  const addStagingChecklist = async (zone) => {
    setBusy(zone.zone_id);
    const existing = new Set(tasks.map(t => t.name));
    const toCreate = ZONE_STAGING_POINTS
      .filter(p => !existing.has(zoneStagingTaskName(zone, p)))
      .map(p => ({
        sale_id: sale.id, operator_id: sale.operator_id,
        name: zoneStagingTaskName(zone, p),
        description: 'Chapter 17 room staging completion point — human judgment, checked on the floor.',
        category: 'Execution', source_type: 'MANUAL', source_id: zone.zone_id,
        source_label: `Staging: ${zone.name}`,
      }));
    try {
      if (toCreate.length) await base44.entities.SaleTask.bulkCreate(toCreate);
      if (onChanged) onChanged();
    } catch (e) { console.error('Staging checklist create failed', e); } finally { setBusy(null); }
  };

  // P1-46 — CONSOLIDATE: mark the zone, create the work, NEVER auto-move Items.
  const markConsolidate = async (zone) => {
    setBusy(zone.zone_id);
    try {
      updateZone(zone.zone_id, { sale_day_status: 'CONSOLIDATE' });
      await base44.entities.SaleTask.create({
        sale_id: sale.id, operator_id: sale.operator_id,
        name: `Consolidate: ${zone.name}`,
        description: 'Consolidate this zone\'s depleted displays into stronger ones. Move merchandise only through explicit handling — the system never relocates Items automatically.',
        category: 'Execution', source_type: 'MANUAL', source_id: zone.zone_id,
        source_label: `Sale-day consolidation: ${zone.name}`,
      });
      if (onChanged) onChanged();
    } catch (e) { console.error('Consolidate failed', e); } finally { setBusy(null); }
  };

  if (!zones.length) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Store className="w-5 h-5 text-cyan-700" /> Sale-Floor Staging (Chapter 17)
        </CardTitle>
        <p className="text-xs text-slate-500">
          The smallest staging layer on the existing prep zones: purpose, customer access plan, category plan, signage/equipment needs, lighting and flow concerns.
          Room READY is deterministic — never a percentage. {saving && <span className="ml-1 text-cyan-600 inline-flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />saving…</span>}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {zones.map(zone => {
          const readiness = zoneStagingReadiness(zone, { items, tasks });
          return (
            <div key={zone.zone_id} className="border border-slate-200 rounded-lg p-3 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-900 text-sm">{zone.name}</span>
                <Badge variant="outline" className={`font-normal ${readiness.ready ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                  {readiness.reviewState}
                </Badge>
                {zone.sale_day_status && <Badge variant="outline" className="font-normal text-cyan-700 border-cyan-300">Sale-day: {zone.sale_day_status}</Badge>}
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                <label className="block">
                  <span className="text-[10px] uppercase tracking-wide text-slate-500">Staging purpose</span>
                  <select value={zone.staging_purpose || ''} onChange={e => updateZone(zone.zone_id, { staging_purpose: e.target.value })}
                    className="w-full mt-1 px-2 py-1.5 border border-slate-300 rounded-md text-xs">
                    <option value="">Not planned</option>
                    {STAGING_PURPOSES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="text-[10px] uppercase tracking-wide text-slate-500">Lighting</span>
                  <select value={zone.lighting_concern || 'unknown'} onChange={e => updateZone(zone.zone_id, { lighting_concern: e.target.value })}
                    className="w-full mt-1 px-2 py-1.5 border border-slate-300 rounded-md text-xs">
                    {LIGHTING_STATES.map(l => <option key={l.key} value={l.key}>{l.label}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="text-[10px] uppercase tracking-wide text-slate-500">Sale-day status</span>
                  <select value={zone.sale_day_status || ''} onChange={e => updateZone(zone.zone_id, { sale_day_status: e.target.value || null })}
                    className="w-full mt-1 px-2 py-1.5 border border-slate-300 rounded-md text-xs">
                    <option value="">Pre-opening</option>
                    {SALE_DAY_STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </label>
                <div className="flex items-end gap-1.5">
                  <Button size="sm" variant="outline" className="text-xs h-8" disabled={busy === zone.zone_id} onClick={() => addStagingChecklist(zone)}>
                    {busy === zone.zone_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Staging checklist
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs h-8" disabled={busy === zone.zone_id} onClick={() => markConsolidate(zone)}>
                    Consolidate
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                <label className="block">
                  <span className="text-[10px] uppercase tracking-wide text-slate-500">Signage needs</span>
                  <Input value={zone.signage_needs || ''} onChange={e => updateZone(zone.zone_id, { signage_needs: e.target.value })}
                    placeholder="Category signs, directional, restricted…" className="mt-1 text-xs h-8" />
                </label>
                <label className="block">
                  <span className="text-[10px] uppercase tracking-wide text-slate-500">Equipment needs (plan)</span>
                  <Input value={zone.equipment_needs || ''} onChange={e => updateZone(zone.zone_id, { equipment_needs: e.target.value })}
                    placeholder="2 folding tables, clothing rack…" className="mt-1 text-xs h-8" />
                </label>
                <label className="block">
                  <span className="text-[10px] uppercase tracking-wide text-slate-500">Flow / bottleneck concerns</span>
                  <Input value={zone.flow_concerns || ''} onChange={e => updateZone(zone.zone_id, { flow_concerns: e.target.value })}
                    placeholder="Narrow doorway, queue blocks hall, removal crosses checkout…" className="mt-1 text-xs h-8" />
                </label>
                <label className="block">
                  <span className="text-[10px] uppercase tracking-wide text-slate-500">Staging notes (team-safe)</span>
                  <Input value={zone.staging_notes || ''} onChange={e => updateZone(zone.zone_id, { staging_notes: e.target.value })}
                    placeholder="Group tools on the workbench, face books spine-out…" className="mt-1 text-xs h-8" />
                </label>
              </div>

              {/* P1-7 — category plan (planning only; nothing auto-moves) */}
              <div>
                <span className="text-[10px] uppercase tracking-wide text-slate-500">Category plan (planning only — Items move only when physically moved)</span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {(zone.category_plan || []).map((cp, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 bg-cyan-50 border border-cyan-200 text-cyan-800 rounded-full px-2 py-0.5 text-xs">
                      {categoryLabel(cp.category)} · {cp.intent === 'CONSOLIDATE_TO' ? 'consolidate out' : 'keep here'}
                      <button onClick={() => removeCategoryPlan(zone, idx)} className="text-cyan-500 hover:text-cyan-800"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                  <label className="inline-flex items-center gap-1 text-xs text-slate-500">
                    <Plus className="w-3 h-3" />
                    <select value="" onChange={e => addCategoryPlan(zone, e.target.value, 'KEEP_HERE')}
                      className="border border-slate-200 rounded-md px-1.5 py-0.5 text-xs">
                      <option value="">Add category…</option>
                      {ZONE_CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{categoryLabel(c)}</option>)}
                    </select>
                  </label>
                </div>
              </div>

              {/* Deterministic room completion */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {readiness.derived.map(c => (
                  <Badge key={c.key} variant="outline" className={`font-normal ${tone(c.satisfied)}`}>{c.label}: {c.satisfied ? 'yes' : 'no'}</Badge>
                ))}
                <Badge variant="outline" className={`font-normal ${readiness.checklistState === 'done' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : readiness.checklistState === 'open' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                  Staging checklist: {readiness.checklistState === 'none' ? 'not added' : readiness.checklistState === 'done' ? 'complete' : 'in progress'}
                </Badge>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}