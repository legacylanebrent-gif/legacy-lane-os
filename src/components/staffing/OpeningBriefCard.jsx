// Chapter 19 P1-27..P1-29 — the OPENING BRIEF card (operator view): the same
// server-derived brief every employee sees in My Sale Day, plus the
// reviewed-today acknowledgment. It owns nothing — one derivation, one truth.
import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, ClipboardList, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import AuthorityMatrixCard from './AuthorityMatrixCard';
import AskForHelpDialog from './AskForHelpDialog';

const URGENCY_BADGE = {
  URGENT: 'bg-red-100 text-red-700 border-red-300',
  IMPORTANT: 'bg-amber-100 text-amber-800 border-amber-300',
  ROUTINE: 'bg-slate-100 text-slate-500 border-slate-300',
};

export default function OpeningBriefCard({ sale, askForHelp }) {
  const [brief, setBrief] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [reviewedBy, setReviewedBy] = useState([]);
  const [helpOpen, setHelpOpen] = useState(false);

  const load = async () => {
    if (!sale) return;
    setLoading(true);
    try {
      const res = await base44.functions.invoke('mySaleDay', { action: 'view', sale_id: sale.id });
      setBrief(res?.data?.brief || null);
      setReviewedBy(res?.data?.brief_reviewed_today_by || []);
    } catch (e) {
      console.error(e);
      setBrief(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [sale?.id]);

  const markReviewed = async () => {
    setReviewing(true);
    try {
      const res = await base44.functions.invoke('mySaleDay', { action: 'ack_brief', sale_id: sale.id });
      toast.success(res?.data?.already ? 'Already recorded today' : 'Marked as reviewed');
      await load();
    } catch (e) {
      console.error(e);
      toast.error('Could not record the review');
    } finally {
      setReviewing(false);
    }
  };

  if (loading) {
    return <Card><CardContent className="py-6 flex items-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Assembling the opening brief…</CardContent></Card>;
  }
  if (!brief) {
    return <Card><CardContent className="py-6 text-sm text-slate-400">Brief not available.</CardContent></Card>;
  }

  const b = brief;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-cyan-700" /> Opening Brief
          {b.open_issues?.some((i) => i.urgency === 'URGENT') && <Badge className="bg-red-100 text-red-700 border-red-300">URGENT ISSUE OPEN</Badge>}
        </CardTitle>
        <p className="text-xs text-slate-500">
          Assembled from recorded truth — the same brief the team sees in My Sale Day.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {reviewedBy.length > 0 && (
          <p className="text-xs flex items-center gap-1.5 text-green-700">
            <CheckCircle2 className="w-3.5 h-3.5" /> Reviewed today by {reviewedBy.join(', ')}.
          </p>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Responsibilities</p>
            {b.responsibilities?.length === 0 && <p className="text-xs text-slate-400">No active responsibilities assigned.</p>}
            {b.responsibilities?.map((r, i) => (
              <p key={i} className="text-xs text-slate-700">
                <span className="font-medium">{(r.responsibility_type || '').replace(/_/g, ' ')}</span>
                {r.zone_name ? ` — ${r.zone_name}` : ''}: {r.primary_member_name || 'Unassigned'}
                {r.backup_member_name ? ` (backup: ${r.backup_member_name})` : ''}
              </p>
            ))}

            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide pt-1">Tasks due today or overdue</p>
            {b.tasks_due_today?.length === 0 && <p className="text-xs text-slate-400">Nothing due today.</p>}
            {b.tasks_due_today?.map((t) => (
              <p key={t.id} className="text-xs text-slate-700"><span className="font-medium">{t.name}</span> — {t.assignee_name} (due {t.due_date})</p>
            ))}

            {(b.customer_flow?.checkout_location || b.customer_flow?.entry_note || b.customer_flow?.exit_note) && (
              <>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide pt-1">Customer flow</p>
                <p className="text-xs text-slate-600">
                  {b.customer_flow?.entry_note && <>Enter: {b.customer_flow.entry_note}. </>}
                  {b.customer_flow?.checkout_location && <>Checkout: {b.customer_flow.checkout_location}. </>}
                  {b.customer_flow?.exit_note && <>Exit: {b.customer_flow.exit_note}.</>}
                </p>
              </>
            )}
            {b.pickup_plan?.pickup_window && (
              <p className="text-xs text-slate-600">Pickup window: {b.pickup_plan.pickup_window} — {b.pickup_plan.pickup_location || 'as posted'}.</p>
            )}
            {b.discount_policy_note && <p className="text-xs text-slate-600">Discount policy: {b.discount_policy_note}</p>}
            {b.special_instructions && <p className="text-xs text-slate-600">Special instructions: {b.special_instructions}</p>}
          </div>

          <div className="space-y-2">
            {(b.restricted_zones?.length > 0 || b.excluded_areas?.length > 0) && (
              <>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Restricted / excluded areas</p>
                {b.restricted_zones?.map((z) => (
                  <p key={z.zone_id} className="text-xs text-red-700 font-medium">{z.name} — {(z.access_class || '').replace(/_/g, ' ')}</p>
                ))}
                {b.excluded_areas?.filter((e) => !e.resolved).map((e, i) => (
                  <p key={i} className="text-xs text-slate-600">Excluded: {e.name}{e.note ? ` — ${e.note}` : ''}</p>
                ))}
              </>
            )}

            {b.high_value_attention?.length > 0 && (
              <>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">High Value / attention merchandise</p>
                {b.high_value_attention.map((i, idx) => (
                  <p key={idx} className="text-xs text-slate-700">
                    <span className="font-medium">{i.title}</span>
                    {i.item_number ? ` (#${i.item_number})` : ''} — {i.inventory_level === 'HIGH_VALUE' ? 'HIGH VALUE' : (i.display_attention || '').replace(/_/g, ' ')}
                  </p>
                ))}
              </>
            )}

            {b.controlling_decisions?.length > 0 && (
              <>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Controlling client decisions</p>
                {b.controlling_decisions.map((d) => (
                  <p key={d.id} className="text-xs text-slate-700">
                    <span className="font-medium">{d.subject}</span>: {d.current_decision}
                    {d.request_pending && <Badge className="ml-1 bg-amber-100 text-amber-800 border-amber-300">REQUEST PENDING — NOT APPROVED</Badge>}
                  </p>
                ))}
              </>
            )}

            {b.open_issues?.length > 0 && (
              <>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Open issues</p>
                {b.open_issues.map((i) => (
                  <p key={i.id} className="text-xs text-slate-700 flex items-center gap-1.5 flex-wrap">
                    <Badge variant="outline" className={URGENCY_BADGE[i.urgency]}>{i.urgency}</Badge>
                    {i.title}{i.owner_name ? ` — ${i.owner_name}` : ''}
                  </p>
                ))}
              </>
            )}
          </div>
        </div>

        <AuthorityMatrixCard sale={sale} rows={b.authority_matrix} />

        <div className="flex flex-wrap gap-2 pt-1">
          <Button size="sm" variant="outline" onClick={markReviewed} disabled={reviewing}>
            {reviewing && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Mark brief reviewed
          </Button>
          <Button size="sm" variant="outline" onClick={() => setHelpOpen(true)}>Ask for help / escalate</Button>
        </div>

        {(helpOpen || askForHelp) && (
          <AskForHelpDialog sale={sale} onClose={() => setHelpOpen(false)} onCreated={() => { setHelpOpen(false); load(); }} />
        )}
      </CardContent>
    </Card>
  );
}