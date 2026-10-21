// Chapter 7 P2 — BUYER DETAIL DRAWER.
// A summary view over the operator's OWN relationship records (timeline) plus
// the safe consent/interest projection from the buyerAudience seam. It
// duplicates nothing and never shows consumer PII the operator is not
// authorized to see.
import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Loader2, Mail, MessageSquare, Ban, Crown, BellRing, Star, ShoppingCart, Tag, CalendarCheck, HandCoins, UserPlus, Heart } from 'lucide-react';

const EVENT_ICONS = {
  early_sign_in: CalendarCheck, check_in: CalendarCheck, offer: HandCoins,
  purchase: ShoppingCart, vip_invite: Crown, follow: Heart
};
const EVENT_LABELS = {
  early_sign_in: 'Early Sign-In', check_in: 'Checked In', offer: 'Offer',
  purchase: 'Purchase', vip_invite: 'VIP Event', follow: 'Started Following'
};

export default function BuyerDetailDrawer({ buyer, open, onOpenChange }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !buyer) return;
    setLoading(true); setDetail(null);
    base44.functions.invoke('buyerAudience', { action: 'detail', key: buyer.key, user_id: buyer.user_id, email: buyer.email })
      .then((res) => setDetail(res.data))
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [open, buyer && buyer.key]);

  if (!buyer) return null;
  const o = (buyer.observed || {});
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto p-0">
        <SheetHeader className="p-4 border-b border-slate-200">
          <SheetTitle className="text-lg">{buyer.display_name || buyer.email || 'Buyer'}</SheetTitle>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {buyer.email_ok
              ? <Badge className="bg-green-100 text-green-800 border-green-200"><Mail className="w-3 h-3 mr-1" /> Email OK</Badge>
              : <Badge variant="outline" className="text-slate-500"><Ban className="w-3 h-3 mr-1" /> No email consent</Badge>}
            {buyer.sms_ok
              ? <Badge className="bg-green-100 text-green-800 border-green-200"><MessageSquare className="w-3 h-3 mr-1" /> SMS OK</Badge>
              : <Badge variant="outline" className="text-slate-500"><Ban className="w-3 h-3 mr-1" /> No SMS consent</Badge>}
            {buyer.vip && <Badge className="bg-amber-100 text-amber-800 border-amber-200"><Crown className="w-3 h-3 mr-1" /> VIP</Badge>}
            {buyer.follower && <Badge className="bg-cyan-100 text-cyan-800 border-cyan-200"><BellRing className="w-3 h-3 mr-1" /> Follower</Badge>}
          </div>
        </SheetHeader>

        <div className="p-4 space-y-5 text-sm">
          <div>
            <div className="font-semibold text-slate-900 mb-1.5">Explicit interests</div>
            <div className="text-xs text-slate-500 mb-2">Declared by the buyer — never inferred from behavior.</div>
            {(buyer.explicit_interests || []).length
              ? <div className="flex flex-wrap gap-1.5">{buyer.explicit_interests.map((i, k) => <Badge key={k} variant="secondary"><Star className="w-3 h-3 mr-1" />{i}</Badge>)}</div>
              : <div className="text-slate-500">None declared.</div>}
            {detail && (detail.wanted || []).length > 0 && (
              <ul className="mt-2 text-slate-600 list-disc list-inside">
                {detail.wanted.map((w, i) => <li key={i}>{w.title}{w.category ? ` (${w.category})` : ''}</li>)}
              </ul>
            )}
          </div>

          <div>
            <div className="font-semibold text-slate-900 mb-1.5">Observed activity with you</div>
            <div className="text-xs text-slate-500 mb-2">Behavior — this is never marketing consent.</div>
            <div className="grid grid-cols-2 gap-2">
              <Stat icon={CalendarCheck} label="Sales attended" value={o.sales_attended} />
              <Stat icon={UserPlus} label="Early sign-ins" value={o.sign_ins} />
              <Stat icon={CalendarCheck} label="Check-ins" value={o.check_ins} />
              <Stat icon={HandCoins} label="Offers" value={o.offers} />
              <Stat icon={ShoppingCart} label="Purchases" value={o.purchases} />
              <Stat icon={Crown} label="VIP events" value={o.vip_events} />
            </div>
            {(o.offer_items || []).length > 0 && (
              <div className="mt-2 flex items-start gap-1.5 text-slate-600">
                <Tag className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>Offered on: {o.offer_items.join(', ')}</span>
              </div>
            )}
          </div>

          <div>
            <div className="font-semibold text-slate-900 mb-1.5">Timeline</div>
            {loading ? <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
              : (detail && (detail.timeline || []).length > 0) ? (
                <div className="space-y-2">
                  {detail.timeline.map((ev, i) => {
                    const Icon = EVENT_ICONS[ev.type] || CalendarCheck;
                    return (
                      <div key={i} className="flex items-start gap-2.5">
                        <Icon className="w-4 h-4 mt-0.5 text-slate-400 flex-shrink-0" />
                        <div>
                          <span className="font-medium text-slate-800">{EVENT_LABELS[ev.type] || ev.type}</span>
                          {ev.detail && <span className="text-slate-600"> — {ev.detail}</span>}
                          {ev.status && ev.type === 'offer' && <Badge variant="outline" className="ml-1.5 text-[10px]">{ev.status}</Badge>}
                          {ev.date && <div className="text-xs text-slate-400">{new Date(ev.date).toLocaleDateString()}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : <div className="text-slate-500">No recorded activity yet.</div>}
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-md p-3 text-xs text-slate-500">
            Marketing eligibility reflects only the buyer's own opt-ins. Attending, purchasing, offering or
            signing in never counts as consent.
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="bg-slate-50 border border-slate-100 rounded-md px-2.5 py-2">
      <div className="flex items-center gap-1.5 text-slate-500 text-xs"><Icon className="w-3.5 h-3.5" />{label}</div>
      <div className="font-semibold text-slate-900">{value ?? 0}</div>
    </div>
  );
}