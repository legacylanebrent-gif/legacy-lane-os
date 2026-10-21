import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Compass, HeartHandshake, Ban, Trophy } from 'lucide-react';
import { addDays } from 'date-fns';

// Chapter 10 P1 — outcome dialogs for the canonical opportunity:
// LOST (structured reason required — with guidance toward NURTURE/REFERRED),
// REFERRED (professional destination + provenance), NURTURE (not ready ≠ lost;
// future next action required), COMPLETED (post-sale follow-up prompts).
// NOT READY IS NOT LOST. REFERRED IS NOT LOST.

const LOST_REASONS = [
  { value: 'client_chose_another_company', label: 'Client chose another company' },
  { value: 'price_fee', label: 'Price / fee' },
  { value: 'not_enough_saleable_value', label: 'Not enough saleable value' },
  { value: 'location', label: 'Location' },
  { value: 'timing', label: 'Timing' },
  { value: 'client_not_ready', label: 'Client not ready — consider NURTURE instead' },
  { value: 'scope_mismatch', label: 'Scope mismatch' },
  { value: 'authority_family_issue', label: 'Authority / family issue' },
  { value: 'operator_capacity', label: 'Operator capacity' },
  { value: 'no_response', label: 'No response' },
  { value: 'alternative_service', label: 'A different service fit better — consider REFERRED instead' },
  { value: 'other', label: 'Other' },
  { value: 'unknown', label: 'Unknown' },
];

const REFERRED_SERVICES = [
  { value: 'cleanout', label: 'Cleanout' },
  { value: 'donation', label: 'Donation' },
  { value: 'auction', label: 'Auction' },
  { value: 'consignment', label: 'Consignment' },
  { value: 'mover', label: 'Mover' },
  { value: 'real_estate_agent', label: 'Real estate agent' },
  { value: 'attorney', label: 'Attorney' },
  { value: 'organizer', label: 'Organizer' },
  { value: 'specialist', label: 'Specialist' },
  { value: 'other', label: 'Other' },
];

const NURTURE_PRESETS = [
  { label: 'Follow up in 60 days', days: 60, action: 'Follow up — check back with the family' },
  { label: 'Call after probate hearing', days: 45, action: 'Call after the probate hearing' },
  { label: 'Contact after home closes', days: 60, action: 'Contact after the home closes' },
  { label: 'Check back after family meeting', days: 14, action: 'Check back after the family meeting' },
];

const POST_SALE_PRESETS = [
  { label: 'Thank the client', days: 3, action: 'Thank the client for their business' },
  { label: 'Request a testimonial', days: 7, action: 'Request a testimonial (honest request template in Client Testimonials)' },
  { label: 'Request a referral', days: 10, action: 'Request a referral — ask for introductions to professionals and families' },
  { label: 'Future check-in', days: 30, action: 'Check in with the client' },
];

const inputCls = 'w-full h-9 px-3 rounded-md border border-input bg-white text-sm';

