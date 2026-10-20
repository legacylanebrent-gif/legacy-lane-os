import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { HandCoins, Plus, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const STATUS_STYLES = {
  pending: 'bg-amber-100 text-amber-700',
  accepted: 'bg-green-100 text-green-700',
  rejected: 'bg-slate-100 text-slate-500',
};

// Chapter 2 P1 — simple operator-facing offer capture for ordinary estate-sale merchandise.
// Reuses the existing Offer entity (also used by buyout events). No auctions, no deletion —
// accepted/rejected offers stay in history.
export default function OffersPanel({ saleId, items = [] }) {
  const [offers, setOffers] = useState([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ item_id: '', full_name: '', offer_amount: '', phone: '', notes: '' });

  useEffect(() => {
    if (saleId) loadOffers();
  }, [saleId]);

  const loadOffers = async () => {
    try {
      const data = await base44.entities.Offer.filter({ sale_id: saleId }, '-created_date', 200);
      setOffers(data || []);
    } catch (e) {
      toast.error('Could not load offers');
    }
  };

  const recordOffer = async () => {
    const item = items.find(i => i.id === form.item_id);
    if (!item || !form.full_name || !form.offer_amount) {
      toast.error('Item, buyer name, and amount are required');
      return;
    }
    setSaving(true);
    try {
      await base44.entities.Offer.create({
        sale_id: saleId,
        item_name: item.title,
        offer_amount: parseFloat(form.offer_amount),
        full_name: form.full_name,
        phone: form.phone || '',
        notes: form.notes || '',
        status: 'pending',
      });
      setOpen(false);
      setForm({ item_id: '', full_name: '', offer_amount: '', phone: '', notes: '' });
      await loadOffers();
      toast.success('Offer recorded');
    } catch (e) {
      toast.error('Could not record offer');
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (offer, status) => {
    try {
      await base44.entities.Offer.update(offer.id, { status });
      await loadOffers();
    } catch (e) {
      toast.error('Could not update offer');
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg flex items-center gap-2">
          <HandCoins className="w-5 h-5 text-orange-600" /> Offers
          {offers.length > 0 && <Badge variant="secondary">{offers.length}</Badge>}
        </CardTitle>
        <Button size="sm" onClick={() => setOpen(true)} className="bg-orange-600 hover:bg-orange-700">
          <Plus className="w-4 h-4 mr-1" /> Record Offer
        </Button>
      </CardHeader>
      <CardContent>
        {offers.length === 0 ? (
          <p className="text-sm text-slate-400">
            No offers recorded. Capture offers here instead of remembering them.
          </p>
        ) : (
          <div className="space-y-2">
            {offers.map(o => (
              <div key={o.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 flex-wrap">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    ${Number(o.offer_amount).toLocaleString()} — {o.item_name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {o.full_name}{o.phone ? ` · ${o.phone}` : ''} · {o.created_date ? format(new Date(o.created_date), 'MMM d, h:mm a') : ''}
                    {o.notes ? ` · ${o.notes}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={STATUS_STYLES[o.status] || STATUS_STYLES.pending}>{o.status}</Badge>
                  {o.status === 'pending' && (
                    <>
                      <Button
                        size="sm" variant="outline"
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={() => setStatus(o, 'accepted')}
                        title="Accept offer"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm" variant="outline"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setStatus(o, 'rejected')}
                        title="Reject offer"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record an Offer</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Item</Label>
              <select
                value={form.item_id}
                onChange={e => setForm(p => ({ ...p, item_id: e.target.value }))}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="">Select an item…</option>
                {items.filter(i => i.status !== 'sold').map(i => (
                  <option key={i.id} value={i.id}>{i.title}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Buyer name</Label>
              <Input value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} placeholder="Who made the offer?" />
            </div>
            <div className="space-y-1">
              <Label>Offer amount ($)</Label>
              <Input type="number" value={form.offer_amount} onChange={e => setForm(p => ({ ...p, offer_amount: e.target.value }))} placeholder="0.00" />
            </div>
            <div className="space-y-1">
              <Label>Buyer phone (optional)</Label>
              <Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Notes (optional)</Label>
              <Input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={recordOffer} disabled={saving} className="bg-orange-600 hover:bg-orange-700">
              {saving ? 'Saving…' : 'Record Offer'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}