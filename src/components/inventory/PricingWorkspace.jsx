import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { formatItemNumber, LEVEL_META } from '@/components/saleops/inventoryLevels';
import { RESEARCH_STATE_META, highConsequence } from '@/components/saleops/pricingModel';
import ComparablesSection from '@/components/inventory/ComparablesSection';
import PriceDecisionSection from '@/components/inventory/PriceDecisionSection';
import SpecialistSection from '@/components/inventory/SpecialistSection';
import AppraisalSection from '@/components/inventory/AppraisalSection';
import ChannelWindowSection from '@/components/inventory/ChannelWindowSection';

// Chapter 16 P1-15 — the ONE pricing workspace: an ASSEMBLED view of canonical
// truth (identity, level, photos, facts, research, verification, condition,
// comparables, appraisal context, specialist opinions, selling window, channel,
// range, current price, history, offers, outcome). No DashboardData-style
// duplication, no PricingDecision entity — every section reads/writes the
// canonical records it belongs to.
export default function PricingWorkspace({ open, item: initialItem, onClose, onSaved }) {
  const [item, setItem] = useState(initialItem);
  const [sale, setSale] = useState(null);
  const [offers, setOffers] = useState([]);
  const [me, setMe] = useState(null);
  const [tab, setTab] = useState('price');

  useEffect(() => {
    setItem(initialItem);
    setTab('price');
  }, [initialItem?.id, open]);

  useEffect(() => {
    if (open && initialItem?.id) {
      base44.auth.me().then(setMe).catch(() => setMe(null));
      if (initialItem.estate_sale_id) {
        base44.entities.EstateSale.filter({ id: initialItem.estate_sale_id })
          .then(rows => setSale(rows[0] || null))
          .catch(() => setSale(null));
      }
      base44.entities.Offer.filter({ item_id: initialItem.id }, '-created_date', 50)
        .then(setOffers)
        .catch(() => setOffers([]));
    }
  }, [open, initialItem?.id]);

  // Refresh the canonical item after any section writes.
  const refreshItem = async () => {
    try {
      const rows = await base44.entities.Item.filter({ id: initialItem.id });
      if (rows[0]) setItem(rows[0]);
      onSaved && onSaved(rows[0]);
    } catch (e) { /* keep current view */ }
  };

  const authorized = useMemo(() => {
    if (!me || !item) return false;
    return me.role === 'admin' || me.id === item.operator_id || me.id === item.seller_id;
  }, [me, item]);

  if (!item) return null;

  const level = LEVEL_META[item.inventory_level] || LEVEL_META.STANDARD;
  const research = RESEARCH_STATE_META[item.research_status || 'CLEAR'] || RESEARCH_STATE_META.CLEAR;
  const isHighValue = item.inventory_level === 'HIGH_VALUE';

  const TABS = [
    { key: 'price', label: 'Price' },
    { key: 'evidence', label: 'Comparables' },
    { key: 'specialist', label: 'Specialist & appraisal' },
    { key: 'channel', label: 'Channel & window' },
  ];

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base flex-wrap">
            {formatItemNumber(item.item_number)} {item.title}
          </DialogTitle>
          <DialogDescription>
            Pricing workspace — pricing is a human decision supported by evidence. The system never sets, authenticates, or appraises a price.
          </DialogDescription>
        </DialogHeader>

        {/* Identity & state strip — canonical facts, no duplication */}
        <div className="flex gap-1.5 flex-wrap text-xs">
          <Badge className="bg-orange-100 text-orange-700">{level.label}</Badge>
          <Badge className={research.tone}>{research.label} (research)</Badge>
          <Badge variant="outline" className="text-slate-600">
            Verification: {(item.verification_status || 'UNVERIFIED').replace(/_/g, ' ').toLowerCase()}
          </Badge>
          {highConsequence(item) && <Badge className="bg-red-100 text-red-700">High-consequence research</Badge>}
          {item.selling_channel && item.selling_channel !== 'ESTATE_SALE' && (
            <Badge variant="secondary">{item.selling_channel.replace(/_/g, ' ').toLowerCase()}</Badge>
          )}
          {isHighValue && <Badge className="bg-amber-100 text-amber-800">High Value — operator price authority</Badge>}
        </div>

        {(item.verified_facts || []).length > 0 && (
          <div className="text-xs border border-green-100 bg-green-50 rounded-md px-2.5 py-1.5">
            <p className="font-semibold text-green-800 mb-0.5">Verified facts (buyer-facing)</p>
            {item.verified_facts.map((f, i) => (
              <p key={i} className="text-green-900">• {f.text} <span className="text-green-600">({(f.source_type || '').replace(/_/g, ' ').toLowerCase()})</span></p>
            ))}
          </div>
        )}
        {(item.research_notes || []).length > 0 && (
          <div className="text-xs border border-violet-100 bg-violet-50 rounded-md px-2.5 py-1.5">
            <p className="font-semibold text-violet-800 mb-0.5">Research notes (working — never buyer-facing)</p>
            {item.research_notes.map((n, i) => (
              <p key={i} className="text-violet-900">• {n.text} <span className="text-violet-600">({(n.source_type || '').replace(/_/g, ' ').toLowerCase()})</span></p>
            ))}
          </div>
        )}
        {(item.photo_library || []).length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {item.photo_library.slice(0, 6).map((p, i) => (
              <img key={i} src={p.url} alt={p.note || 'item photo'} className="w-14 h-14 object-cover rounded border border-slate-200" />
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 border-b overflow-x-auto">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 text-xs font-medium whitespace-nowrap border-b-2 -mb-px ${tab === t.key ? 'border-cyan-600 text-cyan-700' : 'border-transparent text-slate-500'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'price' && <PriceDecisionSection item={item} authorized={authorized} onItemUpdate={refreshItem} />}
        {tab === 'evidence' && <ComparablesSection item={item} onChanged={refreshItem} />}
        {tab === 'specialist' && (
          <div className="space-y-5">
            <SpecialistSection item={item} onChanged={refreshItem} />
            <AppraisalSection item={item} onChanged={refreshItem} />
          </div>
        )}
        {tab === 'channel' && <ChannelWindowSection item={item} sale={sale} onChanged={refreshItem} />}

        {/* Buyer response — linked offers, amounts never rewritten */}
        <div className="border-t pt-3">
          <p className="text-xs font-semibold text-slate-700 mb-1">Buyer response — offers ({offers.length})</p>
          {offers.length === 0 && <p className="text-xs text-slate-400 italic">No offers recorded.</p>}
          {offers.slice(0, 5).map(o => (
            <p key={o.id} className="text-xs text-slate-600">
              <span className="font-medium">${Number(o.offer_amount).toLocaleString()}</span> — {o.full_name}
              <Badge variant="secondary" className="ml-1.5 text-[9px]">{o.status}</Badge>
            </p>
          ))}
        </div>

        {/* Outcome — post-sale review for important items (deterministic, no AI) */}
        {item.status === 'sold' ? (
          <div className="border border-green-100 bg-green-50 rounded-md px-2.5 py-2 text-xs">
            <p className="font-semibold text-green-800">Outcome</p>
            <p className="text-green-900">
              Sold {item.sold_price != null ? `for $${Number(item.sold_price).toLocaleString()}` : `at $${Number(item.price).toLocaleString()}`}
              {item.sold_date && ` · ${new Date(item.sold_date).toLocaleDateString()}`}
              {item.original_price != null && ` · opened at $${Number(item.original_price).toLocaleString()}`}
            </p>
          </div>
        ) : sale && sale.status === 'completed' ? (
          <div className="border border-amber-100 bg-amber-50 rounded-md px-2.5 py-2 text-xs">
            <p className="font-semibold text-amber-900">Unsold after the sale</p>
            <p className="text-amber-800">What does this outcome teach about the price? Disposition is handled elsewhere — nothing changes here automatically.</p>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}