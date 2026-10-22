// Chapter 22 P1 — FINAL WALKTHROUGH: guided area-by-area HUMAN confirmations
// over the existing prep-zone architecture. Software records the operator's
// confirmation; software does NOT claim it physically inspected anything.
// Anything intentionally remaining carries a reason.
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Home } from 'lucide-react';
import { toast } from 'sonner';

export default function WalkthroughCard({ sale, user, onChanged }) {
  const t = sale.transition || {};
  const wt = t.walkthrough || {};
  const [customName, setCustomName] = useState('');
  const [busy, setBusy] = useState('');
  const [note, setNote] = useState(wt.condition_note || '');
  const [photoBusy, setPhotoBusy] = useState(false);

  const zoneAreas = (sale.prep_zones || []).map((z) => ({ area_id: z.zone_id, name: z.name, source: 'PREP_ZONE' }));
  const customAreas = (wt.areas || []).filter((a) => a.source === 'CUSTOM').map((a) => ({ ...a }));
  const areas = [
    ...zoneAreas.map((z) => ({ ...z, ...(wt.areas || []).find((a) => a.area_id === z.area_id && a.source === 'PREP_ZONE') || {} })),
    ...customAreas,
  ];

  const saveWalkthrough = async (nextWt) => {
    const transition = { ...t, walkthrough: nextWt };
    await base44.entities.EstateSale.update(sale.id, { transition });
    onChanged && onChanged();
  };

  const confirmArea = async (area) => {
    setBusy(area.area_id);
    try {
      const existing = (wt.areas || []).filter((a) => !(a.area_id === area.area_id && a.source === area.source));
      const entry = { area_id: area.area_id, name: area.name, source: area.source, confirmed_at: new Date().toISOString(), confirmed_by_name: user?.full_name || '', exception_note: area.exception_note || null };
      await saveWalkthrough({ ...wt, areas: [...existing, entry] });
      toast.success(`${area.name} confirmed`);
    } catch (e) { toast.error(e?.message || 'Could not save'); }
    finally { setBusy(''); }
  };

  const setException = async (area, value) => {
    const existing = (wt.areas || []).filter((a) => !(a.area_id === area.area_id && a.source === area.source));
    await saveWalkthrough({ ...wt, areas: [...existing, { area_id: area.area_id, name: area.name, source: area.source, confirmed_at: area.confirmed_at || null, confirmed_by_name: area.confirmed_by_name || '', exception_note: value || null }] });
  };

  const addCustom = async () => {
    if (!customName.trim()) return;
    const id = 'custom-' + Date.now();
    await saveWalkthrough({ ...wt, areas: [...(wt.areas || []), { area_id: id, name: customName.trim(), source: 'CUSTOM' }] });
    setCustomName('');
  };

  const completeWalkthrough = async () => {
    await saveWalkthrough({ ...wt, areas: wt.areas || [], condition_note: note || wt.condition_note || null, completed_at: new Date().toISOString() });
    toast.success('Final walkthrough completed (human confirmations recorded)');
  };

  const uploadPhoto = async (file) => {
    setPhotoBusy(true);
    try {
      const res = await base44.integrations.Core.UploadPrivateFile({ file });
      if (res?.data?.file_uri) {
        await saveWalkthrough({ ...wt, areas: wt.areas || [], condition_note: note || wt.condition_note || null, condition_photo_uri: res.data.file_uri });
        toast.success('Completion photo stored privately');
      }
    } catch (e) { toast.error(e?.message || 'Could not upload'); }
    finally { setPhotoBusy(false); }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2"><Home className="w-4 h-4" />Final walkthrough</h3>
        <p className="text-xs text-slate-500 mt-1 mb-3">
          Room-by-room HUMAN confirmations. Software records the operator's confirmation — it does not claim it physically inspected the property. Anything intentionally remaining needs a reason.
        </p>
        <div className="space-y-2">
          {areas.map((a) => (
            <div key={a.area_id + a.source} className="flex flex-col md:flex-row md:items-center justify-between gap-2 py-1.5 border-b border-slate-100 last:border-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm text-slate-800 truncate">{a.name}</span>
                {a.confirmed_at
                  ? <Badge className="bg-green-100 text-green-700">confirmed {new Date(a.confirmed_at).toLocaleDateString()}</Badge>
                  : <Badge variant="outline">not confirmed</Badge>}
              </div>
              <div className="flex items-center gap-2">
                <Input className="h-8 w-full md:w-56" defaultValue={a.exception_note || ''} placeholder="Reason anything remains (optional)"
                  onBlur={(e) => setException(a, e.target.value)} />
                {!a.confirmed_at && (
                  <Button size="sm" variant="outline" disabled={busy === a.area_id} onClick={() => confirmArea(a)}>
                    {busy === a.area_id && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}Confirm
                  </Button>
                )}
              </div>
            </div>
          ))}
          <div className="flex gap-2 items-end pt-2">
            <div className="flex-1"><Label className="text-xs">Add a custom area (closet, drawer, shed...)</Label><Input value={customName} onChange={(e) => setCustomName(e.target.value)} /></div>
            <Button size="sm" variant="outline" onClick={addCustom}>Add</Button>
          </div>
          <div className="pt-2">
            <Label className="text-xs">Factual final property-condition observations (never an inspection claim)</Label>
            <Textarea className="h-16" value={note} onChange={(e) => setNote(e.target.value)} />
            <div className="flex flex-col md:flex-row gap-2 items-start md:items-center mt-2">
              <Input type="file" className="max-w-xs" onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])} />
              {photoBusy && <Loader2 className="w-4 h-4 animate-spin" />}
              {wt.condition_photo_uri && <Badge variant="outline">completion photo stored privately</Badge>}
              <div className="flex-1" />
              {wt.completed_at
                ? <Badge className="bg-green-100 text-green-700">walkthrough completed</Badge>
                : <Button size="sm" onClick={completeWalkthrough}>Complete walkthrough</Button>}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}