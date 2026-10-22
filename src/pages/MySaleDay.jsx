// Chapter 19 P1 — MY SALE DAY: the team member's one sale-day view. All data
// is derived server-side (mySaleDay) from canonical records; this page owns
// nothing. Mobile-first, vertical layout.
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, CalendarDays, GraduationCap, Loader2, Siren } from 'lucide-react';
import MyResponsibilitiesCard from '@/components/mysaleday/MyResponsibilitiesCard';
import MyDayTasksCard from '@/components/mysaleday/MyDayTasksCard';
import MyPoliciesCard from '@/components/mysaleday/MyPoliciesCard';
import MyAuthoritiesCard from '@/components/mysaleday/MyAuthoritiesCard';
import MyIssuesCard from '@/components/mysaleday/MyIssuesCard';
import OpeningBriefCard from '@/components/staffing/OpeningBriefCard';

export default function MySaleDay() {
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState([]);
  const [saleId, setSaleId] = useState(null);
  const [view, setView] = useState(null);

  const loadSales = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('mySaleDay', { action: 'view' });
      const list = res?.data?.sales || [];
      setSales(list);
      if (list.length > 0 && !saleId) setSaleId(list[0].id);
      else if (list.length === 0) setLoading(false);
    } catch (e) {
      console.error(e);
      setSales([]);
      setLoading(false);
    }
  };

  const loadView = async (sid) => {
    if (!sid) return;
    setLoading(true);
    setView(null);
    try {
      const res = await base44.functions.invoke('mySaleDay', { action: 'view', sale_id: sid });
      setView(res?.data || null);
    } catch (e) {
      console.error(e);
      setView(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSales(); /* eslint-disable-next-line */ }, []);
  useEffect(() => { if (saleId) loadView(saleId); /* eslint-disable-next-line */ }, [saleId]);

  if (loading && !view) {
    return <div className="p-6 flex items-center gap-2 text-slate-400"><Loader2 className="w-5 h-5 animate-spin" /> Loading your sale day…</div>;
  }

  if (sales.length === 0) {
    return (
      <div className="p-6 max-w-xl mx-auto space-y-3 text-center">
        <Siren className="w-10 h-10 mx-auto text-slate-300" />
        <h1 className="text-2xl font-serif font-bold text-slate-900">My Sale Day</h1>
        <p className="text-sm text-slate-600">
          You are not on a sale team yet. Ask your operator to add you to the sale team in EstateSalen.
        </p>
      </div>
    );
  }

  const urgent = (view?.brief?.open_issues || []).filter((i) => i.urgency === 'URGENT');

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900">My Sale Day</h1>
          {view?.sale ? (
            <p className="text-sm text-slate-600 flex flex-wrap items-center gap-x-3 mt-0.5">
              <span className="font-medium text-slate-800">{view.sale.title}</span>
              <span className="capitalize">{view.sale.status}</span>
              {(view.sale.sale_dates || []).length > 0 && (
                <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" />{view.sale.sale_dates[0]?.date}{view.sale.sale_dates.length > 1 ? ` +${view.sale.sale_dates.length - 1} more` : ''}</span>
              )}
            </p>
          ) : null}
        </div>
        {sales.length > 1 && (
          <Select value={saleId || ''} onValueChange={setSaleId}>
            <SelectTrigger className="w-full sm:w-56"><SelectValue /></SelectTrigger>
            <SelectContent>{sales.map((s) => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}</SelectContent>
          </Select>
        )}
      </div>

      {urgent.length > 0 && (
        <Card className="border-red-300 bg-red-50">
          <CardContent className="py-3 flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-800">
              <p className="font-semibold">Urgent issue{urgent.length > 1 ? 's' : ''} on this sale — find the operator or manager now:</p>
              {urgent.map((i) => <p key={i.id}>• {i.title}</p>)}
            </div>
          </CardContent>
        </Card>
      )}

      {view && (
        <>
          <MyResponsibilitiesCard responsibilities={view.my_responsibilities} zones={view.my_zones} />
          <MyDayTasksCard tasks={view.my_tasks} />
          <OpeningBriefCard sale={view.sale} />
          <MyAuthoritiesCard authorities={view.authorities} />
          <MyPoliciesCard policies={view.policies} />
          <MyIssuesCard issues={view.my_issues} />
        </>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <Link to="/PosPractice"><Button variant="outline" size="sm"><GraduationCap className="w-4 h-4 mr-1" />Practice checkout & payment</Button></Link>
      </div>
      {!view && !loading && <p className="text-sm text-slate-500">Pick a sale above to see your day.</p>}
    </div>
  );
}