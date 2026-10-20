import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const PAYMENT_METHODS = [
  { value: '', label: 'Not recorded' },
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'credit_card', label: 'Credit card' },
  { value: 'venmo', label: 'Venmo' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'zelle', label: 'Zelle' },
  { value: 'cashapp', label: 'Cash App' },
  { value: 'other', label: 'Other' },
];

// Chapter 2 P1 — captures buyer / payment / pickup details when an item is marked sold.
// Selling status and physical custody remain separate concerns (pickup completes in Guided Closeout).
// onConfirm(details) saves with details; onConfirm(null) marks sold without them.
export default function SoldDetailsDialog({ open, item, onClose, onConfirm }) {
  const [form, setForm] = useState({
    buyer_name: '', buyer_contact: '', payment_method_used: '', payment_notes: '', pickup_instructions: '',
  });

  useEffect(() => {
    if (item) {
      setForm({
        buyer_name: item.buyer_name || '',
        buyer_contact: item.buyer_contact || '',
        payment_method_used: item.payment_method_used || '',
        payment_notes: item.payment_notes || '',
        pickup_instructions: item.pickup_location?.instructions || '',
      });
    }
  }, [item]);

  if (!item) return null;

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Mark “{item.title}” as Sold</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            Optional but recommended — this records who bought it, whether it is paid, and how it will be picked up.
          </p>
          <div className="space-y-1">
            <Label>Buyer name</Label>
            <Input value={form.buyer_name} onChange={e => set('buyer_name', e.target.value)} placeholder="Who bought it?" />
          </div>
          <div className="space-y-1">
            <Label>Buyer contact (phone / email)</Label>
            <Input value={form.buyer_contact} onChange={e => set('buyer_contact', e.target.value)} placeholder="Optional" />
          </div>
          <div className="space-y-1">
            <Label>Payment method</Label>
            <select
              value={form.payment_method_used}
              onChange={e => set('payment_method_used', e.target.value)}
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
            >
              {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Payment notes</Label>
            <Input value={form.payment_notes} onChange={e => set('payment_notes', e.target.value)} placeholder="Optional (e.g. deposit paid, balance on pickup)" />
          </div>
          <div className="space-y-1">
            <Label>Pickup instructions / timing</Label>
            <Textarea
              value={form.pickup_instructions}
              onChange={e => set('pickup_instructions', e.target.value)}
              rows={2}
              placeholder="e.g. Buyer picking up Saturday 9am, back porch, bring a dolly"
            />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button onClick={() => onConfirm(form)} className="bg-orange-600 hover:bg-orange-700 flex-1">
            Save &amp; Mark Sold
          </Button>
          <Button variant="outline" onClick={() => onConfirm(null)}>Skip Details</Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}