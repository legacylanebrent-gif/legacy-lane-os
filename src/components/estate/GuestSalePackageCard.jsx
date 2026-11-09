import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Ticket, CheckCircle2, Clock, RefreshCw } from 'lucide-react';

// Shows a guest seller exactly where their paid sale package stands:
// paid and unused, payment still confirming, or already bound to a sale
// (in which case that same weekend can be rescheduled for free).
export default function GuestSalePackageCard({ sales = [] }) {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);

  const load = async () => {
    try {
      const res = await base44.functions.invoke('salePublish', { action: 'account' });
      setState(res.data || null);
    } catch (e) {
      setState(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const buyAnother = async () => {
    setBuying(true);
    try {
      const res = await base44.functions.invoke('create-checkout', { product: 'sale_package' });
      if (res.data?.redirectUrl) {
        window.location.href = res.data.redirectUrl;
        return;
      }
      throw new Error(res.data?.error || 'Checkout did not return a payment page.');
    } catch (err) {
      alert(err?.response?.data?.error || err?.message || 'Could not start checkout.');
      setBuying(false);
    }
  };

  if (loading || !state) return null;

  const { claimable, awaiting_payment: awaiting, bound = [], package: pkg } = state;
  const boundSaleFor = (id) => sales.find((s) => s.id === id);
  const activeBound = bound.filter((b) => {
    const sale = boundSaleFor(b.bound_sale_id);
    return !sale || !['completed', 'archived'].includes(sale.status);
  });

  let body;
  if (awaiting) {
    body = (
      <div className="flex items-start gap-3">
        <Clock className="w-5 h-5 text-amber-600 mt-0.5" />
        <div>
          <p className="font-medium text-slate-900">Payment still confirming</p>
          <p className="text-sm text-slate-600">
            We are waiting for Base44 Payments to confirm your ${pkg.amount} sale package. This page updates once it
            clears — no need to pay again.
          </p>
          <Button variant="outline" size="sm" className="mt-3" onClick={load}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Check again
          </Button>
        </div>
      </div>
    );
  } else if (claimable) {
    body = (
      <div className="flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5" />
        <div>
          <p className="font-medium text-slate-900">You have 1 sale package ready to use</p>
          <p className="text-sm text-slate-600">
            It covers one complete sale weekend. Create your sale, then publish it — the package attaches to that
            sale automatically and rescheduling stays free.
          </p>
          <Button size="sm" className="mt-3 bg-orange-600 hover:bg-orange-700" onClick={() => (window.location.href = createPageUrl('SaleEditor'))}>
            Create your sale
          </Button>
        </div>
      </div>
    );
  } else {
    const inUse = activeBound.map((b) => boundSaleFor(b.bound_sale_id)).filter(Boolean);
    body = (
      <div className="flex items-start gap-3">
        <Ticket className="w-5 h-5 text-slate-500 mt-0.5" />
        <div className="flex-1">
          {inUse.length > 0 ? (
            <>
              <p className="font-medium text-slate-900">Your package is in use</p>
              <p className="text-sm text-slate-600">
                {inUse.map((s) => s.title).join(', ')} — rescheduling or republishing this same sale costs nothing.
                A brand-new sale needs its own package.
              </p>
              {inUse.map((s) => {
                const ent = bound.find((b) => b.bound_sale_id === s.id);
                if (!ent || !Number(ent.ai_description_allowance || 0)) return null;
                return (
                  <p key={s.id} className="text-xs text-slate-600 mt-1">
                    {s.title}: {Number(ent.ai_descriptions_used || 0)} of {Number(ent.ai_description_allowance)} included
                    AI descriptions used. Deep Scan searches are purchased separately; adding and pricing items by hand
                    is always unlimited.
                  </p>
                );
              })}
            </>
          ) : (
            <>
              <p className="font-medium text-slate-900">No sale package on this account</p>
              <p className="text-sm text-slate-600">
                One payment of ${pkg.amount} covers one complete sale weekend, including photos, {pkg.ai_description_allowance} AI
                item descriptions, signage, checkout and post-sale reports. Deep Scan searches are purchased separately, and
                your finished sales stay in your account forever.
              </p>
            </>
          )}
          <Button size="sm" className="mt-3 bg-orange-600 hover:bg-orange-700" disabled={buying} onClick={buyAnother}>
            {buying ? 'Opening checkout…' : `Buy a sale package — $${pkg.amount}`}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card className="border-slate-200">
      <CardContent className="pt-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-900">One-Time Estate Sale</h3>
          <Badge className="bg-slate-100 text-slate-700">${pkg.amount} per sale weekend</Badge>
        </div>
        {body}
      </CardContent>
    </Card>
  );
}