import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { logItemChange } from '@/components/saleops/itemHistory';

// Chapter 15 P1-49/P1-50 — HIGH_VALUE custody continuation of the Chapter 14 chain.
// Append-only events + controlled location + the smallest off-site research record.
// Only SIGNIFICANT movements belong here — never minor ordinary movement.
const EVENTS = ['SECURED_CONTROLLED_LOCATION', 'MOVED', 'TRANSFERRED_SPECIALIST', 'RETURNED_FROM_SPECIALIST', 'OTHER'];

export default function ItemCustodyDialog({ open, item, sale, onClose, onSaved }) {
  const [event, setEvent] = useState('SECURED_CONTROLLED_LOCATION');
  const [note, setNote] = useState('');
  const [controlledLocation, setControlledLocation] = useState('');
  const [withWhom, setWithWhom] = useState('');
  const [expectedReturn, setExpectedReturn] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setEvent('SECURED_CONTROLLED_LOCATION');
      setNote('');
      setControlledLocation(item.controlled_location || '');
      setWithWhom(item.offsite_research?.with_whom || '');
      setExpectedReturn(item.offsite_research?.expected_return || '');
    }
  }, [item]);

  if (!item) return null;

  const save = async () => {
    setSaving(true);
    try {
      const user = await base44.auth.me();
      const evt = {
        event,
        note: note || '',
        by: user.id,
        by_name: user.full_name || user.email || '',
        at: new Date().toISOString(),
      };
      const patch = {
        custody_events: [...(item.custody_events || []), evt],
      };
      if (event === 'SECURED_CONTROLLED_LOCATION' && controlledLocation.trim()) {
        patch.controlled_location = controlledLocation.trim();
      }
      const offsite = { ...(item.offsite_research || {}) };
      if (event === 'TRANSFERRED_SPECIALIST') {
        offsite.with_whom = withWhom || offsite.with_whom || '';
        offsite.reason = note || offsite.reason || '';
        offsite.transferred_at = evt.at;
        if (expectedReturn) offsite.expected_return = expectedReturn;
        offsite.status = 'OFFSITE';
      }
      if (event === 'RETURNED_FROM_SPECIALIST') {
        offsite.returned_at = evt.at;
        offsite.status = 'RETURNED';
      }
      if (offsite.status || event === 'TRANSFERRED_SPECIALIST' || event === 'RETURNED_FROM_SPECIALIST') {
        patch.offsite_research = offsite;
      }
      await base44.entities.Item.update(item.id, patch);
      await logItemChange('custody', { ...item }, `${event}${note ? ` — ${note}` : ''}`, {
        saleId: item.estate_sale_id,
        operatorId: item.operator_id,
      });
      toast.success('Custody recorded');
      onSaved && onSaved();
      onClose();
    } catch (e) {
      toast.error('Could not record custody: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Custody — {item.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            Continues the discovery custody chain. Record only significant movements — secured, moved, specialist transfer or return.
          </p>

          {(item.custody_events || []).length > 0 && (
            <div className="max-h-32 overflow-y-auto space-y-1 rounded-lg border border-slate-200 p-2">
              {item.custody_events.map((e, i) => (
                <p key={i} className="text-xs text-slate-600">
                  <span className="font-medium">{e.event.replace(/_/g, ' ')}</span>
                  {e.by_name ? ` — ${e.by_name}` : ''}{e.note ? ` · ${e.note}` : ''}
                </p>
              ))}
            </div>
          )}

          <div className="space-y-1">
            <Label>Event</Label>
            <select value={event} onChange={e => setEvent(e.target.value)} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm">
              {EVENTS.map(ev => (
                <option key={ev} value={ev}>{ev.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>

          {event === 'SECURED_CONTROLLED_LOCATION' && (
            <div className="space-y-1">
              <Label>Controlled location (operator-private)</Label>
              <Input value={controlledLocation} onChange={e => setControlledLocation(e.target.value)} placeholder="Locked box, office, operator custody…" />
              <p className="text-[10px] text-slate-400">Not visible to ordinary sale-team members.</p>
            </div>
          )}

          {event === 'TRANSFERRED_SPECIALIST' && (
            <>
              <div className="space-y-1">
                <Label>With whom</Label>
                <Input value={withWhom} onChange={e => setWithWhom(e.target.value)} placeholder="Specialist / business name" />
              </div>
              <div className="space-y-1">
                <Label>Expected return (optional)</Label>
                <Input type="date" value={expectedReturn} onChange={e => setExpectedReturn(e.target.value)} />
              </div>
            </>
          )}

          <div className="space-y-1">
            <Label>Note</Label>
            <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Who/where/why — team-safe, no codes" />
          </div>

          {item.controlled_location && (
            <p className="text-xs text-slate-500">
              Current controlled location: <Badge variant="secondary">{item.controlled_location}</Badge>
            </p>
          )}
          {item.offsite_research?.status === 'OFFSITE' && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
              Currently off-site with {item.offsite_research.with_whom || 'specialist'}.
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving} className="bg-orange-600 hover:bg-orange-700">
            {saving ? 'Saving…' : 'Record custody event'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}