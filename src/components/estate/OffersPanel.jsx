import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import useSaleScope from '@/hooks/useSaleScope';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { HandCoins, Plus, Check, X, ShoppingCart, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const STATUS_STYLES = {
  pending: 'bg-amber-100 text-amber-700',
  accepted: 'bg-green-100 text-green-700',
  rejected: 'bg-slate-100 text-slate-500',
};

// Chapter 2 P1 + Chapter 15 P1-35…P1-41 — operator-facing offer capture. Reuses the
// existing Offer entity (no auctions, no deletion — history is kept). Chapter 15 adds
// the canonical Item link (item_id, never a name-string identity), and the smallest
// ACCEPTED-OFFER → CHECKOUT handoff: it prefills the existing workflow and NEVER claims
// payment — payment truth stays in the Order/Transaction system.
export default function OffersPanel({ saleId, items = [] }) {
  const saleScope = useSaleScope(saleId);
  const [offers, setOffers] = useState([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [convertingId, setConvertingId] = useState(null);
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
        operator_id: saleScope?.operatorId,
        item_id: item.id, // Chapter 15 P1-35 — canonical stable ID, not the name
        item_name: item.title, // legacy display snapshot only
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

  // Chapter 15 P1-39/P1-40/P1-41 — smallest safe conversion of an ACCEPTED offer into the
  // existing checkout workflow. No Chapter 21 state machine, no automatic paid status,
  // no invented transaction: the handoff prefills, and payment happens at the Checkout
  // Station like every other sale. converted_at is the idempotency anchor.
  const convertOffer = async offer => {
    if (offer.converted_at) {
      toast.info('This offer was already handed off to checkout.');
      return;
    }
    setConvertingId(offer.id);
    try {
      const now = new Date().toISOString();
      const item = items.find(i => i.id === offer.item_id);
      if (offer.user_id && item) {
        const cart = await base44.entities.Cart.create({
          user_id: offer.user_id,
          items: [{
            item_id: item.id,
            item_title: item.title,
            quantity: 1,
            price: offer.offer_amount,
            seller_id: item.seller_id,
            seller_name: item.seller_name,
          }],
          total: offer.offer_amount,
        });
        await base44.entities.Offer.update(offer.id, { converted_at: now, converted_cart_id: cart.id });
        toast.success(`Checkout cart prepared for ${offer.full_name} at the accepted $${offer.offer_amount} — complete payment at the Checkout Station.`);
      } else {
        await base44.entities.Offer.update(offer.id, { converted_at: now });
        if (item) {
          await base44.entities.Item.update(item.id, {
            status: 'reserved',
            buyer_name: offer.full_name || '',
            buyer_contact: offer.phone || offer.email || '',
            payment_notes: `Accepted offer $${offer.offer_amount} — NO payment record; complete at checkout/POS.`,
          });
        }
        toast.warning('Item reserved with buyer details prefilled from the accepted offer — NO payment record exists yet. Complete the sale at Checkout/POS.');
      }
      await loadOffers();
    } catch (e) {
      toast.error('Could not hand the offer off to checkout: ' + e.message);
    } finally {
      setConvertingId(null);
    }
  };

  const itemNameFor = o => {
    const linked = items.find(i => i.id === o.item_id);
    return linked ? linked.title : o.item_name;
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
                    ${Number(o.offer_amount).toLocaleString()} — {itemNameFor(o)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {o.full_name}{o.phone ? ` · ${o.phone}` : ''} · {o.created_date ? format(new Date(o.created_date), 'MMM d, h:mm a') : ''}
                    {o.notes ? ` · ${o.notes}` : ''}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {o.item_id ? 'linked to item record' : 'legacy offer — not linked to an item record'}
                    {o.converted_at ? ` · sent to checkout ${format(new Date(o.converted_at), 'MMM d')}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
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
                  {o.status === 'accepted' && (
                    o.converted_at ? (
                      <Badge className="bg-blue-50 text-blue-700 border border-blue-200"><CreditCard className="w-3 h-3 mr-1" />at checkout</Badge>
                    ) : (
                      <Button
                        size="sm" variant="outline"
                        className="border-orange-300 text-orange-700 gap-1"
                        disabled={convertingId === o.id}
                        onClick={() => convertOffer(o)}
                        title="Hand off to checkout with item, buyer and accepted amount prefilled — no payment is recorded yet"
                      >
                        <ShoppingCart className="w-4 h-4" /> Checkout
                      </Button>
                    )
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