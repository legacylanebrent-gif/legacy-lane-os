import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Lock, History } from 'lucide-react';
import { toast } from 'sonner';
import { MARKET_CONTEXTS } from '@/components/saleops/pricingModel';

// Chapter 16 P1-15..P1-20 — the PRICE section of the pricing workspace.
// Item.price stays the ONE current price. Opening price (original_price) is
// preserved. Every price change goes through changeItemPrice (authority +
// reason + history). The operator range is a PLANNING range — never an appraisal.
export default function PriceDecisionSection({ item, authorized, onItemUpdate }) {
  const isHighValue = item.inventory_level === 'HIGH_VALUE';
  const [newPrice, setNewPrice] = useState('');
  const [reason, setReason] = useState('');
  const [changing, setChanging] = useState(false);
  const [rangeLow, setRangeLow] = useState(item.price_range_low ?? '');
  const [rangeHigh, setRangeHigh] = useState(item.price_range_high ?? '');
  const [rationale, setRationale] = useState(item.pricing_rationale || '');
  const [marketContext, setMarketContext] = useState(item.market_context || 'UNKNOWN');
  const [history, setHistory] = useState([]);
  const [savingContext, setSavingContext] = useState(false);

  useEffect(() => {
    if (item?.id) {
      base44.entities.Activity.filter({ item_id: item.id }, '-created_date', 30)
        .then(rows => setHistory((rows || []).filter(a => (a.subject || '').startsWith('Price changed'))))
        .catch(() => setHistory([]));
    }
  }, [item?.id, item?.price]);

  const changePrice = async () => {
    const price = parseFloat(newPrice);
    if (!Number.isFinite(price) || price <= 0) {
      toast.error('Enter a valid new price');
      return;
    }
    if (isHighValue && !authorized) {
      toast.error('High Value price changes require the sale operator — ask the operator to authorize this change.');
      return;
    }
    if (isHighValue && !reason.trim()) {
      toast.error('A reason is required for every High Value price change.');
      return;
    }
    setChanging(true);
    try {
      const res = await base44.functions.invoke('changeItemPrice', {
        item_id: item.id, new_price: price, reason: reason.trim() || undefined,
      });
      if (res.data?.error) {
        toast.error(res.data.error);
      } else if (!res.data?.unchanged) {
        toast.success(`Price changed to $${price.toLocaleString()}${reason.trim() ? ' — reason recorded' : ''}`);
      }
      setNewPrice('');
      setReason('');
      onItemUpdate && onItemUpdate();
    } catch (e) {
      const msg = e?.response?.data?.error || e.message || 'Could not change price';
      toast.error(msg);
    } finally {
      setChanging(false);
    }
  };

  const saveContext = async () => {
    setSavingContext(true);
    try {
      await base44.entities.Item.update(item.id, {
        price_range_low: rangeLow === '' ? null : parseFloat(rangeLow),
        price_range_high: rangeHigh === '' ? null : parseFloat(rangeHigh),
        pricing_rationale: rationale.trim() || null,
        market_context: marketContext,
      });
      toast.success('Pricing context saved');
      onItemUpdate && onItemUpdate();
    } catch (e) {
      toast.error('Could not save pricing context: ' + (e.message || 'error'));
    } finally {
      setSavingContext(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-3 flex-wrap">
        <div>
          <Label className="text-xs text-slate-500">Current price</Label>
          <p className="text-2xl font-bold text-orange-600">${Number(item.price || 0).toLocaleString()}</p>
        </div>
        {item.original_price != null && Number(item.original_price) !== Number(item.price) && (
          <div>
            <Label className="text-xs text-slate-500">Opening price</Label>
            <p className="text-lg font-semibold text-slate-500">${Number(item.original_price).toLocaleString()}</p>
          </div>
        )}
      </div>

      {/* Price change — authority enforced in the function, not just hidden UI */}
      <div className="border border-slate-200 rounded-lg p-3 space-y-2">
        <Label className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
          {isHighValue && <Lock className="w-3.5 h-3.5 text-amber-600" />}
          Change price {isHighValue && <span className="text-amber-700">(High Value — operator only, reason required)</span>}
        </Label>
        {isHighValue && !authorized ? (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5">
            High Value price changes require the sale operator or an admin. Ask the operator — an unauthorized change will be denied.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Input type="number" value={newPrice} onChange={e => setNewPrice(e.target.value)} placeholder="New price ($)" className="text-sm h-9" />
              <Input value={reason} onChange={e => setReason(e.target.value)}
                placeholder={isHighValue ? 'Reason (required)' : 'Reason (optional)'} className="text-sm h-9 sm:col-span-2" />
            </div>
            <Button size="sm" onClick={changePrice} disabled={changing} className="bg-cyan-600 hover:bg-cyan-700">
              {changing ? 'Changing…' : 'Change price'}
            </Button>
          </>
        )}
        <p className="text-[10px] text-slate-400">
          Labels and the QR item page always show the current price; re-print physical labels after a change. Historical offers and transactions are never rewritten.
        </p>
      </div>

      {/* Operator range + rationale — planning context, never an appraisal */}
      <div className="border border-slate-200 rounded-lg p-3 space-y-2">
        <Label className="text-sm font-semibold text-slate-900">Operator pricing range &amp; rationale</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Input type="number" value={rangeLow} onChange={e => setRangeLow(e.target.value)} placeholder="Range low ($)" className="text-sm h-9" />
          <Input type="number" value={rangeHigh} onChange={e => setRangeHigh(e.target.value)} placeholder="Range high ($)" className="text-sm h-9" />
        </div>
        <select value={marketContext} onChange={e => setMarketContext(e.target.value)} className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs">
          {MARKET_CONTEXTS.map(m => <option key={m.value} value={m.value}>Market: {m.label}</option>)}
        </select>
        <Textarea value={rationale} onChange={e => setRationale(e.target.value)} rows={2} className="text-xs"
          placeholder="Why this price: three sold comparables; condition below the strongest comparable; local pickup market; short selling window; client approved aggressive pricing…" />
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-[10px] text-slate-400">Your planning range and reasoning — not an appraisal, never a client promise.</p>
          <Button size="sm" variant="outline" onClick={saveContext} disabled={savingContext}>Save context</Button>
        </div>
      </div>

      {/* Price history (Activity) */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1"><History className="w-3.5 h-3.5" /> Price history</Label>
        {history.length === 0 && <p className="text-xs text-slate-400 italic">No price changes recorded yet.</p>}
        {history.map(h => (
          <p key={h.id} className="text-xs text-slate-600 border border-slate-100 rounded px-2 py-1 bg-slate-50">
            <span className="font-medium">{h.description}</span>
            <span className="text-slate-400"> · {h.created_date ? new Date(h.created_date).toLocaleDateString() : ''}</span>
          </p>
        ))}
      </div>

      {item.excluded_from_discounts && (
        <Badge className="bg-amber-100 text-amber-800">Excluded from the sale's planned discounts</Badge>
      )}
    </div>
  );
}