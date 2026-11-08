import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, ListPlus, Check } from 'lucide-react';
import { buildIsoList, searchBrands } from './isoApi';

const STARTERS = [
  { category: 'furniture', item_type: 'chair', title: 'Chairs' },
  { category: 'furniture', item_type: 'table', title: 'Tables' },
  { category: 'art', item_type: 'painting', title: 'Original paintings' },
  { category: 'jewelry', item_type: 'jewelry', title: 'Jewelry' },
  { category: 'glass', item_type: 'art glass', title: 'Art glass' },
  { category: 'ceramics', item_type: 'pottery', title: 'Pottery & ceramics' },
  { category: 'lighting', item_type: 'lamp', title: 'Lamps & lighting' },
  { category: 'silver', item_type: 'silver', title: 'Sterling silver' },
  { category: 'textiles', item_type: 'rug', title: 'Rugs & textiles' },
  { category: 'collectibles', item_type: 'collectible', title: 'Collectibles' },
  { category: 'tools', item_type: 'tools', title: 'Tools' },
  { category: 'kitchenware', item_type: 'kitchenware', title: 'Kitchenware' },
];

/**
 * Collector / reseller list intake: shared starting preferences plus individually
 * managed interests. One intake record, one WantedItem per saved interest.
 */
export default function IsoListBuilder({ open, onClose, onSaved }) {
  const [role, setRole] = useState('both');
  const [listName, setListName] = useState('');
  const [picked, setPicked] = useState([]);
  const [brandQuery, setBrandQuery] = useState('');
  const [brandResults, setBrandResults] = useState([]);
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [exclusions, setExclusions] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
  }, [open]);

  useEffect(() => {
    if (!open || !brandQuery.trim()) { setBrandResults([]); return; }
    let alive = true;
    const timer = setTimeout(() => {
      searchBrands(brandQuery).then(res => alive && setBrandResults(res.brands || [])).catch(() => {});
    }, 300);
    return () => { alive = false; clearTimeout(timer); };
  }, [brandQuery, open]);

  const keyOf = (s) => [s.brand || '', s.category || '', s.item_type || '', s.title || ''].join('|').toLowerCase();
  const selectedKeys = useMemo(() => new Set(picked.map(keyOf)), [picked]);

  const toggle = (selection) => {
    const key = keyOf(selection);
    setPicked(prev => prev.some(p => keyOf(p) === key) ? prev.filter(p => keyOf(p) !== key) : [...prev, selection]);
  };

  const save = async () => {
    if (!picked.length) { setError('Pick at least one category or brand.'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await buildIsoList({
        intake: {
          list_name: listName || 'My collector list',
          role,
          budget_min: budgetMin ? Number(budgetMin) : null,
          budget_max: budgetMax ? Number(budgetMax) : null,
          state,
          zip_code: zip,
          exclusions: exclusions.split(',').map(v => v.trim()).filter(Boolean),
        },
        selections: picked,
      });
      if (res.error) { setError(res.error); setSaving(false); return; }
      setPicked([]);
      setListName('');
      if (onSaved) onSaved(res);
    } catch (err) {
      setError(err.message || 'We could not save that list.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-serif flex items-center gap-2">
            <ListPlus className="w-5 h-5 text-cyan-700" /> Build my collector list
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">I buy as a…</Label>
            <div className="grid grid-cols-3 gap-1.5 mt-1">
              {[
                { key: 'collector', label: 'Collector' },
                { key: 'reseller', label: 'Reseller' },
                { key: 'both', label: 'Both' },
              ].map(r => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setRole(r.key)}
                  className={`rounded-lg border-2 py-1.5 text-xs font-medium ${role === r.key ? 'border-cyan-500 bg-cyan-50 text-cyan-900' : 'border-slate-200 text-slate-700'}`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="iso-list-name" className="text-xs">List name (optional)</Label>
            <Input id="iso-list-name" value={listName} onChange={e => setListName(e.target.value)} placeholder="My buying list" />
          </div>

          <div>
            <Label className="text-xs">Categories</Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {STARTERS.map(s => {
                const active = selectedKeys.has(keyOf(s));
                return (
                  <button
                    key={s.title}
                    type="button"
                    onClick={() => toggle(s)}
                    className={`px-2 py-1 rounded-full text-xs border inline-flex items-center gap-1 ${active ? 'bg-cyan-700 text-white border-cyan-700' : 'border-slate-300 text-slate-700'}`}
                  >
                    {active && <Check className="w-3 h-3" />} {s.title}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label htmlFor="iso-brand" className="text-xs">Brands</Label>
            <Input id="iso-brand" value={brandQuery} onChange={e => setBrandQuery(e.target.value)} placeholder="Search brands (e.g. Wedgwood, Herman Miller)" />
            {brandResults.length > 0 && (
              <div className="mt-1 border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-40 overflow-y-auto">
                {brandResults.map(b => {
                  const selection = { brand: b.name, title: b.name };
                  const active = selectedKeys.has(keyOf(selection));
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => toggle(selection)}
                      className={`w-full text-left px-2 py-1.5 text-xs hover:bg-slate-50 flex items-center justify-between ${active ? 'text-cyan-800 font-medium' : 'text-slate-700'}`}
                    >
                      {b.name}
                      {active && <Check className="w-3 h-3" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {picked.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {picked.map(p => (
                <Badge key={keyOf(p)} variant="outline" className="text-xs">
                  {[p.brand, p.item_type, p.category].filter(Boolean).join(' · ') || p.title}
                </Badge>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="iso-list-min" className="text-xs">Budget from ($)</Label>
              <Input id="iso-list-min" type="number" value={budgetMin} onChange={e => setBudgetMin(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="iso-list-max" className="text-xs">Budget up to ($)</Label>
              <Input id="iso-list-max" type="number" value={budgetMax} onChange={e => setBudgetMax(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <Label htmlFor="iso-list-zip" className="text-xs">ZIP code</Label>
              <Input id="iso-list-zip" value={zip} onChange={e => setZip(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="iso-list-state" className="text-xs">State</Label>
              <Input id="iso-list-state" value={state} onChange={e => setState(e.target.value.toUpperCase().slice(0, 2))} />
            </div>
          </div>

          <div>
            <Label htmlFor="iso-list-exclusions" className="text-xs">Leave out (comma separated)</Label>
            <Input id="iso-list-exclusions" value={exclusions} onChange={e => setExclusions(e.target.value)} placeholder="reproductions, damaged" />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button onClick={save} disabled={saving} className="w-full bg-cyan-700 hover:bg-cyan-800 gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ListPlus className="w-4 h-4" />}
            Save {picked.length > 0 ? `${picked.length} interest${picked.length === 1 ? '' : 's'}` : 'my list'}
          </Button>
          <p className="text-[11px] text-slate-500 text-center">
            Each interest is its own search you can pause, edit or remove later.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}