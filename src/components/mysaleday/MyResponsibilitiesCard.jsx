// Chapter 19 P1-21 — My Sale Day: my responsibilities and zones.
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, UserCheck } from 'lucide-react';

const TYPE_LABELS = {
  ENTRY: 'Entry / Greeter', CHECKOUT: 'Checkout', FLOOR_ZONE: 'Floor Zone', HIGH_VALUE: 'High Value Watch',
  NEGOTIATION: 'Negotiation', FURNITURE: 'Furniture / Heavy Items', PICKUP: 'Pickup / Releases',
  CUSTOMER_ISSUES: 'Customer Issues', SALE_FLOOR_RECOVERY: 'Sale Floor Recovery', OTHER: 'Other',
};

export default function MyResponsibilitiesCard({ responsibilities, zones }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2"><UserCheck className="w-5 h-5 text-cyan-700" /> My responsibilities</CardTitle>
        <p className="text-xs text-slate-500">What you are responsible for today. It is assignment truth — never more authority than the matrix says.</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {(!responsibilities || responsibilities.length === 0) && <p className="text-sm text-slate-400">No responsibilities assigned to you for this sale.</p>}
        {responsibilities?.map((r) => (
          <div key={r.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
            <p className="text-sm font-medium text-slate-800">
              {TYPE_LABELS[r.responsibility_type] || r.responsibility_type}{r.zone_name ? ` — ${r.zone_name}` : ''}
            </p>
            <p className="text-xs text-slate-500 flex flex-wrap gap-x-3">
              {r.is_backup && <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">Backup / second</Badge>}
              {r.planned_hours != null && <span>{r.planned_hours} planned hrs</span>}
              {r.notes && <span>{r.notes}</span>}
            </p>
          </div>
        ))}
        {zones && zones.length > 0 && (
          <div className="pt-1 flex flex-wrap gap-2">
            {zones.map((z) => (
              <Badge key={z.zone_id} variant="outline" className="bg-cyan-50 text-cyan-700 border-cyan-200">
                <MapPin className="w-3 h-3 mr-1" />{z.name} — {(z.sale_day_status || z.prep_status || '').replace(/_/g, ' ') || 'in progress'}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}