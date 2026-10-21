// Chapter 14 P1 — DISCOVERY CAPTURE dialog. The first prep rule is NOT
// "price it" — it is "decide which process it belongs in." Recording a find
// never creates an Item and never sets a price.
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, AlertTriangle, ShieldAlert } from 'lucide-react';
import { DISCOVERY_TYPES, ROUTES, ROUTE_FLAG_DEFAULTS } from '@/components/saleops/discoveryModel';

export default function DiscoveryDialog({ sale, zones, open, onOpenChange, onSaved }) {
  const [me, setMe] = useState(null);
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoWarn, setPhotoWarn] = useState(false);
  const [form, setForm] = useState({
    zone_id: '', location_note: '', description: '', discovery_type: 'ordinary_merchandise',
    routing_status: 'UNROUTED', cash_amount: '', family_statement: '', notes: '',
  });
  const [photo, setPhoto] = useState({ uri: '', check: 'not_run' });

  useEffect(() => { base44.auth.me().then(setMe).catch(() => {}); }, []);
  useEffect(() => { if (open) { setForm({ zone_id: '', location_note: '', description: '', discovery_type: 'ordinary_merchandise', routing_status: 'UNROUTED', cash_amount: '', family_statement: '', notes: '' }); setPhoto({ uri: '', check: 'not_run' }); setPhotoWarn(false); } }, [open]);

  const route = ROUTES.find(r => r.key === form.routing_status) || ROUTES[0];
  const flags = ROUTE_FLAG_DEFAULTS[form.routing_status] || {};
  const isSensitive = !!flags.is_sensitive || ['personal_sensitive', 'important_document'].includes(form.discovery_type);
  const isRestricted = !!flags.is_restricted || form.discovery_type === 'restricted_hold';

  // P1-25/P1-26 — run the EXISTING AI sensitive-material screen on the
  // private discovery photo. Advisory only; a flag or a SCREEN FAILURE both
  // yield PRIVACY REVIEW REQUIRED (fail-safe) — never silently cleared.
  const handlePhoto = async (file) => {
    if (!file) return;
    setPhotoBusy(true); setPhotoWarn(false);
    let uri = '';
    try {
      const up = await base44.integrations.Core.UploadPrivateFile({ file });
      uri = up.file_uri;
      const signed = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: uri, expires_in: 900 });
      const res = await base44.functions.invoke('analyzeItemImage', { image_url: signed.signed_url, categories: ['furniture', 'other'] });
      const data = res.data || {};
      if (data.sensitive) {
        setPhoto({ uri, check: 'review_required' });
        setPhotoWarn(true);
      } else {
        setPhoto({ uri, check: 'screen_passed' });
      }
    } catch (e) {
      console.error('Privacy screen failed — fail-safe review required', e);
      if (uri) setPhoto({ uri, check: 'review_required' });
      setPhotoWarn(true);
    } finally { setPhotoBusy(false); }
  };

  const save = async () => {
    if (!form.description.trim()) return;
    setSaving(true);
    try {
      await base44.entities.SaleDiscovery.create({
        sale_id: sale.id,
        operator_id: sale.operator_id,
        company_id: sale.company_id || null,
        sale_team_ids: sale.sale_team || [],
        zone_id: form.zone_id || '',
        location_note: form.location_note || '',
        description: form.description.trim(),
        discovery_type: form.discovery_type,
        routing_status: form.routing_status,
        is_sensitive: isSensitive,
        is_restricted: isRestricted,
        research_needed: !!flags.research_needed || form.discovery_type === 'research_needed',
        specialist_needed: !!flags.specialist_needed || form.discovery_type === 'specialist_review',
        cash_amount: form.discovery_type === 'cash' && form.cash_amount !== '' ? parseFloat(form.cash_amount) : null,
        photo_uri: photo.uri || '',
        photo_privacy_check: photo.uri ? photo.check : 'not_run',
        found_by: me?.id || '',
        found_by_name: me?.full_name || me?.email || '',
        found_at: new Date().toISOString(),
        family_statement: form.family_statement || '',
        notes: form.notes || '',
        custody_events: [{
          event: 'FOUND', note: form.location_note || '',
          by: me?.id || '', by_name: me?.full_name || '', at: new Date().toISOString(),
        }],
      });
      onSaved();
      onOpenChange(false);
    } catch (e) {
      console.error('Discovery save failed', e);
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">Record a Discovery</DialogTitle>
          <p className="text-xs text-slate-500">What was found and which process it belongs in. No price, no inventory record — that comes later, deliberately.</p>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Prep zone</Label>
              <Select value={form.zone_id || 'none'} onValueChange={v => setForm(p => ({ ...p, zone_id: v === 'none' ? '' : v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Property level</SelectItem>
                  {(zones || []).map(z => <SelectItem key={z.zone_id} value={z.zone_id}>{z.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Where exactly</Label>
              <Input value={form.location_note} onChange={e => setForm(p => ({ ...p, location_note: e.target.value }))}
                placeholder="e.g. cabinet, top shelf" className="h-9 text-sm" />
            </div>
          </div>

          <div>
            <Label className="text-xs">What was found *</Label>
            <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Describe it in the finder's words — never a diagnosis of value, identity, legality, or safety."
              className="min-h-16 text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Discovery type</Label>
              <Select value={form.discovery_type} onValueChange={v => setForm(p => ({ ...p, discovery_type: v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{DISCOVERY_TYPES.map(t => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Route — which process?</Label>
              <Select value={form.routing_status} onValueChange={v => setForm(p => ({ ...p, routing_status: v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{ROUTES.map(r => <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          {route.note && <p className="text-[11px] text-slate-500">{route.note}</p>}

          {form.discovery_type === 'cash' && (
            <div>
              <Label className="text-xs">Cash amount (PRIVATE — operator/finder only; never sale revenue)</Label>
              <Input type="number" min="0" step="0.01" value={form.cash_amount}
                onChange={e => setForm(p => ({ ...p, cash_amount: e.target.value }))} className="h-9 text-sm" />
            </div>
          )}

          {isSensitive && (
            <div className="text-[11px] border border-rose-200 bg-rose-50 text-rose-800 rounded-md px-2.5 py-2 flex gap-2">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              SENSITIVE — privacy handling. This stays private: never the public gallery, marketing, public website, or buyer surfaces.
            </div>
          )}
          {isRestricted && (
            <div className="text-[11px] border border-red-200 bg-red-50 text-red-800 rounded-md px-2.5 py-2 flex gap-2">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              RESTRICTED — ordinary sale processing STOPS pending review. The system never labels material legal/illegal/safe/unsafe — professional/operator review decides.
            </div>
          )}

          <div>
            <Label className="text-xs">Private evidence photo (PRIVATE by default)</Label>
            <label className="text-xs text-cyan-700 underline cursor-pointer block">
              {photoBusy ? 'Uploading & screening…' : photo.uri ? 'Replace photo' : 'Add photo'}
              <input type="file" accept="image/*" className="hidden" onChange={e => handlePhoto(e.target.files?.[0])} />
            </label>
            {photo.uri && (
              <div className="mt-1 flex items-center gap-2">
                <Badge variant="outline" className={`text-[10px] ${photo.check === 'review_required' ? 'border-red-300 text-red-700' : photo.check === 'screen_passed' ? 'border-emerald-300 text-emerald-700' : ''}`}>
                  {photo.check === 'review_required' ? 'PRIVACY REVIEW REQUIRED' : photo.check === 'screen_passed' ? 'Screen passed (advisory)' : 'Not screened'}
                </Badge>
              </div>
            )}
            {photoWarn && (
              <p className="text-[11px] text-red-700 mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Sensitive material suspected or screen unavailable — human review required. An AI flag is advisory, never a verified fact.
              </p>
            )}
          </div>

          <div>
            <Label className="text-xs">Client / family statement (research lead — UNVERIFIED)</Label>
            <Input value={form.family_statement} onChange={e => setForm(p => ({ ...p, family_statement: e.target.value }))}
              placeholder="e.g. Client says her father bought this in Italy in the 1970s" className="h-9 text-sm" />
            <p className="text-[10px] text-slate-400 mt-0.5">A family story is never verified provenance — it is displayed as a CLIENT/FAMILY STATEMENT.</p>
          </div>

          <div>
            <Label className="text-xs">Notes (team-safe — no codes/credentials)</Label>
            <Input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="h-9 text-sm" />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button size="sm" onClick={save} disabled={saving || !form.description.trim()} className="bg-cyan-700 hover:bg-cyan-800">
              {saving && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}Record Discovery
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}