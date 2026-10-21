// Chapter 14 P1 — PREP ZONES: team-readable rooms/work areas ON THE SALE
// (the same projection pattern as excluded_areas — NEVER the private
// Chapter 12 consultation deal). Zone truth is human-set and honest; counts
// are derived at read time. No percentage progress anywhere.
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, MapPin, Plus, Trash2, Layers } from 'lucide-react';
import {
  ZONE_STATUSES, ACCESS_CLASSES, SECURITY_FLAGS,
  zoneStatusBadge, zoneStatusLabel, zoneDiscoveryCounts, prepPriorityCues,
} from '@/components/saleops/discoveryModel';
import { timingFor } from '@/components/saleops/prepareModel';
import { asArray } from '@/components/saleops/saleDecisionModel';
import PhotoThumb from '@/components/consultation/PhotoThumb';

const newZoneId = () => `zone_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const toneClass = (tone) => tone === 'red' ? 'border-red-200 bg-red-50 text-red-800' : tone === 'amber' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-cyan-200 bg-cyan-50 text-cyan-800';

export default function PrepZonesPanel({ sale, discoveries, linkedDeal, highlightZoneId, onChanged }) {
  const [zones, setZones] = useState(sale?.prep_zones || []);
  const [team, setTeam] = useState([]);
  const [newZoneName, setNewZoneName] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingZone, setUploadingZone] = useState(null);

  useEffect(() => { setZones(sale?.prep_zones || []); }, [sale]);
  useEffect(() => {
    const ids = (sale?.sale_team || []).filter(Boolean);
    if (!ids.length) return;
    base44.entities.User.filter({ id: { $in: ids } })
      .then(u => setTeam(asArray(u).map(x => ({ id: x.id, name: x.full_name || x.email || 'Team member' }))))
      .catch(() => {});
  }, [sale?.id]);

  const consultationRooms = linkedDeal?.consultation?.rooms || [];
  const counts = zoneDiscoveryCounts(zones, discoveries);
  const { daysUntilFirst } = timingFor(sale);
  const cues = prepPriorityCues({ zones, discoveries, tasks: [], issues: [], decisions: [], daysUntilFirst });

  const persist = async (next) => {
    setSaving(true);
    setZones(next);
    try {
      await base44.entities.EstateSale.update(sale.id, { prep_zones: next });
      if (onChanged) onChanged();
    } catch (e) {
      console.error('Zone save failed', e);
      setZones(sale?.prep_zones || []);
    } finally { setSaving(false); }
  };

  const updateZone = (zoneId, patch) => {
    const next = zones.map(z => z.zone_id === zoneId ? { ...z, ...patch } : z);
    if (patch.prep_status === 'complete' && !next.find(z => z.zone_id === zoneId).completed_at) {
      const i = next.findIndex(z => z.zone_id === zoneId);
      next[i] = { ...next[i], completed_at: new Date().toISOString() };
    }
    persist(next);
  };

  const addZone = () => {
    const name = newZoneName.trim();
    if (!name) return;
    persist([...zones, { zone_id: newZoneId(), name, source_type: 'MANUAL', prep_status: 'untouched', access_class: 'UNCLASSIFIED', security_flags: [], notes: '', removal_route_note: '', protection_note: '' }]);
    setNewZoneName('');
  };

  // P1-7 — project ONLY the room names + source reference from the operator's
  // private Chapter 12 consultation; no consultation content is copied.
  const projectConsultationRooms = () => {
    const existingSourceIds = new Set(zones.map(z => z.source_id).filter(Boolean));
    const projected = consultationRooms
      .filter(r => r.name && !existingSourceIds.has(r.room_id))
      .map(r => ({ zone_id: newZoneId(), name: r.name, source_type: 'CONSULTATION_ROOM', source_id: r.room_id || '', prep_status: 'untouched', access_class: 'UNCLASSIFIED', security_flags: [], notes: '', removal_route_note: '', protection_note: '' }));
    if (projected.length) persist([...zones, ...projected]);
  };

  const assignWork = async (zone) => {
    setSaving(true);
    try {
      await base44.entities.SaleTask.create({
        sale_id: sale.id, operator_id: sale.operator_id,
        name: `Prep: ${zone.name}`, category: 'Preparation',
        description: zone.notes ? `Zone notes: ${zone.notes}` : 'Preparation work for this zone.',
        assignee_user_id: zone.assignee_user_id || '', assignee_name: zone.assignee_name || '',
        source_type: 'MANUAL', source_id: zone.zone_id, source_label: `Prep zone: ${zone.name}`,
      });
      if (onChanged) onChanged();
    } catch (e) { console.error('Task create failed', e); } finally { setSaving(false); }
  };

  const uploadConditionPhoto = async (zone, file) => {
    if (!file) return;
    setUploadingZone(zone.zone_id);
    try {
      const up = await base44.integrations.Core.UploadPrivateFile({ file });
      updateZone(zone.zone_id, { condition_photo_uri: up.file_uri });
    } catch (e) { console.error('Condition photo upload failed', e); } finally { setUploadingZone(null); }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Layers className="w-5 h-5 text-cyan-700" /> Preparation Zones
        </CardTitle>
        <p className="text-xs text-slate-500">
          Team-readable rooms / work areas projected on the sale (Chapter 14). Prep status is honest human-set state — no percentage progress.
          {saving && <span className="ml-1 text-cyan-600 inline-flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />saving…</span>}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {cues.length > 0 && (
          <div className="space-y-1.5">
            {cues.map((c, i) => (
              <div key={i} className={`text-xs border rounded-md px-2.5 py-1.5 ${toneClass(c.tone)}`}>
                <span className="font-semibold">{c.label}</span> — {c.detail}
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <Input value={newZoneName} onChange={e => setNewZoneName(e.target.value)}
            placeholder="New zone name (e.g. Living Room, Basement, Garage)" className="text-sm"
            onKeyDown={e => e.key === 'Enter' && addZone()} />
          <Button size="sm" onClick={addZone} disabled={!newZoneName.trim()} className="bg-cyan-700 hover:bg-cyan-800 whitespace-nowrap">
            <Plus className="w-3.5 h-3.5 mr-1" />Add Zone
          </Button>
        </div>
        {consultationRooms.length > 0 && (
          <Button size="sm" variant="outline" onClick={projectConsultationRooms}>
            <MapPin className="w-3.5 h-3.5 mr-1" />Project {consultationRooms.length} consultation room(s) as zones
          </Button>
        )}

        {zones.length === 0 ? (
          <p className="text-sm text-slate-400 py-2">No prep zones yet — add a zone or project the consultation rooms.</p>
        ) : (
          <div className="space-y-3">
            {zones.map(zone => {
              const c = counts[zone.zone_id] || { open: 0, total: 0, sensitive: 0, restricted: 0, research: 0 };
              return (
                <div key={zone.zone_id}
                  id={`zone-${zone.zone_id}`}
                  className={`rounded-lg border p-3 space-y-2.5 ${highlightZoneId === zone.zone_id ? 'border-cyan-500 ring-2 ring-cyan-200' : 'border-slate-200'}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900 text-sm">{zone.name}</p>
                    {zone.source_type === 'CONSULTATION_ROOM' && <Badge variant="outline" className="text-[10px]">from consultation room</Badge>}
                    <Badge variant="outline" className={`text-[11px] ${zoneStatusBadge(zone.prep_status)}`}>{zoneStatusLabel(zone.prep_status)}</Badge>
                    <Badge variant="outline" className="text-[10px]">{c.open} open / {c.total} discoveries</Badge>
                    {c.sensitive > 0 && <Badge className="bg-rose-100 text-rose-700 text-[10px]">{c.sensitive} sensitive</Badge>}
                    {c.restricted > 0 && <Badge className="bg-red-100 text-red-700 text-[10px]">{c.restricted} restricted</Badge>}
                    <span className="flex-1" />
                    <Button size="sm" variant="outline" onClick={() => assignWork(zone)}>Assign Work</Button>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                    <div>
                      <p className="text-[10px] text-slate-500 mb-1">Prep status</p>
                      <Select value={zone.prep_status || 'untouched'} onValueChange={v => updateZone(zone.zone_id, { prep_status: v })}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{ZONE_STATUSES.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 mb-1">Customer access</p>
                      <Select value={zone.access_class || 'UNCLASSIFIED'} onValueChange={v => updateZone(zone.zone_id, { access_class: v })}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{ACCESS_CLASSES.map(a => <SelectItem key={a.key} value={a.key}>{a.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 mb-1">Responsible</p>
                      <Select value={zone.assignee_user_id || 'none'}
                        onValueChange={v => {
                          const t = team.find(x => x.id === v);
                          updateZone(zone.zone_id, v === 'none' ? { assignee_user_id: '', assignee_name: '' } : { assignee_user_id: v, assignee_name: t?.name || '' });
                        }}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Unassigned</SelectItem>
                          {team.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {SECURITY_FLAGS.map(f => {
                      const on = (zone.security_flags || []).includes(f.key);
                      return (
                        <button key={f.key}
                          onClick={() => updateZone(zone.zone_id, { security_flags: on ? (zone.security_flags || []).filter(x => x !== f.key) : [...(zone.security_flags || []), f.key] })}
                          className={`text-[10px] px-2 py-0.5 rounded-full border ${on ? 'bg-amber-100 border-amber-300 text-amber-800' : 'bg-white border-slate-200 text-slate-500'}`}>
                          {f.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid sm:grid-cols-2 gap-2">
                    <Input value={zone.notes || ''} onChange={e => updateZone(zone.zone_id, { notes: e.target.value })}
                      placeholder="Team-safe prep notes (no codes/credentials)" className="h-8 text-xs" />
                    <Input value={zone.removal_route_note || ''} onChange={e => updateZone(zone.zone_id, { removal_route_note: e.target.value })}
                      placeholder="Large-item removal route / special concern" className="h-8 text-xs" />
                    <Input value={zone.protection_note || ''} onChange={e => updateZone(zone.zone_id, { protection_note: e.target.value })}
                      placeholder="Property protection (floors/walls/stairs/features)" className="h-8 text-xs" />
                    <div className="flex items-center gap-2">
                      {zone.condition_photo_uri
                        ? <PhotoThumb fileUri={zone.condition_photo_uri} name="Condition photo" className="w-10 h-10" />
                        : <span className="text-[10px] text-slate-400">No condition photo</span>}
                      <label className="text-[10px] text-cyan-700 underline cursor-pointer">
                        {uploadingZone === zone.zone_id ? 'Uploading…' : 'Add private condition photo'}
                        <input type="file" accept="image/*" className="hidden" onChange={e => uploadConditionPhoto(zone, e.target.files?.[0])} />
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 h-6 px-2"
                      onClick={() => { if (confirm(`Remove zone "${zone.name}"? Discoveries keep their zone_id reference.`)) persist(zones.filter(z => z.zone_id !== zone.zone_id)); }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <p className="text-[10px] text-slate-400">Condition photos are private (stored privately) and never enter the public gallery or marketing.</p>
      </CardContent>
    </Card>
  );
}