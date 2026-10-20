import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, FlaskConical, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

// Chapter 3 P1 — research-needed flag on canonical Item. Marks questionable or
// potentially valuable merchandise for another look. INDEPENDENT of Item.status,
// SaleClientDecision, price and availability — nothing else changes here.
const FLAG_OPTIONS = [
  { value: 'RESEARCH_NEEDED', label: 'Research Needed', hint: 'Identify it / look it up before pricing' },
  { value: 'VERIFY', label: 'Verify', hint: 'Confirm material, maker, authenticity, or price' },
  { value: 'SPECIALIST_REVIEW', label: 'Specialist Review', hint: 'Value may justify an outside expert' },
];

export default function ResearchFlagDialog({ item, open, onClose, onSaved }) {
  const isFlagged = !!(item && item.research_status && item.research_status !== 'CLEAR');
  const [status, setStatus] = useState('RESEARCH_NEEDED');
  const [reason, setReason] = useState('');
  const [resolution, setResolution] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item && open) {
      setStatus(item.research_status && item.research_status !== 'CLEAR' ? item.research_status : 'RESEARCH_NEEDED');
      setReason(item.research_reason || '');
      setResolution(item.research_resolution || '');
    }
  }, [item, open]);

  const saveFlag = async () => {
    if (!reason.trim()) {
      toast.error('Add a short reason — why does this item need another look?');
      return;
    }
    setSaving(true);
    try {
      await base44.entities.Item.update(item.id, {
        research_status: status,
        research_reason: reason.trim(),
        research_flagged_at: item.research_flagged_at || new Date().toISOString(),
      });
      toast.success('Item flagged for research');
      onSaved && onSaved();
      onClose();
    } catch (error) {
      toast.error('Could not save flag: ' + (error.message || 'error'));
    } finally {
      setSaving(false);
    }
  };

  const resolveFlag = async () => {
    setSaving(true);
    try {
      await base44.entities.Item.update(item.id, {
        research_status: 'CLEAR',
        research_resolved_at: new Date().toISOString(),
        research_resolution: resolution.trim() || null,
      });
      toast.success('Research flag resolved');
      onSaved && onSaved();
      onClose();
    } catch (error) {
      toast.error('Could not resolve flag: ' + (error.message || 'error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-amber-600" />
            Research Flag — {item?.title || 'Item'}
          </DialogTitle>
          <DialogDescription>
            Mark this item for another look instead of pricing it just to keep moving. This never changes the item's selling status, price, or any client decision — research uncertainty is independent.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {FLAG_OPTIONS.map(o => (
            <button
              key={o.value}
              onClick={() => setStatus(o.value)}
              className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${status === o.value && !isFlagged || (isFlagged && status === o.value) ? 'border-amber-400 bg-amber-50' : 'border-slate-200 hover:bg-slate-50'}`}
            >
              <span className="font-medium text-sm text-slate-900">{o.label}</span>
              <span className="block text-xs text-slate-500 mt-0.5">{o.hint}</span>
            </button>
          ))}

          <div className="space-y-2">
            <Label>Why does it need another look?</Label>
            <Textarea
              rows={2}
              placeholder="e.g. Possible sterling. / Signature needs verification. / Maker unknown. / Value may justify specialist."
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
          </div>

          <Button onClick={saveFlag} disabled={saving} className="w-full bg-amber-600 hover:bg-amber-700">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {isFlagged ? 'Update Flag' : 'Flag for Research'}
          </Button>

          {isFlagged && (
            <div className="border-t border-slate-200 pt-4 space-y-2">
              <Label>Resolve — what was learned or decided?</Label>
              <Textarea
                rows={2}
                placeholder="e.g. Confirmed sterling by hallmark — priced at $240 with client's approval."
                value={resolution}
                onChange={e => setResolution(e.target.value)}
              />
              <Button onClick={resolveFlag} disabled={saving} variant="outline" className="w-full border-green-300 text-green-700 hover:bg-green-50">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Resolve / Clear Flag
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}