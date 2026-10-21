import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save, History, ClipboardList } from 'lucide-react';

// Chapter 7 P1 — canonical AGREED SCOPE: what THIS client hired us to do.
// Catalog (OperatorService) = what we generally offer; this = what this client
// selected. Mid-sale changes go through Client Decisions (SaleClientDecision),
// never by silently rewriting this record: every save snapshots the prior
// version into history.
export default function SaleScopeSection({ saleId }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [catalog, setCatalog] = useState([]);
  const [scope, setScope] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const user = await base44.auth.me();
        const [cat, existing] = await Promise.all([
          base44.entities.OperatorService.filter({ operator_id: user.id, enabled: true }),
          base44.entities.SaleScope.filter({ sale_id: saleId }),
        ]);
        if (cancelled) return;
        cat.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        setCatalog(cat);
        setScope(existing.length ? existing[0] : null);
      } catch (e) {
        if (!cancelled) setScope(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [saleId]);

  // Local editable draft derived from the persisted scope (or catalog defaults).
  const [draft, setDraft] = useState(null);
  useEffect(() => {
    if (scope === null && catalog.length >= 0) {
      setDraft({
        items: catalog.map(s => ({
          operator_service_id: s.id,
          service_type: s.service_type,
          display_name: s.display_name,
          included: false,
          charge_policy: s.additional_charge_possible ? 'additional_when_authorized' : 'included',
          notes: s.scope_notes || '',
        })),
        included_work: '', excluded_work: '', special_commitments: '', client_expectations: '',
        effective_date: '', agreement_reference: '',
      });
    }
  }, [scope === null, catalog.length]); // eslint-disable-line

  useEffect(() => {
    if (scope) {
      setDraft({
        items: scope.scope_items || [],
        included_work: scope.included_work || '',
        excluded_work: scope.excluded_work || '',
        special_commitments: scope.special_commitments || '',
        client_expectations: scope.client_expectations || '',
        effective_date: (scope.effective_date || '').slice(0, 10),
        agreement_reference: scope.agreement_reference || '',
      });
    }
  }, [scope]);

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 flex justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }
  if (!draft) return null;

  const setItem = (serviceId, patch) => {
    setDraft(d => ({ ...d, items: d.items.map(it => it.operator_service_id === serviceId ? { ...it, ...patch } : it) }));
  };
  const setField = (k, v) => setDraft(d => ({ ...d, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const sales = await base44.entities.EstateSale.filter({ id: saleId });
      if (!sales.length) throw new Error('Sale not found');
      const sale = sales[0];
      const user = await base44.auth.me();
      if (scope) {
        const prior = {
          version: scope.version || 1,
          snapshot: {
            scope_items: scope.scope_items || [],
            included_work: scope.included_work || '',
            excluded_work: scope.excluded_work || '',
            special_commitments: scope.special_commitments || '',
            client_expectations: scope.client_expectations || '',
          },
          changed_at: new Date().toISOString(),
          changed_by: user.full_name || user.email,
          reason: 'Scope record updated by operator',
        };
        await base44.entities.SaleScope.update(scope.id, {
          scope_items: draft.items,
          included_work: draft.included_work,
          excluded_work: draft.excluded_work,
          special_commitments: draft.special_commitments,
          client_expectations: draft.client_expectations,
          effective_date: draft.effective_date || undefined,
          agreement_reference: draft.agreement_reference || undefined,
          version: (scope.version || 1) + 1,
          history: [...(scope.history || []), prior],
        });
      } else {
        await base44.entities.SaleScope.create({
          sale_id: saleId,
          operator_id: sale.operator_id,
          company_id: sale.company_id || undefined,
          sale_team_ids: sale.sale_team || [],
          scope_items: draft.items,
          included_work: draft.included_work,
          excluded_work: draft.excluded_work,
          special_commitments: draft.special_commitments,
          client_expectations: draft.client_expectations,
          effective_date: draft.effective_date || undefined,
          agreement_reference: draft.agreement_reference || undefined,
          status: 'ACTIVE',
          version: 1,
          history: [],
        });
      }
      const existing = await base44.entities.SaleScope.filter({ sale_id: saleId });
      setScope(existing.length ? existing[0] : null);
    } catch (e) {
      alert('Could not save scope: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const history = scope?.history || [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-cyan-600" /> Agreed Scope — What This Client Hired Us to Do
        </CardTitle>
        <p className="text-xs text-slate-500">
          Select services from your catalog and record boundaries honestly. Your website shows your general services —
          never this sale-specific scope. Mid-sale requests for work outside this scope are authorized through Client
          Decisions, never by editing this history.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {catalog.length === 0 && draft.items.length === 0 && (
          <p className="text-sm text-slate-500">
            No services in your catalog yet. Add what you offer in the <b>Service Catalog</b> page, then select them here.
          </p>
        )}
        <div className="space-y-2">
          {draft.items.map(it => (
            <div key={it.operator_service_id || it.display_name} className="border rounded-md p-3 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Switch checked={!!it.included} onCheckedChange={v => setItem(it.operator_service_id, { included: v })} />
                  <span className="text-sm font-medium text-slate-800 truncate">{it.display_name}</span>
                  {it.charge_policy === 'additional_when_authorized' && (
                    <Badge className="bg-amber-100 text-amber-800 border-amber-200">Extra when authorized</Badge>
                  )}
                </div>
                <span className="text-xs text-slate-400">{it.included ? 'Included' : 'Not included (boundary)'}</span>
              </div>
              {it.notes && <p className="text-xs text-slate-500 pl-8">{it.notes}</p>}
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <Label>Included work / boundaries</Label>
            <Textarea rows={3} value={draft.included_work} onChange={e => setField('included_work', e.target.value)} placeholder="What We Do for this client." />
          </div>
          <div>
            <Label>Not included (explicit boundaries)</Label>
            <Textarea rows={3} value={draft.excluded_work} onChange={e => setField('excluded_work', e.target.value)} placeholder="What We Do NOT Do for this client." />
          </div>
          <div>
            <Label>Special commitments</Label>
            <Textarea rows={2} value={draft.special_commitments} onChange={e => setField('special_commitments', e.target.value)} placeholder="Specific promises made to this client." />
          </div>
          <div>
            <Label>Client expectations (honest, no guarantees)</Label>
            <Textarea rows={2} value={draft.client_expectations} onChange={e => setField('client_expectations', e.target.value)} placeholder="An estimate is not a guarantee — record it that way." />
          </div>
          <div>
            <Label>Effective date</Label>
            <Input type="date" value={draft.effective_date} onChange={e => setField('effective_date', e.target.value)} />
          </div>
          <div>
            <Label>Agreement / contract reference</Label>
            <Input value={draft.agreement_reference} onChange={e => setField('agreement_reference', e.target.value)} placeholder="Supports, never replaces, the signed agreement." />
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Scope
          </Button>
          {scope && <Badge variant="outline">v{scope.version || 1} · {scope.status}</Badge>}
          {history.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setShowHistory(h => !h)}>
              <History className="w-3.5 h-3.5" /> History ({history.length})
            </Button>
          )}
        </div>

        {showHistory && (
          <div className="border rounded-md p-3 space-y-3 bg-slate-50">
            {history.map(h => (
              <div key={h.version + h.changed_at} className="text-xs space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">v{h.version}</Badge>
                  <span className="text-slate-500">{new Date(h.changed_at).toLocaleString()} · {h.changed_by} · {h.reason}</span>
                </div>
                <p className="text-slate-600">
                  {(h.snapshot?.scope_items || []).map(i => `${i.display_name}: ${i.included ? 'included' : 'not included'}`).join(' · ') || 'No services recorded'}
                </p>
                {h.snapshot?.excluded_work && <p className="text-slate-500">Excluded: {h.snapshot.excluded_work}</p>}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}