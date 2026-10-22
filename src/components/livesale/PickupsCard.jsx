// Chapter 20 P1-58 + Ch21 boundary — AWAITING PICKUP in the live view: sold
// merchandise still physically on the property, from canonical Item pickup
// truth only. SOLD ≠ PAID ≠ RELEASED.
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PackageCheck } from 'lucide-react';

export default function PickupsCard({ items }) {
  const awaiting = (items || []).filter((i) => i.status === 'sold' && !i.pickup_completed_at);
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <PackageCheck className="w-5 h-5 text-indigo-600" /> Awaiting Pickup
          <Badge variant="outline">{awaiting.length}</Badge>
        </CardTitle>
        <p className="text-xs text-slate-500">Sold merchandise still on the property — EXACT from Item records.</p>
      </CardHeader>
      <CardContent>
        {awaiting.length === 0 ? (
          <p className="text-xs text-slate-400">Nothing sold is waiting on a pickup.</p>
        ) : (
          <ul className="space-y-1.5">
            {awaiting.slice(0, 15).map((i) => {
              const req = i.pickup_requirements || {};
              const notes = [
                req.scheduled_required ? 'scheduled pickup required' : '',
                req.additional_people ? 'two-person removal' : '',
                req.equipment_needed ? `needs: ${req.equipment_needed}` : '',
                req.pickup_window ? req.pickup_window : '',
                i.authorized_pickup ? `alt. pickup: ${i.authorized_pickup}` : '',
              ].filter(Boolean);
              return (
                <li key={i.id} className="text-xs border border-slate-200 rounded p-2">
                  <p className="font-medium text-slate-900">{i.title}{i.item_number ? ` (#${i.item_number})` : ''}</p>
                  <p className="text-slate-500">
                    ${Number(i.sold_price ?? i.price).toLocaleString()} · buyer {i.buyer_name || '—'}
                    {i.payment_method_used ? ` · ${i.payment_method_used}` : ''}
                  </p>
                  {notes.length > 0 && <p className="text-[10px] text-indigo-700 mt-0.5">{notes.join(' · ')}</p>}
                </li>
              );
            })}
            {awaiting.length > 15 && <p className="text-[10px] text-slate-400">+{awaiting.length - 15} more</p>}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}