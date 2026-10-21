import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, HandCoins } from 'lucide-react';
import { formatItemNumber, locationDisplay, LEVEL_META } from '@/components/saleops/inventoryLevels';

// Chapter 15 P1-34 — authenticated employee scan view. Role-appropriate operational
// information for staff after scanning an item QR; the public QR still just opens the
// public item page for buyers — no private research leaks to the public.
export default function ItemInspectDialog({ open, item, zones, onClose, onAddToCart }) {
  const [offerCount, setOfferCount] = useState(null);

  useEffect(() => {
    if (open && item?.id) {
      base44.entities.Offer.filter({ item_id: item.id })
        .then(offers => setOfferCount((offers || []).length))
        .catch(() => setOfferCount(null));
    }
  }, [open, item]);

  if (!item) return null;

  const level = LEVEL_META[item.inventory_level] || LEVEL_META.STANDARD;
  const loc = locationDisplay(item, zones);

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            {formatItemNumber(item.item_number)} {item.title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <div className="flex gap-2 flex-wrap">
            <Badge variant="secondary">{item.status}</Badge>
            <Badge className="bg-orange-100 text-orange-700">{level.label}</Badge>
            {item.research_status && item.research_status !== 'CLEAR' && (
              <Badge className="bg-violet-100 text-violet-700 border border-violet-300" title={item.research_reason || ''}>
                Research: {item.research_status === 'VERIFY' ? 'Verify' : item.research_status === 'SPECIALIST_REVIEW' ? 'Specialist' : 'Needed'}
              </Badge>
            )}
            {item.inventory_level === 'HIGH_VALUE' && item.controlled_location && (
              <Badge className="bg-amber-100 text-amber-800">Controlled location</Badge>
            )}
          </div>
          <p className="text-2xl font-bold text-orange-600">${item.price?.toLocaleString()}</p>
          <p className="text-slate-600 text-xs">{loc ? `Location: ${loc}` : 'Location: not assigned'}</p>
          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
            <span className="text-slate-500">Verification: {(item.verification_status || 'UNVERIFIED').replace(/_/g, ' ').toLowerCase()}</span>
            <span className="text-slate-500 flex items-center gap-1">
              <HandCoins className="w-3.5 h-3.5" />
              {offerCount == null ? 'Offers: —' : `Offers: ${offerCount}`}
            </span>
            <span className="text-slate-500">
              {item.status === 'sold' ? (item.pickup_completed_at ? 'Released' : 'Awaiting pickup') : 'Available to sell'}
            </span>
            <span className="text-slate-500">Qty: {item.quantity}</span>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Close</Button>
          {onAddToCart && item.status !== 'sold' && (
            <Button onClick={onAddToCart} className="bg-orange-600 hover:bg-orange-700 gap-2">
              <ShoppingCart className="w-4 h-4" /> Add to cart
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}