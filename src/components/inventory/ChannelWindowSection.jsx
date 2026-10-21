import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { SELLING_CHANNELS } from '@/components/saleops/pricingModel';

// Chapter 16 P1-29..P1-40 — selling window, channel decision, negotiation
// authority, and the sale's planned discount stages — all assembled from
// canonical records. A channel change that needs client approval REUSES
// SaleClientDecision (one approval system, no duplicate).
export default function ChannelWindowSection({ item, sale, onChanged }) {
  const [channel, setChannel] = useState(item.selling_channel || 'ESTATE_SALE');
  const [considered, setConsidered] = useState(!!item.channel_considered);
  const [considerReason, setConsiderReason] = useState(item.channel_consideration_reason || '');
  const [noDiscount, setNoDiscount] = useState(item.negotiation_override === 'NO_DISCOUNT_WITHOUT_OPERATOR');
  const [excluded, setExcluded] = useState(!!item.excluded_from_discounts);
  const [saving, setSaving] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    setChannel(item.selling_channel || 'ESTATE_SALE');
    setConsidered(!!item.channel_considered);
    setConsiderReason(item.channel_consideration_reason || '');
    setNoDiscount(item.negotiation_override === 'NO_DISCOUNT_WITHOUT_OPERATOR');
    setExcluded(!!item.excluded_from_discounts);
  }, [item?.id]);

  const save = async () => {
    setSaving(true);
    try {
      await base44.entities.Item.update(item.id, {
        selling_channel: channel,
        channel_considered: considered,
        channel_consideration_reason: considered ? (considerReason.trim() || null) : null,
        negotiation_override: noDiscount ? 'NO_DISCOUNT_WITHOUT_OPERATOR' : 'NONE',
        excluded_from_discounts: excluded,
      });
      toast.success('Channel & authority saved');
      onChanged && onChanged();
    } catch (e) {
      toast.error('Could not save: ' + (e.message || 'error'));
    } finally {
      setSaving(false);
    }
  };

  // P1-34 — client approval reuses SaleClientDecision (decision_type 'disposition').
  const requestClientApproval = async () => {
    if (!considerReason.trim()) {
      toast.error('Record why an alternate channel is being considered first.');
      return;
    }
    setRequesting(true);
    try {
      const decision = await base44.entities.SaleClientDecision.create({
        sale_id: item.estate_sale_id,
        operator_id: item.operator_id,
        sale_team_ids: item.sale_team_ids || [],
        decision_type: 'disposition',
        subject: `Selling channel change — ${item.title}`,
        item_id: item.id,
        current_decision: 'review',
        request_status: 'REQUESTED',
        requested_decision: `Sell via ${channel === 'ESTATE_SALE' ? 'alternate channel' : channel} — ${considerReason.trim()}`,
        requested_by_name: 'Operator',
        requested_at: new Date().toISOString(),
        status: 'open',
        notes: 'Recorded from the pricing workspace (Chapter 16). Nothing changes until the operator approves.',
      });
      await base44.entities.Item.update(item.id, { channel_decision_id: decision.id });
      toast.success('Client approval request recorded — approve it from the Decisions panel.');
      onChanged && onChanged();
    } catch (e) {
      toast.error('Could not record approval request: ' + (e.message || 'error'));
    } finally {
      setRequesting(false);
    }
  };

  const dates = (sale?.sale_dates || []);

  return (
    <div className="space-y-3">
      {/* P1-29 — selling window reuse (display only, no duplicate timeline) */}
      <div className="border border-slate-200 rounded-lg p-3 space-y-1.5 bg-slate-50">
        <Label className="text-xs font-semibold text-slate-700">Selling window (from the sale)</Label>
        {dates.length === 0 && <p className="text-xs text-slate-500 italic">No sale dates set on this sale.</p>}
        {dates.map((d, i) => (
          <p key={i} className="text-xs text-slate-700">
            {d.date}{d.start_time && ` · ${d.start_time}`}{d.end_time && `–${d.end_time}`}
          </p>
        ))}
      </div>

      {/* P1-32/P1-33 — channel decision + alternate-channel flag */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold text-slate-900">Selling channel</Label>
        <select value={channel} onChange={e => setChannel(e.target.value)} className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs">
          {SELLING_CHANNELS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <label className="flex items-start gap-2 text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5">
          <input type="checkbox" checked={considered} onChange={e => setConsidered(e.target.checked)} className="mt-0.5" />
          <span>
            <span className="font-medium">Consider alternate channel</span>
            <span className="text-slate-500"> — a review flag; the item is never rerouted automatically.</span>
          </span>
        </label>
        {considered && (
          <>
            <Input value={considerReason} onChange={e => setConsiderReason(e.target.value)} placeholder="Why (specialist interest, auction potential, better venue…)" className="text-xs h-8" />
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={requestClientApproval} disabled={requesting}>
                {requesting ? 'Recording…' : 'Record client-approval request'}
              </Button>
              {item.channel_decision_id && <Badge variant="secondary">Approval request recorded — see Decisions panel</Badge>}
            </div>
          </>
        )}
      </div>

      {/* P1-37/P1-40 — item-level negotiation override + discount exclusion */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold text-slate-900">Negotiation &amp; discounts</Label>
        <label className="flex items-start gap-2 text-xs bg-amber-50 border border-amber-200 rounded-lg p-2.5">
          <input type="checkbox" checked={noDiscount} onChange={e => setNoDiscount(e.target.checked)} className="mt-0.5" />
          <span>
            <span className="font-medium text-amber-900">No discount without operator approval</span>
            <span className="text-amber-700"> — this item overrides the company's general negotiation policy.</span>
          </span>
        </label>
        <label className="flex items-start gap-2 text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5">
          <input type="checkbox" checked={excluded} onChange={e => setExcluded(e.target.checked)} className="mt-0.5" />
          <span>
            <span className="font-medium">Excluded from the sale's planned discount schedule</span>
            <span className="text-slate-500"> — a stage never silently reduces this item; discounting it is an explicit authorized change.</span>
          </span>
        </label>
      </div>

      {/* P1-39 — the sale's planned stages (guidance display) */}
      {(sale?.discount_schedule || []).length > 0 && (
        <div className="border border-slate-200 rounded-lg p-3 space-y-1 bg-slate-50">
          <Label className="text-xs font-semibold text-slate-700">Planned discount stages (guidance — never applied automatically)</Label>
          {sale.discount_schedule.map(s => (
            <p key={s.stage_id || s.name} className="text-xs text-slate-700">
              {s.name}{s.discount_percent != null && ` — ${s.discount_percent}% off`}{s.start_at && ` · from ${new Date(s.start_at).toLocaleDateString()}`}
              {s.note && ` (${s.note})`}
            </p>
          ))}
          {excluded && <p className="text-[10px] text-amber-700">This item is excluded — stages do not apply to it.</p>}
        </div>
      )}

      <Button size="sm" onClick={save} disabled={saving} className="bg-cyan-600 hover:bg-cyan-700">
        {saving ? 'Saving…' : 'Save channel & authority'}
      </Button>
    </div>
  );
}