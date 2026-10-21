// Chapter 17 P1-29/P1-30 — PUBLIC BUYER GUIDE ("How This Sale Works"). A safe,
// publicly reachable page assembled ONLY from sale-specific public truth:
// dates, customer path, open/restricted zones (names only — never the private
// reasons), payment methods, discount plan, pickup plan and special notes.
// NEVER rendered: site_assessment/access details, client information, tasks,
// issues, notes, custody, controlled locations, private economics, buyer PII.
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Printer, Info, MapPin, CreditCard, Tag, PackageOpen, Ban, ShoppingBag, Clock } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';

const Section = ({ icon: Icon, title, children }) => (
  <Card>
    <CardContent className="p-5">
      <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2 mb-2"><Icon className="w-4 h-4 text-cyan-700" />{title}</h2>
      {children}
    </CardContent>
  </Card>
);
const Honest = ({ children }) => <p className="text-slate-500 text-sm">{children}</p>;

export default function SaleGuide() {
  const navigate = useNavigate();
  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notPublic, setNotPublic] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');
        if (!id) { setNotPublic(true); setLoading(false); return; }
        // Public read: sale RLS only exposes draft/archived sales to their own
        // team — an anonymous or unrelated visitor gets nothing here.
        const sales = await base44.entities.EstateSale.filter({ id });
        if (!sales.length) { setNotPublic(true); }
        else setSale(sales[0]);
      } catch (e) {
        console.error(e);
        setNotPublic(true);
      } finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) {
    return <div className="p-8 animate-pulse"><div className="h-8 bg-slate-200 rounded w-1/3 mb-4"></div><div className="h-64 bg-slate-200 rounded"></div></div>;
  }

  if (notPublic || !sale) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center">
        <Info className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <h1 className="text-xl font-semibold text-slate-800 mb-1">Sale guide not available</h1>
        <p className="text-slate-500 text-sm">This sale guide is not published. If you are looking for a sale, browse sales from the home page.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(createPageUrl('Home'))}>Go to home page</Button>
      </div>
    );
  }

  const flow = sale.customer_flow || {};
  const plan = sale.pickup_plan || {};
  const zones = sale.prep_zones || [];
  const openZones = zones.filter(z => z.access_class === 'OPEN_TO_CUSTOMERS');
  const restrictedZones = zones.filter(z => ['STAFF_ONLY', 'CLOSED_RESTRICTED'].includes(z.access_class));
  const stages = (sale.discount_schedule || []).filter(s => s && Number(s.discount_percent) > 0);
  const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : null;

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate(createPageUrl('EstateSaleDetail') + '?id=' + sale.id)} className="text-slate-500 -ml-2 mb-1 text-xs">
            <ArrowLeft className="w-3 h-3 mr-1" />Back to the sale
          </Button>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900">How This Sale Works</h1>
          <p className="text-slate-600">{sale.title}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="w-4 h-4 mr-1" />Print</Button>
      </div>

      {(sale.sale_dates || []).length > 0 && (
        <Section icon={Clock} title="Sale hours">
          {sale.sale_dates.map((d, i) => (
            <p key={i} className="text-slate-700 text-sm">
              {fmtDate(d.date)}{d.start_time ? ` · ${d.start_time}${d.end_time ? `–${d.end_time}` : ''}` : ''}
            </p>
          ))}
        </Section>
      )}

      <Section icon={MapPin} title="Where to enter & how the sale flows">
        {flow.entry_note ? <p className="text-slate-700 text-sm"><strong>Enter:</strong> {flow.entry_note}</p> : <Honest>Ask our staff at the entrance.</Honest>}
        {flow.exit_note && <p className="text-slate-700 text-sm mt-1"><strong>Exit / large purchases leave:</strong> {flow.exit_note}</p>}
        {flow.checkout_location && <p className="text-slate-700 text-sm mt-1"><strong>Checkout:</strong> {flow.checkout_location}</p>}
        {flow.queue_note && <p className="text-slate-600 text-xs mt-1">{flow.queue_note}</p>}
        {openZones.length > 0 && (
          <div className="mt-2">
            <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">You may shop in</p>
            <div className="flex flex-wrap gap-1.5">{openZones.map(z => <Badge key={z.zone_id} variant="outline" className="font-normal bg-cyan-50 text-cyan-800 border-cyan-200">{z.name}</Badge>)}</div>
          </div>
        )}
        {restrictedZones.length > 0 && (
          <div className="mt-2">
            <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">These areas are not part of the sale</p>
            <div className="flex flex-wrap gap-1.5">{restrictedZones.map(z => <Badge key={z.zone_id} variant="outline" className="font-normal bg-slate-100 text-slate-600 border-slate-300">{z.name}</Badge>)}</div>
          </div>
        )}
      </Section>

      <Section icon={Tag} title="Prices & discounts">
        <p className="text-slate-700 text-sm">Each individually labeled item shows its price on its tag — scan the tag's QR code on your phone for details and current status.</p>
        {stages.length > 0 ? (
          <ul className="mt-2 space-y-1">
            {stages.map((s, i) => (
              <li key={i} className="text-slate-700 text-sm">
                <strong>{s.name || 'Discount stage'}: {Number(s.discount_percent)}% off</strong>
                {s.start_at ? ` (begins ${fmtDate(s.start_at.slice(0, 10))})` : ''}
                {s.note ? ` — ${s.note}` : ''}
              </li>
            ))}
            <li className="text-slate-500 text-xs">Some items are excluded from discounts — discounts are applied by our staff at checkout.</li>
          </ul>
        ) : <Honest>No discount schedule has been announced for this sale — prices on the tags are the prices.</Honest>}
      </Section>

      <Section icon={ShoppingBag} title="How sold items are marked">
        <p className="text-slate-700 text-sm">Once you buy an item it is marked <strong>SOLD</strong> and stays where it is until you take it. If an item still in the house shows a SOLD sign, it has already been purchased — it is not available.</p>
      </Section>

      <Section icon={CreditCard} title="Checking out">
        {flow.checkout_location ? <p className="text-slate-700 text-sm">Check out at <strong>{flow.checkout_location}</strong>.</p> : <Honest>Ask any staff member where to check out.</Honest>}
        {(sale.payment_methods || []).length > 0 ? (
          <p className="text-slate-700 text-sm mt-1">We accept: <strong>{sale.payment_methods.map(m => m.replace(/_/g, ' ')).join(', ')}</strong>.</p>
        ) : <Honest>Accepted payment methods — ask at checkout.</Honest>}
      </Section>

      <Section icon={PackageOpen} title="Furniture & large purchases">
        <p className="text-slate-700 text-sm">Large items stay in the house until you take them. Some large items require a scheduled pickup — the label or our staff will tell you, and you can arrange pickup at checkout.</p>
        {plan.pickup_window && <p className="text-slate-700 text-sm mt-1"><strong>Pickup window:</strong> {plan.pickup_window}</p>}
        {plan.pickup_location && <p className="text-slate-700 text-sm mt-1"><strong>Pickup location:</strong> {plan.pickup_location}</p>}
        {plan.instructions && <p className="text-slate-600 text-sm mt-1">{plan.instructions}</p>}
        {!plan.pickup_window && !plan.pickup_location && !plan.instructions && <Honest>Pickup details — ask our staff at checkout.</Honest>}
      </Section>

      {sale.special_notes && (
        <Section icon={Ban} title="Sale policies">
          <p className="text-slate-700 text-sm whitespace-pre-wrap">{sale.special_notes}</p>
        </Section>
      )}

      <p className="text-xs text-slate-400 text-center pb-4">This guide reflects the sale's information as of right now. Our staff can always help with anything it does not cover.</p>
    </div>
  );
}