export default function DealOutcomeDialog({ open, mode, deal, contacts, onApply, onClose, onCreateContact }) {
  const [lostReason, setLostReason] = useState('');
  const [lostNotes, setLostNotes] = useState('');
  const [referredService, setReferredService] = useState('cleanout');
  const [referredContactId, setReferredContactId] = useState('');
  const [newContactMode, setNewContactMode] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [referredReason, setReferredReason] = useState('');
  const [action, setAction] = useState('');
  const [when, setWhen] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setLostReason(''); setLostNotes('');
      setReferredService('cleanout'); setReferredContactId(''); setNewContactMode(false);
      setNewContactName(''); setNewContactEmail(''); setNewContactPhone(''); setReferredReason('');
      setAction(''); setWhen(''); setSaving(false);
    }
  }, [open, mode]);

  if (!mode) return null;

  const iso = days => addDays(new Date(), days).toISOString();
  const inDays = days => addDays(new Date(), days).toISOString().slice(0, 16);

  const apply = async () => {
    setSaving(true);
    try {
      if (mode === 'lost') {
        if (!lostReason) return;
        await onApply({ lost_reason: lostReason, lost_notes: lostNotes.trim() || null });
      } else if (mode === 'referred') {
        let contactId = referredContactId;
        if (newContactMode) {
          if (!newContactName.trim()) return;
          contactId = await onCreateContact({
            first_name: newContactName.trim().split(' ')[0],
            last_name: newContactName.trim().split(' ').slice(1).join(' '),
            email: newContactEmail.trim() || null,
            phone: newContactPhone.trim() || null,
            roles: [REFERRED_SERVICES.find(s => s.value === referredService)?.value === 'real_estate_agent' ? 'agent' : 'vendor'],
          });
          setReferredContactId(contactId);
        }
        if (!contactId) return;
        await onApply({
          referred_to_contact_id: contactId,
          referred_service: referredService,
          referred_reason: referredReason.trim() || null,
          referred_at: new Date().toISOString(),
        });
      } else if (mode === 'nurture') {
        if (!action.trim() || !when) return;
        await onApply({ next_action: action.trim(), next_action_at: new Date(when).toISOString(), next_action_completed_at: null });
      } else if (mode === 'completed') {
        if (action.trim() && when) {
          await onApply({ next_action: action.trim(), next_action_at: new Date(when).toISOString(), next_action_completed_at: null });
        } else {
          await onApply({});
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const titles = {
    lost: 'Lost Opportunity Review',
    referred: 'Refer Elsewhere',
    nurture: 'Nurture — Not Ready Yet',
    completed: 'Completed — Post-Sale Follow-Up',
  };
  const icons = {
    lost: <Ban className="w-5 h-5 text-red-500" />,
    referred: <Compass className="w-5 h-5 text-amber-500" />,
    nurture: <HeartHandshake className="w-5 h-5 text-teal-500" />,
    completed: <Trophy className="w-5 h-5 text-cyan-500" />,
  };

  const canApply =
    mode === 'lost' ? !!lostReason
    : mode === 'referred' ? (newContactMode ? !!newContactName.trim() : !!referredContactId)
    : mode === 'nurture' ? !!(action.trim() && when)
    : true;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">{icons[mode]} {titles[mode]}</DialogTitle>
        </DialogHeader>

        {mode === 'lost' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              Capture the honest reason — this becomes your lost-lead review. <strong>Client not ready?</strong> NURTURE keeps the relationship alive. <strong>A different service fit better?</strong> REFERRED records where you sent them.
            </p>
            <div>
              <Label className="text-sm">Reason *</Label>
              <select value={lostReason} onChange={e => setLostReason(e.target.value)} className={inputCls + ' mt-1'}>
                <option value="">Select a reason…</option>
                {LOST_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-sm">Notes (context, what could be reconsidered)</Label>
              <Textarea rows={3} value={lostNotes} onChange={e => setLostNotes(e.target.value)} placeholder="e.g. Chose a competitor with a lower fee; family may revisit in spring" className="mt-1" />
            </div>
            {deal?.referral_source_name && (
              <p className="text-xs text-slate-400">Source on record: {deal.referral_source_name}</p>
            )}
          </div>
        )}

        {mode === 'referred' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              REFERRED means the family was directed to a more appropriate professional — it is <strong>not</strong> lost, and the relationship stays on record.
            </p>
            <div>
              <Label className="text-sm">Service / category</Label>
              <select value={referredService} onChange={e => setReferredService(e.target.value)} className={inputCls + ' mt-1'}>
                {REFERRED_SERVICES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-sm">Professional / destination *</Label>
              {!newContactMode ? (
                <div className="space-y-1.5 mt-1">
                  <select value={referredContactId} onChange={e => setReferredContactId(e.target.value)} className={inputCls}>
                    <option value="">Select an existing contact…</option>
                    {(contacts || []).map(c => (
                      <option key={c.id} value={c.id}>
                        {[c.first_name, c.last_name].filter(Boolean).join(' ') || c.email || 'Contact'}
                      </option>
                    ))}
                  </select>
                  <button onClick={() => setNewContactMode(true)} className="text-xs text-orange-600 hover:underline">
                    ＋ The professional is not in my contacts yet
                  </button>
                </div>
              ) : (
                <div className="space-y-2 mt-1">
                  <Input value={newContactName} onChange={e => setNewContactName(e.target.value)} placeholder="Name / company *" />
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={newContactEmail} onChange={e => setNewContactEmail(e.target.value)} placeholder="Email" />
                    <Input value={newContactPhone} onChange={e => setNewContactPhone(e.target.value)} placeholder="Phone" />
                  </div>
                  <button onClick={() => setNewContactMode(false)} className="text-xs text-slate-500 hover:underline">← Choose an existing contact instead</button>
                </div>
              )}
            </div>
            <div>
              <Label className="text-sm">Reason / context</Label>
              <Textarea rows={2} value={referredReason} onChange={e => setReferredReason(e.target.value)} placeholder="e.g. Property needs full cleanout before any sale is realistic" className="mt-1" />
            </div>
          </div>
        )}

        {mode === 'nurture' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              NURTURE means a legitimate opportunity that is not ready now. It stays visible with a future next action — and never pollutes your immediate active-work board.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {NURTURE_PRESETS.map(p => (
                <button
                  key={p.label}
                  onClick={() => { setAction(p.action); setWhen(inDays(p.days)); }}
                  className={`text-xs px-2.5 py-1.5 rounded-full border ${action === p.action ? 'bg-teal-100 border-teal-300 text-teal-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
              <div>
                <Label className="text-xs">What happens next *</Label>
                <Input value={action} onChange={e => setAction(e.target.value)} placeholder="e.g. Follow up after the probate hearing" />
              </div>
              <div>
                <Label className="text-xs">When *</Label>
                <Input type="datetime-local" value={when} onChange={e => setWhen(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {mode === 'completed' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              Every completed sale should make the next sale easier to win. Optionally schedule the first follow-up now — nothing is sent automatically.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {POST_SALE_PRESETS.map(p => (
                <button
                  key={p.label}
                  onClick={() => { setAction(p.action); setWhen(inDays(p.days)); }}
                  className={`text-xs px-2.5 py-1.5 rounded-full border ${action === p.action ? 'bg-cyan-100 border-cyan-300 text-cyan-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
              <div>
                <Label className="text-xs">Follow-up (optional)</Label>
                <Input value={action} onChange={e => setAction(e.target.value)} placeholder="e.g. Thank the client for their business" />
              </div>
              <div>
                <Label className="text-xs">When</Label>
                <Input type="datetime-local" value={when} onChange={e => setWhen(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2 justify-end pt-1">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={apply} disabled={saving || !canApply}
            className={mode === 'lost' ? 'bg-red-600 hover:bg-red-700' : mode === 'nurture' ? 'bg-teal-600 hover:bg-teal-700' : mode === 'referred' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-cyan-600 hover:bg-cyan-700'}>
            {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            {mode === 'completed' ? (action.trim() ? 'Complete + Schedule Follow-Up' : 'Just Mark Completed') : `Mark ${mode === 'lost' ? 'Lost' : mode === 'referred' ? 'Referred' : 'Nurture'}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}