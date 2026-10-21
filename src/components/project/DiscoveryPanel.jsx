// Chapter 14 P1 — DISCOVERIES: the routing board. Every discovery goes into
// an EXISTING canonical process (client decision, research flags, specialist
// network, donation workflow, private sensitive handling, restricted hold) —
// no second decision/research/specialist/disposition system. Promotion to a
// formal Item is explicit, idempotent, and preserves this record as history.
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, PackageSearch, Plus, Printer } from 'lucide-react';
import {
  DISCOVERY_TYPES, ROUTES, ROUTE_FLAG_DEFAULTS, CUSTODY_EVENTS, RESOLUTIONS,
  discoveryTypeLabel, routeLabel, routeBadge, appendCustodyEvent,
} from '@/components/saleops/discoveryModel';
import DiscoveryDialog from '@/components/project/DiscoveryDialog';

export default function DiscoveryPanel({ sale, zones, discoveries, onChanged }) {
  const [me, setMe] = useState(null);
  const [busy, setBusy] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [promote, setPromote] = useState(null); // { disc, price, category }
  const [resolve, setResolve] = useState(null); // { disc, resolution, note }
  const [custody, setCustody] = useState(null); // { disc, event, note, location }

  useEffect(() => { base44.auth.me().then(setMe).catch(() => {}); }, []);

  const zoneName = (id) => (zones || []).find(z => z.zone_id === id)?.name || 'Property level';
  const open = (discoveries || []).filter(d => (d.resolution_status || 'open') === 'open');
  const resolved = (discoveries || []).filter(d => (d.resolution_status || 'open') !== 'open');

  const updateDisc = async (id, patch) => {
    setBusy(id);
    try {
      await base44.entities.SaleDiscovery.update(id, patch);
      if (onChanged) onChanged();
    } catch (e) { console.error('Discovery update failed', e); } finally { setBusy(null); }
  };

  const changeRoute = (d, routeKey) => {
    const flags = ROUTE_FLAG_DEFAULTS[routeKey] || {};
    updateDisc(d.id, { routing_status: routeKey, ...flags });
  };

  // P1-15 — route to a canonical SaleClientDecision (one decision, linked, never duplicated).
  const routeToDecision = async (d) => {
    setBusy(d.id);
    try {
      const dec = await base44.entities.SaleClientDecision.create({
        sale_id: sale.id, operator_id: sale.operator_id,
        company_id: sale.company_id || null, sale_team_ids: sale.sale_team || [],
        decision_type: 'merchandise',
        subject: `Discovery: ${d.description}`,
        current_decision: 'review', status: 'open',
        notes: `Found in ${zoneName(d.zone_id)}${d.location_note ? ` — ${d.location_note}` : ''}. Routed from prep discovery.`,
      });
      await base44.entities.SaleDiscovery.update(d.id, {
        linked_decision_id: dec.id, routing_status: 'CLIENT_DECISION', client_notified_status: 'decision_created',
      });
      if (onChanged) onChanged();
    } catch (e) { console.error('Decision route failed', e); } finally { setBusy(null); }
  };

  // P1-28 — client notification: DRAFT communication task only. Nothing auto-sends.
  const notifyClient = async (d) => {
    setBusy(d.id);
    try {
      const task = await base44.entities.SaleTask.create({
        sale_id: sale.id, operator_id: sale.operator_id,
        name: `Notify client: ${d.description}`, category: 'Communication',
        description: `Tell the client about this discovery${d.zone_id ? ` (found in ${zoneName(d.zone_id)})` : ''} and what happens next. Draft only — the operator sends it.`,
        source_type: 'COMMUNICATION', source_id: d.id, source_label: d.description,
      });
      await base44.entities.SaleDiscovery.update(d.id, { client_notified_status: 'task_created', client_notified_task_id: task.id });
      if (onChanged) onChanged();
    } catch (e) { console.error('Notify task failed', e); } finally { setBusy(null); }
  };

  // P1-32 — related-item follow-up through the existing SaleTask system.
  const lookForRelated = async (d) => {
    setBusy(d.id);
    try {
      const task = await base44.entities.SaleTask.create({
        sale_id: sale.id, operator_id: sale.operator_id,
        name: `Look for related items: ${d.description}`, category: 'Preparation',
        description: 'Look for related items, packaging, receipts, manuals, certificates, matching pieces, and documentation.',
        source_type: 'MANUAL', source_id: d.id, source_label: 'Related-item follow-up',
      });
      await updateDisc(d.id, { linked_task_ids: [...(d.linked_task_ids || []), task.id] });
      if (onChanged) onChanged();
    } catch (e) { console.error('Related-items task failed', e); } finally { setBusy(null); }
  };

  const saveCustody = async () => {
    if (!custody) return;
    const { disc, event, note, location } = custody;
    const patch = {
      custody_events: appendCustodyEvent(disc.custody_events, event, note, me?.id, me?.full_name),
    };
    if (event === 'MOVED_TO_CONTROLLED_LOCATION' && location) patch.controlled_location = location;
    setCustody(null);
    await updateDisc(disc.id, patch);
  };

  const saveResolve = async () => {
    if (!resolve) return;
    const { disc, resolution, note } = resolve;
    setBusy(disc.id);
    try {
      // FAMILY KEEP resolves the linked client decision into the retained architecture.
      if (resolution === 'family_keep' && disc.linked_decision_id) {
        const dec = await base44.entities.SaleClientDecision.get(disc.linked_decision_id);
        const history = [...(dec.history || []), {
          decision: 'keep', decided_at: new Date().toISOString(), source: 'operator',
          reason: note || 'Discovery resolved as family keep', recorded_by: me?.id || '', recorded_by_name: me?.full_name || '',
        }];
        await base44.entities.SaleClientDecision.update(dec.id, { current_decision: 'keep', status: 'resolved', resolved_at: new Date().toISOString(), history });
      }
      await base44.entities.SaleDiscovery.update(disc.id, {
        resolution_status: resolution, resolution_note: note || '',
        resolved_by: me?.id || '', resolved_by_name: me?.full_name || '', resolved_at: new Date().toISOString(),
      });
      setResolve(null);
      if (onChanged) onChanged();
    } catch (e) { console.error('Resolve failed', e); } finally { setBusy(null); }
  };

  // P1-4 — explicit promotion: ONE Item, idempotent, discovery preserved.
  const savePromote = async () => {
    if (!promote) return;
    const { disc, price, category } = promote;
    const p = parseFloat(price);
    if (!p || p <= 0) return;
    setBusy(disc.id);
    try {
      if (disc.promoted_to_item_id) { setPromote(null); return; }
      if (disc.is_restricted) { setPromote(null); return; } // P1-32 — restricted material never enters the ordinary sale flow
      const item = await base44.entities.Item.create({
        title: disc.description, description: 'Promoted from a prep discovery.',
        price: p, category: category && category !== 'none' ? category : undefined,
        estate_sale_id: sale.id, seller_id: sale.operator_id, seller_name: sale.operator_name || '',
        operator_id: sale.operator_id, sale_team_ids: sale.sale_team || [],
        status: 'available', sales_channels: ['inventory'],
        research_status: disc.research_needed ? 'RESEARCH_NEEDED' : 'CLEAR',
        research_reason: disc.research_needed ? 'Flagged during prep discovery before pricing.' : undefined,
      });
      await base44.entities.SaleDiscovery.update(disc.id, {
        promoted_to_item_id: item.id, resolution_status: 'promoted_to_item',
        resolved_at: new Date().toISOString(), resolved_by: me?.id || '', resolved_by_name: me?.full_name || '',
        custody_events: appendCustodyEvent(disc.custody_events, 'ADDED_TO_SALE', 'Promoted to formal inventory', me?.id, me?.full_name),
      });
      setPromote(null);
      if (onChanged) onChanged();
    } catch (e) { console.error('Promote failed', e); } finally { setBusy(null); }
  };

  // P1-35 — printable status label matching the digital route.
  const printLabel = (d) => {
    const route = ROUTES.find(r => r.key === d.routing_status) || ROUTES[0];
    const w = window.open('', '', 'width=500,height=650');
    w.document.write(`<html><head><title>Discovery label</title><style>
      body{font-family:Arial,sans-serif;margin:24px;text-align:center}
      h1{font-size:34px;letter-spacing:3px;text-transform:uppercase;border:4px solid #1e293b;padding:18px;margin:0 0 14px}
      p{font-size:15px;color:#334155;margin:6px 0}
    </style></head><body>
      <h1>${route.sign || routeLabel(d.routing_status)}</h1>
      <p><b>${d.description}</b></p>
      <p>${zoneName(d.zone_id)}${d.location_note ? ` — ${d.location_note}` : ''}</p>
      <p>Found ${d.found_at ? new Date(d.found_at).toLocaleDateString() : ''} by ${d.found_by_name || 'team'}</p>
      <p style="font-size:11px;color:#94a3b8">Digital route: ${routeLabel(d.routing_status)}</p>
      <script>window.onload = () => window.print();</script>
    </body></html>`);
    w.document.close();
  };

  const Row = ({ d }) => {
    const isResolved = (d.resolution_status || 'open') !== 'open';
    return (
      <div className={`rounded-lg border p-3 space-y-2 ${isResolved ? 'bg-slate-50 border-slate-200 opacity-80' : 'bg-white border-slate-200'}`}>
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <Badge variant="outline" className={`text-[10px] ${routeBadge(d.routing_status)}`}>{routeLabel(d.routing_status)}</Badge>
          <Badge variant="outline" className="text-[10px] bg-slate-50">{discoveryTypeLabel(d.discovery_type)}</Badge>
          {d.is_sensitive && <Badge className="bg-rose-100 text-rose-700 text-[10px]">SENSITIVE — PRIVATE</Badge>}
          {d.is_restricted && <Badge className="bg-red-100 text-red-700 text-[10px]">RESTRICTED — DO NOT PROCESS</Badge>}
          {d.research_needed && <Badge className="bg-amber-100 text-amber-800 text-[10px]">RESEARCH BEFORE PRICING</Badge>}
          {isResolved && <Badge variant="outline" className="text-[10px] text-emerald-700 border-emerald-300">RESOLVED: {RESOLUTIONS.find(r => r.key === d.resolution_status)?.label || d.resolution_status}</Badge>}
          <span className="flex-1" />
          {busy === d.id && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
        </div>
        <p className="text-sm font-medium text-slate-900">{d.description}</p>
        <p className="text-[11px] text-slate-500">
          {zoneName(d.zone_id)}{d.location_note ? ` — ${d.location_note}` : ''}
          {' · '}found {d.found_at ? new Date(d.found_at).toLocaleDateString() : ''} by {d.found_by_name || 'team'}
          {d.cash_amount != null && ' · cash recorded (private)'}
        </p>
        {d.family_statement && (
          <p className="text-[11px] text-indigo-700 bg-indigo-50 border border-indigo-100 rounded px-2 py-1">
            CLIENT/FAMILY STATEMENT (research lead — unverified): “{d.family_statement}”
          </p>
        )}
        {d.is_restricted && !isResolved && (
          <p className="text-[11px] text-red-700">REVIEW REQUIRED — ordinary sale processing stopped. The system never concludes legality or safety; professional/operator review decides.</p>
        )}
        {(d.custody_events || []).length > 0 && (
          <p className="text-[10px] text-slate-400">
            Custody: {d.custody_events.map(e => `${e.event}${e.at ? ` (${new Date(e.at).toLocaleDateString()})` : ''}`).join(' → ')}
          </p>
        )}

        {!isResolved && (
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <Select value={d.routing_status || 'UNROUTED'} onValueChange={v => changeRoute(d, v)}>
              <SelectTrigger className="h-7 text-[11px] w-40"><SelectValue /></SelectTrigger>
              <SelectContent>{ROUTES.map(r => <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>)}</SelectContent>
            </Select>
            {!d.linked_decision_id && <Button size="sm" variant="outline" className="h-7 text-[11px] px-2" onClick={() => routeToDecision(d)}>Route to Client Decision</Button>}
            {d.routing_status === 'SPECIALIST' && <Link to="/ProfessionalNetwork" className="text-[11px] text-cyan-700 underline">Who Can Help?</Link>}
            <Button size="sm" variant="outline" className="h-7 text-[11px] px-2" onClick={() => notifyClient(d)}>Notify Client</Button>
            <Button size="sm" variant="outline" className="h-7 text-[11px] px-2" onClick={() => lookForRelated(d)}>Look for Related</Button>
            <Button size="sm" variant="outline" className="h-7 text-[11px] px-2" onClick={() => setCustody({ disc: d, event: 'MOVED_TO_CONTROLLED_LOCATION', note: '', location: '' })}>Custody</Button>
            <Button size="sm" variant="outline" className="h-7 text-[11px] px-2" onClick={() => setResolve({ disc: d, resolution: 'other', note: '' })}>Resolve</Button>
            {!d.is_restricted && (
              <Button size="sm" variant="outline" className="h-7 text-[11px] px-2"
                onClick={() => d.promoted_to_item_id ? alert('Already promoted — one Item per discovery; no duplicates.') : setPromote({ disc: d, price: '', category: 'none' })}>
                Promote to Inventory
              </Button>
            )}
            <Button size="sm" variant="ghost" className="h-7 text-[11px] px-2" onClick={() => printLabel(d)}><Printer className="w-3 h-3 mr-1" />Label</Button>
          </div>
        )}
        {d.promoted_to_item_id && <p className="text-[10px] text-emerald-700">Promoted to Item {d.promoted_to_item_id} — the Item owns all sale/price/marketing truth now; this record is history.</p>}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <PackageSearch className="w-5 h-5 text-cyan-700" /> Discoveries
        </CardTitle>
        <p className="text-xs text-slate-500">
          What the prep team found and where it goes next. Discovered ≠ inventoried; sorted ≠ priced. A discovery never becomes an Item automatically.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => setDialogOpen(true)} className="bg-cyan-700 hover:bg-cyan-800">
            <Plus className="w-3.5 h-3.5 mr-1" />Record Discovery
          </Button>
          <Badge variant="outline">{open.length} open</Badge>
          <Badge variant="outline">{resolved.length} resolved</Badge>
        </div>
        {open.length === 0 && resolved.length === 0 && (
          <p className="text-sm text-slate-400 py-2">Nothing recorded yet. When the team finds something, record it here and route it — no guessing.</p>
        )}
        <div className="space-y-2">
          {open.map(d => <Row key={d.id} d={d} />)}
          {resolved.map(d => <Row key={d.id} d={d} />)}
        </div>
      </CardContent>

      <DiscoveryDialog sale={sale} zones={zones} open={dialogOpen} onOpenChange={setDialogOpen} onSaved={onChanged} />

      {promote && (
        <Dialog open onOpenChange={(v) => !v && setPromote(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle className="text-base">Promote to Inventory</DialogTitle></DialogHeader>
            <p className="text-xs text-slate-500">Creates ONE formal Item for “{promote.disc.description.slice(0, 60)}”. The discovery record is preserved as history — never deleted.</p>
            {promote.disc.research_needed && (
              <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                RESEARCH REQUIRED — the Item is created flagged RESEARCH_NEEDED; pricing/publication stays guarded until research resolves or an authorized override records a reason.
              </p>
            )}
            <div className="space-y-2">
              <div>
                <Label className="text-xs">Initial price ($)</Label>
                <Input type="number" min="0" step="0.01" value={promote.price} onChange={e => setPromote(p => ({ ...p, price: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Category (optional)</Label>
                <Select value={promote.category} onValueChange={v => setPromote(p => ({ ...p, category: v }))}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Uncategorized</SelectItem>
                    {['furniture', 'art', 'lighting_lamps', 'kitchen_dining', 'glassware_crystal', 'antiques', 'collectibles', 'tools_hardware', 'books_media', 'other'].map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setPromote(null)}>Cancel</Button>
                <Button size="sm" className="bg-cyan-700 hover:bg-cyan-800" disabled={busy === promote.disc.id || !promote.price} onClick={savePromote}>Create Item</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {resolve && (
        <Dialog open onOpenChange={(v) => !v && setResolve(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle className="text-base">Resolve Discovery</DialogTitle></DialogHeader>
            <p className="text-xs text-slate-500">The discovery record and its custody history remain after resolution.</p>
            <div className="space-y-2">
              <Select value={resolve.resolution} onValueChange={v => setResolve(p => ({ ...p, resolution: v }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{RESOLUTIONS.filter(r => r.key !== 'open').map(r => <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
              <div>
                <Label className="text-xs">How it was resolved</Label>
                <Input value={resolve.note} onChange={e => setResolve(p => ({ ...p, note: e.target.value }))} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setResolve(null)}>Cancel</Button>
                <Button size="sm" className="bg-cyan-700 hover:bg-cyan-800" disabled={busy === resolve.disc.id} onClick={saveResolve}>Resolve</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {custody && (
        <Dialog open onOpenChange={(v) => { if (!v) setCustody(null); }}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle className="text-base">Record Custody Movement</DialogTitle></DialogHeader>
            <p className="text-xs text-slate-500">Append-only — earlier movements are never rewritten.</p>
            <div className="space-y-2">
              <Select value={custody.event} onValueChange={v => setCustody(p => ({ ...p, event: v }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{CUSTODY_EVENTS.map(e => <SelectItem key={e.key} value={e.key}>{e.label}</SelectItem>)}</SelectContent>
              </Select>
              {custody.event === 'MOVED_TO_CONTROLLED_LOCATION' && (
                <div>
                  <Label className="text-xs">Controlled location (PRIVATE — operator/finder only)</Label>
                  <Input value={custody.location} onChange={e => setCustody(p => ({ ...p, location: e.target.value }))} placeholder="e.g. locked office box, operator custody" />
                </div>
              )}
              <div>
                <Label className="text-xs">Note</Label>
                <Input value={custody.note} onChange={e => setCustody(p => ({ ...p, note: e.target.value }))} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setCustody(null)}>Cancel</Button>
                <Button size="sm" className="bg-cyan-700 hover:bg-cyan-800" onClick={() => { saveCustody(); }}>Record</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}