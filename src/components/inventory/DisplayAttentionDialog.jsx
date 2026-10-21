import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DISPLAY_ATTENTION_OPTIONS, DISPLAY_ATTENTION_LABELS } from '@/components/equipment/equipmentModel';

// Chapter 8 P1 — operational DISPLAY ATTENTION on an Item: how staff should
// handle it during the sale. Distinct from research_status (do we know enough
// about this item). Internal only — never shown on public pages.
export default function DisplayAttentionDialog({ item, open, onClose, onSaved }) {
  const [value, setValue] = useState('NONE');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setValue(item?.display_attention || 'NONE');
      setError('');
    }
  }, [open, item]);

  const save = async () => {
    setSaving(true);
    try {
      await base44.entities.Item.update(item.id, { display_attention: value });
      onSaved();
      onClose();
    } catch (e) {
      console.error(e);
      setError('Could not save display attention');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Display attention</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-slate-600">{item?.title}</p>
          <Select value={value} onValueChange={setValue}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {DISPLAY_ATTENTION_OPTIONS.map(o => <SelectItem key={o} value={o}>{DISPLAY_ATTENTION_LABELS[o]}</SelectItem>)}
            </SelectContent>
          </Select>
          <p className="text-xs text-slate-500">
            How this item should be handled during the sale — separate from its research flag. Internal only: never shown on public pages.
          </p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}