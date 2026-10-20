import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { History } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import DecisionChangeDialog from './DecisionChangeDialog';
import { MERCH_OPTIONS, merchBadgeClass, buildHistoryEntry, asArray, fmtDateTime } from './saleDecisionModel';

// KEEP / SELL / REVIEW — client disposition authority, recorded through the same
// SaleClientDecision architecture (decision_type 'merchandise'). Item.status
// (selling/transaction state) is never modified here.

function DecisionRow({ label, detail, thumb, decision, onDecide, onHistory, historyCount }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 border rounded-lg hover:bg-slate-50 transition-colors">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {thumb ? (
          <img src={thumb} alt="" className="w-12 h-12 rounded-md object-cover border border-slate-200 flex-shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] text-slate-400 flex-shrink-0">IMG</div>
        )}
        <div className="min-w-0">
          <p className="font-medium text-slate-900 truncate">{label}</p>
          {detail && <p className="text-xs text-slate-500 truncate">{detail}</p>}
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {decision ? (
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${merchBadgeClass(decision.current_decision)}`}>
            {decision.current_decision.toUpperCase()}
          </span>
        ) : (
          <span className="text-xs text-slate-400 px-2">No decision</span>
        )}
        {historyCount > 1 && (
          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={onHistory} title="View change history">
            <History className="w-3.5 h-3.5 text-slate-400" />
          </Button>
        )}
        {MERCH_OPTIONS.map(o => (
          <Button key={o.key} variant="outline" size="sm"
            className={`h-7 px-2 text-xs ${decision?.current_decision === o.key ? merchBadgeClass(o.key) : ''}`}
            onClick={() => onDecide(o.key)}>
            {o.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

export default function MerchandiseDecisionPanel({ sale, user, authorities, decisions, onChanged, onGoToAuthorities }) {
  const [items, setItems] = useState([]);
  const [changeTarget, setChangeTarget] = useState(null); // { type: 'item'|'image', ref, newDecision }
  const [historyTarget, setHistoryTarget] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await base44.entities.Item.filter({ estate_sale_id: sale.id });
        if (!cancelled) setItems(asArray(res));
      } catch (e) {
        console.error('Error loading items:', e);
      }
    })();
    return () => { cancelled = true; };
  }, [sale.id]);

  const merchDecisions = decisions.filter(d => d.decision_type === 'merchandise');
  const decForItem = (id) => merchDecisions.find(d => d.item_id === id);
  const decForImage = (idx) => merchDecisions.find(d => d.image_index === idx && !d.item_id);
  const reviewOpen = merchDecisions.filter(d => d.current_decision === 'review' && d.status === 'open');
  const activeAuthorities = authorities.filter(a => a.is_active);

  const applyDecision = async ({ authorityId, source, reason, notes }) => {
    const target = changeTarget;
    if (!target) return;
    const authority = authorities.find(a => a.id === authorityId);
    const entry = buildHistoryEntry({ decision: target.newDecision, authority, source, reason, notes, user });
    const existing = target.existing;
    try {
      if (!existing) {
        await base44.entities.SaleClientDecision.create({
          sale_id: sale.id,
          operator_id: sale.operator_id,
          company_id: sale.company_id || '',
          sale_team_ids: sale.sale_team || [],
          decision_type: 'merchandise',
          subject: target.subject,
          item_id: target.type === 'item' ? target.ref : '',
          image_index: target.type === 'image' ? target.ref : undefined,
          current_decision: target.newDecision,
          status: target.newDecision === 'review' ? 'open' : 'resolved',
          history: [entry],
          authorized_by: authority?.id || '',
          authorized_by_name: authority?.full_name || '',
          decided_at: entry.decided_at,
          source,
          notes: notes || '',
          recorded_by: user?.id || '',
          recorded_by_name: user?.full_name || '',
        });
      } else {
        await base44.entities.SaleClientDecision.update(existing.id, {
          current_decision: target.newDecision,
          history: [...(existing.history || []), entry],
          authorized_by: authority?.id || '',
          authorized_by_name: authority?.full_name || '',
          decided_at: entry.decided_at,
          source,
          status: target.newDecision === 'review' ? 'open' : 'resolved',
        });
      }
      setChangeTarget(null);
      onChanged();
    } catch (e) {
      console.error(e);
      alert('Could not record merchandise decision');
    }
  };

  const onDecideItem = (item, newDecision) => {
    if (activeAuthorities.length === 0) { alert('Add an authorized decision-maker first — a decision must record who authorized it.'); onGoToAuthorities(); return; }
    const existing = decForItem(item.id);
    if (existing && existing.current_decision === newDecision) return;
    setChangeTarget({
      type: 'item', ref: item.id, newDecision, existing,
      subject: `Merchandise: ${item.title}`,
    });
  };

  const onDecideImage = (idx, img) => {
    if (activeAuthorities.length === 0) { alert('Add an authorized decision-maker first — a decision must record who authorized it.'); onGoToAuthorities(); return; }
    const existing = decForImage(idx);
    setChangeTarget({ type: 'image', ref: idx, newDecision: 'review', existing,
      subject: `Property photo: ${img.name || `Photo ${idx + 1}`}` });
  };

  const showItem = (d) => {
    if (filter === 'review') return d && d.current_decision === 'review' && d.status === 'open';
    if (filter === 'decided') return !!d;
    return true;
  };

  return (
    <div className="space-y-4">
      {reviewOpen.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <p className="text-sm text-amber-800 font-medium">
            {reviewOpen.length} merchandise item{reviewOpen.length === 1 ? '' : 's'} awaiting a client decision (REVIEW)
          </p>
          <Button variant="outline" size="sm" onClick={() => setFilter('review')}>Show unresolved</Button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {['all', 'decided', 'review'].map(f => (
          <Button key={f} variant={filter === f ? 'default' : 'outline'} size="sm"
            onClick={() => setFilter(f)} className="capitalize">
            {f === 'review' ? 'Review needed' : f}
          </Button>
        ))}
        <span className="text-xs text-slate-500 self-center ml-1">
          KEEP/SELL/REVIEW is the client's disposition authority — it never changes an item's selling status.
        </span>
      </div>

      <div>
        <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">Inventory items</p>
        <Card><CardContent className="p-3 space-y-2">
          {items.length === 0 && <p className="text-sm text-slate-500 p-2">No inventory items for this sale.</p>}
          {items.filter(i => showItem(decForItem(i.id))).map(item => {
            const d = decForItem(item.id);
            return (
              <DecisionRow key={item.id}
                label={item.title}
                detail={`Selling status: ${item.status}`}
                thumb={item.images?.[0]}
                decision={d}
                historyCount={d?.history?.length || 0}
                onHistory={() => setHistoryTarget(d)}
                onDecide={(nd) => onDecideItem(item, nd)}
              />
            );
          })}
        </CardContent></Card>
      </div>

      <div>
        <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">Property photos (before inventory)</p>
        <Card><CardContent className="p-3 space-y-2">
          {(sale.images || []).length === 0 && <p className="text-sm text-slate-500 p-2">No property photos on this sale.</p>}
          {(sale.images || []).map((img, idx) => {
            const d = decForImage(idx);
            return (
              <DecisionRow key={idx}
                label={img.name || `Photo ${idx + 1}`}
                detail={img.description || ''}
                thumb={img.url || img.thumbnail_url}
                decision={d}
                historyCount={d?.history?.length || 0}
                onHistory={() => setHistoryTarget(d)}
                onDecide={() => onDecideImage(idx, img)}
              />
            );
          })}
        </CardContent></Card>
      </div>

      {changeTarget && (
        <DecisionChangeDialog open={true} onClose={() => setChangeTarget(null)} onSubmit={applyDecision}
          authorities={authorities} mode={changeTarget.existing ? 'change' : 'create'}
          lockedDecision={changeTarget.existing
            ? `${changeTarget.subject}\nCurrent: ${changeTarget.existing.current_decision.toUpperCase()} → New: ${changeTarget.newDecision.toUpperCase()}`
            : `${changeTarget.subject}\nDecision: ${changeTarget.newDecision.toUpperCase()}`} />
      )}

      <Dialog open={!!historyTarget} onOpenChange={o => { if (!o) setHistoryTarget(null); }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Decision History — {historyTarget?.subject}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {(historyTarget?.history || []).slice().reverse().map((h, idx) => (
              <div key={idx} className={`p-3 rounded-lg border ${idx === 0 ? 'border-cyan-300 bg-cyan-50' : 'border-slate-200'}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-900">{String(h.decision).toUpperCase()}</span>
                  {idx === 0 && <Badge className="bg-cyan-100 text-cyan-700">CURRENT</Badge>}
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Authorized by {h.authorized_by_name || 'unknown'} · {fmtDateTime(h.decided_at)} · via {h.source?.replace('_', ' ')}
                  {h.reason ? ` — ${h.reason}` : ''}
                </p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}