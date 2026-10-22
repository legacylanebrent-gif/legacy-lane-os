// Chapter 20 P1-1/P1-2 — LIVE SALE COMMAND CENTER: ONE assembled operating
// surface over canonical records. It owns NOTHING — no LiveSale entity, no
// parallel truth. Sections surface exceptions for rapid manager comprehension,
// on mobile as cleanly as desktop.
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, RadioTower, RefreshCw, Users } from 'lucide-react';
import OpenReadinessCard from '@/components/livesale/OpenReadinessCard';
import ChangesCard from '@/components/livesale/ChangesCard';
import AttentionQueueCard from '@/components/livesale/AttentionQueueCard';
import OffersCard from '@/components/livesale/OffersCard';
import HoldsCard from '@/components/livesale/HoldsCard';
import CheckoutCard from '@/components/livesale/CheckoutCard';
import PickupsCard from '@/components/livesale/PickupsCard';
import SignalsCard from '@/components/livesale/SignalsCard';
import ClosingCard from '@/components/livesale/ClosingCard';
import EntryClientCard from '@/components/livesale/EntryClientCard';
import StaffingPanel from '@/components/staffing/StaffingPanel';
import { requiredResponsibilities, coverageGaps } from '@/components/staffing/staffingModel';
import { changesSince } from '@/components/livesale/liveSaleModel';

const asArr = (r) => (Array.isArray(r) ? r : (r && r.items) || []);
const todayStartIso = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString(); };

