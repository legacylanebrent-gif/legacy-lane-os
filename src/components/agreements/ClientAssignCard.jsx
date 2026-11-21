import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, Phone, UserRound } from 'lucide-react';
import AssignClientDialog from './AssignClientDialog';

// The sale's client at a glance, with the one-click way to assign or change them.
export default function ClientAssignCard({ sale, deal, authorities, user, onAssigned }) {
  const [open, setOpen] = useState(false);
  const active = (authorities || []).filter(a => a.is_active);
  const primary = active.find(a => a.is_primary) || active[0];
  const name = deal?.client_name || primary?.full_name || '';
  const email = deal?.client_email || primary?.email || '';
  const phone = deal?.client_phone || primary?.phone || '';

  return (
    <Card className="border-slate-200">
      <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-cyan-50 border border-cyan-200 flex items-center justify-center flex-shrink-0">
          <UserRound className="w-4 h-4 text-cyan-700" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-slate-800">Client on this sale</span>
            {primary?.verification_status === 'VERIFIED' && (
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 text-[10px]">DECISION-MAKER</Badge>
            )}
          </div>
          {name ? (
            <div className="text-xs text-slate-600 mt-0.5 space-y-0.5">
              <p className="font-medium text-slate-700">{name}{primary?.relationship ? ` · ${primary.relationship}` : ''}</p>
              {email && <p className="inline-flex items-center gap-1"><Mail className="w-3 h-3" />{email}</p>}
              {phone && <p className="inline-flex items-center gap-1 sm:ml-3"><Phone className="w-3 h-3" />{phone}</p>}
            </div>
          ) : (
            <p className="text-xs text-slate-500 mt-0.5">
              No client assigned yet — assign one and the proposal and contract use their details right away.
            </p>
          )}
        </div>
        <Button size="sm" variant={name ? 'outline' : 'default'} className={name ? '' : 'bg-orange-600 hover:bg-orange-700'} onClick={() => setOpen(true)}>
          {name ? 'Change client' : 'Assign client'}
        </Button>
      </CardContent>
      <AssignClientDialog
        open={open}
        onOpenChange={setOpen}
        sale={sale}
        deal={deal}
        authorities={authorities}
        user={user}
        onDone={(msg) => { onAssigned(msg); }}
      />
    </Card>
  );
}