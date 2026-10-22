// Chapter 20 P1-58 + Chapter 21 P1 — AWAITING PICKUP in the live view: sold
// merchandise still physically on the property, from canonical Item pickup
// truth only. Chapter 21 adds PARTIAL-release truth (remaining counts), the
// operator-recorded pickup deadline with an honest MISSED PICKUP warning, and
// a deadline setter. SOLD ≠ PAID ≠ RELEASED.
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PackageCheck } from 'lucide-react';
import { toast } from 'sonner';

const releasedCount = (i) => ((i && i.releases) || []).reduce((s, r) => s + (Number(r.quantity) || 0), 0);
const remainingCount = (i) => Math.max(0, (Number(i?.quantity) || 1) - releasedCount(i));
const todayStr = () => new Date().toISOString().slice(0, 10);

export default function PickupsCard({ items }) {
  const [busyId, setBusyId] = useState(null);

  const sold = (items || []).filter((i) => i.status === 'sold');
  const awaiting = sold.filter((i) => remainingCount(i) > 0 || !i.pickup_completed_at);
  const missed = awaiting.filter((i) => i.pickup_due_date && i.pickup_due_date < todayStr());

  const setDeadline = async (item, value) => {
    setBusyId(item.id);
    try {
      await base44.entities.Item.update(item.id, { pickup_due_date: value || null });
      toast.success(value ? 'Pickup deadline recorded' : 'Pickup deadline cleared');
      // parent refresh happens via onChanged in LiveSale; local hint:
      item.pickup_due_date = value || null;
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Could not save the deadline');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <PackageCheck className="w-5 h-5 text-indigo-600" /> Awaiting Pickup
          <Badge variant="outline">{awaiting.length}</Badge>
          {missed.length > 0 && <Badge className="bg-red-100 text-red-800 border-red-300">{missed.length} missed</Badge>}
        </CardTitle>
        <p className="text-xs text-slate-500">Sold merchandise still on the property — EXACT from Item records (partial releases stay open until fully released).</p>
      </CardHeader>
      <CardContent>
        {awaiting.length === 0 ? (
          <p className="text-xs text-slate-400">Nothing sold is waiting on a pickup.</p>
        ) : (
          <ul className="space-y-1.5">
            {awaiting.slice(0, 15).map((i) => {
              const remaining = remainingCount(i);
              const total = Number(i.quantity) || 1;
              const req = i.pickup_requirements || {};
              const isMissed = i.pickup_due_date && i.pickup_due_date < todayStr();
              const notes = [
                total > 1 ? `${total - remaining} of ${total} released · ${remaining} remaining` : '',
                req.scheduled_required ? 'scheduled pickup required' : '',
                req.additional_people ? 'two-person removal' : '',
                req.equipment_needed ? `needs: ${req.equipment_needed}` : '',
                req.pickup_window ? req.pickup_window : '',
                i.authorized_pickup ? `alt. pickup: ${i.authorized_pickup}` : '',
              ].filter(Boolean);
              return (
                <li key={i.id} className={`text-xs border rounded p-2 ${isMissed ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}>
                  <p className="font-medium text-slate-900">{i.title}{i.item_number ? ` (#${i.item_number})` : ''}</p>
                  <p className="text-slate-500">
                    ${Number(i.sold_price ?? i.price).toLocaleString()} · buyer {i.buyer_name || '—'}
                    {i.payment_method_used ? ` · ${i.payment_method_used}` : ''}
                  </p>
                  {notes.length > 0 && <p className="text-[10px] text-indigo-700 mt-0.5">{notes.join(' · ')}</p>}
                  {isMissed && <p className="text-[10px] text-red-700 mt-0.5 font-semibold">MISSED PICKUP — deadline {i.pickup_due_date} passed and merchandise is still here.</p>}
                  <div className="flex items-center gap-1.5 mt-1">
                    <label className="text-[10px] text-slate-500">Pickup deadline</label>
                    <input
                      type="date"
                      value={i.pickup_due_date || ''}
                      disabled={busyId === i.id}
                      onChange={(e) => setDeadline(i, e.target.value)}
                      className="h-6 px-1 border border-slate-300 rounded text-[10px]"
                    />
                  </div>
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