export default function LiveSale() {
  const navigate = useNavigate();
  const [params] = useState(() => new URLSearchParams(window.location.search));
  const saleId = params.get('saleId');
  const [sale, setSale] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mySales, setMySales] = useState(null);

  const load = useCallback(async (sid) => {
    if (!sid) return;
    setLoading(true);
    try {
      const saleRows = await base44.entities.EstateSale.filter({ id: sid });
      const s = saleRows[0];
      if (!s) { setSale(null); setData(null); return; }
      setSale(s);
      const [itemsRes, offersRes, issuesRes, assignmentsRes, tasksRes, decisionsRes, checkinRes, ordersRes, briefActRes] = await Promise.all([
        base44.entities.Item.filter({ estate_sale_id: sid }, { limit: 500 }),
        base44.entities.Offer.filter({ sale_id: sid }, '-created_date', 300),
        base44.entities.SaleIssue.filter({ sale_id: sid }, '-created_date', 200),
        base44.entities.SaleStaffAssignment.filter({ sale_id: sid }),
        base44.entities.SaleTask.filter({ sale_id: sid }, { limit: 300 }),
        base44.entities.SaleClientDecision.filter({ sale_id: sid }, { limit: 100 }),
        base44.entities.CheckIn.filter({ location_id: sid }, '-created_date', 500),
        base44.entities.Order.filter({ created_date: { $gte: todayStartIso() } }, { sort: '-created_date', limit: 200 }),
        base44.entities.Activity.filter({ sale_id: sid, subject: 'Opening brief reviewed' }, { sort: '-created_date', limit: 5 }),
      ]);
      const items = asArr(itemsRes), offers = asArr(offersRes), issues = asArr(issuesRes);
      const assignments = asArr(assignmentsRes), tasks = asArr(tasksRes), decisions = asArr(decisionsRes);
      const checkins = asArr(checkinRes), ordersAll = asArr(ordersRes), briefActs = asArr(briefActRes);

      const dayStart = todayStartIso();
      const itemIds = new Set(items.map((i) => i.id));
      const ordersToday = ordersAll.filter((o) => (o.items || []).some((ci) => itemIds.has(ci.item_id)));
      const entriesToday = checkins.filter((c) => c.check_in_type === 'sale_visit' && c.created_date >= dayStart).length;
      const exitsToday = checkins.filter((c) => c.check_in_type === 'sale_exit' && c.created_date >= dayStart).length;

      const required = requiredResponsibilities({ sale: s, items });
      const gaps = coverageGaps(required, assignments);

      const soldToday = items.filter((i) => i.status === 'sold' && i.sold_date && i.sold_date >= dayStart);
      const categories = {};
      for (const i of soldToday) categories[i.category || 'other'] = (categories[i.category || 'other'] || 0) + 1;
      const openIssues = issues.filter((i) => ['OPEN', 'WAITING'].includes(i.status || 'OPEN'));
      const criticalIssues = openIssues.filter((i) => !!i.is_incident
        || ((i.urgency || 'ROUTINE') === 'URGENT' && ['safety', 'security', 'payment'].includes(i.category || 'other'))).length;

      const since = (briefActs[0] && briefActs[0].completed_date)
        || new Date(Date.now() - 24 * 3600 * 1000).toISOString();

      setData({
        items, offers, issues, assignments, tasks, decisions, ordersToday, gaps,
        changes: changesSince({ items, offers, issues, decisions, assignments, since }),
        metrics: {
          attendanceToday: entriesToday,
          approxInside: Math.max(0, entriesToday - exitsToday),
          openOffers: offers.filter((o) => o.status === 'pending').length,
          hvSoldToday: soldToday.filter((i) => i.inventory_level === 'HIGH_VALUE').length,
          awaitingPickup: items.filter((i) => i.status === 'sold' && !i.pickup_completed_at).length,
          openIssues: openIssues.length,
          criticalIssues,
          coverageGaps: gaps.length,
          categories,
        },
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (saleId) load(saleId);
    else {
      // No sale selected: offer the operator's active/upcoming sales.
      base44.entities.EstateSale.filter({ status: 'active' }, '-created_date', 50)
        .then((r) => setMySales(asArr(r)))
        .catch(() => setMySales([]))
        .finally(() => setLoading(false));
    }
  }, [saleId, load]);

  if (!saleId && !loading) {
    return (
      <div className="p-4 sm:p-8 max-w-2xl mx-auto space-y-4">
        <h1 className="text-2xl font-serif font-bold text-slate-900 flex items-center gap-2"><RadioTower className="w-6 h-6 text-orange-600" /> Live Sale</h1>
        <p className="text-sm text-slate-600">Pick an active sale to open its live operating view, or open a project and press LIVE SALE.</p>
        <div className="space-y-2">
          {(mySales || []).map((s) => (
            <Link key={s.id} to={`/LiveSale?saleId=${s.id}`} className="block">
              <Card><CardContent className="py-3 flex items-center justify-between">
                <p className="font-medium text-slate-900">{s.title}</p>
                <Badge variant="outline">{s.status}</Badge>
              </CardContent></Card>
            </Link>
          ))}
          {(mySales || []).length === 0 && <p className="text-sm text-slate-400">No active sales right now.</p>}
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="p-6 flex items-center gap-2 text-slate-400"><Loader2 className="w-5 h-5 animate-spin" /> Assembling the live view…</div>;
  }
  if (!sale || !data) {
    return <div className="p-6 text-sm text-slate-500">Sale not found. <button className="text-orange-600 underline" onClick={() => navigate('/MySales')}>Back to sales</button></div>;
  }

  const Section = ({ title, children }) => (
    <section className="space-y-3">
      <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 border-b border-slate-200 pb-1">{title}</h2>
      {children}
    </section>
  );

  return (
    <div className="p-3 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-orange-600 text-white font-semibold"><RadioTower className="w-3 h-3 mr-1" />LIVE SALE</Badge>
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-slate-900 truncate">{sale.title}</h1>
            <Badge variant="outline">{sale.status}</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {(sale.sale_dates || []).length > 0 ? `Sale day: ${new Date(sale.sale_dates[0].date).toLocaleDateString()}` : 'No sale dates set'}
            {' · '}Assembled from current records — this view owns nothing.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => load(sale.id)}>
          <RefreshCw className="w-3.5 h-3.5 mr-1" />Refresh
        </Button>
      </div>

      <Section title="Opening">
        <OpenReadinessCard sale={sale} items={data.items} issues={data.issues} tasks={data.tasks}
          coverageGaps={data.gaps} onChanged={() => load(sale.id)} />
        <ChangesCard changes={data.changes} />
      </Section>

      <Section title="Team">
        {data.gaps.length > 0 && (
          <Card className="border-amber-300 bg-amber-50"><CardContent className="py-3 flex items-start gap-2">
            <Users className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-amber-800">
              <span className="font-semibold">Coverage gap{data.gaps.length > 1 ? 's' : ''}:</span>{' '}
              {data.gaps.map((g) => `${g.type}${g.zone_name ? ` (${g.zone_name})` : ''}`).join(', ')} — UNASSIGNED. Reassign below.
            </p>
          </CardContent></Card>
        )}
        <StaffingPanel sale={sale} items={data.items} linkedDeal={null} onChanged={() => load(sale.id)} />
      </Section>

      <Section title="Attention">
        <AttentionQueueCard sale={sale} issues={data.issues} items={data.items} onChanged={() => load(sale.id)} />
      </Section>

      <Section title="Entry & Client">
        <EntryClientCard sale={sale} onChanged={() => load(sale.id)} />
      </Section>

      <Section title="Items / Offers / Holds">
        <OffersCard items={data.items} offers={data.offers} />
        <HoldsCard sale={sale} items={data.items} onChanged={() => load(sale.id)} />
        <PickupsCard items={data.items} />
      </Section>

      <Section title="Checkout">
        <CheckoutCard sale={sale} ordersToday={data.ordersToday} />
      </Section>

      <Section title="Live Signals">
        <SignalsCard sale={sale} metrics={data.metrics} />
      </Section>

      <Section title="Closing & Tomorrow">
        <ClosingCard sale={sale} items={data.items} offers={data.offers} issues={data.issues} tasks={data.tasks} onChanged={() => load(sale.id)} />
      </Section>

      <p className="text-[10px] text-slate-400 text-center pb-2">
        Live Sale is an assembled view over canonical records — Item, Offer, Order, SaleStaffAssignment, SaleIssue, SaleTask, SaleNote, CheckIn.
        Nothing here is a second truth, and closing a day never closes the project.
      </p>
    </div>
  );
}