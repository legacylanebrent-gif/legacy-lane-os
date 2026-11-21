import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ImageOff, CheckCircle2, AlertTriangle } from 'lucide-react';

const keyOf = (photo) => photo?.pipeline?.id || photo?.url || '';
const photoTitle = (photo) => photo?.name || photo?.description || 'Untitled photo';

/**
 * Adds items to My Inventory straight from a past sale's photos.
 * The server owns the work (dedupe, pricing, draft marketplace listing);
 * this dialog only picks which photos to promote.
 */
export default function AddFromSaleModal({ open, onClose, onCreated }) {
  const [sales, setSales] = useState([]);
  const [saleId, setSaleId] = useState('');
  const [sale, setSale] = useState(null);
  const [selected, setSelected] = useState(() => new Set());
  const [search, setSearch] = useState('');
  const [loadingSales, setLoadingSales] = useState(false);
  const [loadingSale, setLoadingSale] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!open) return;
    setResult(null);
    setLoadingSales(true);
    (async () => {
      try {
        const me = await base44.auth.me();
        const page = await base44.entities.EstateSale.filter(
          { operator_id: me.id },
          { sort: '-created_date', limit: 20 }
        );
        const list = Array.isArray(page) ? page : (page.items || []);
        setSales(list);
        if (list.length && !saleId) setSaleId(list[0].id);
      } finally {
        setLoadingSales(false);
      }
    })();
  }, [open]);

  useEffect(() => {
    if (!open || !saleId) return;
    setSelected(new Set());
    setResult(null);
    setLoadingSale(true);
    (async () => {
      try {
        const record = await base44.entities.EstateSale.get(saleId);
        setSale(record);
      } finally {
        setLoadingSale(false);
      }
    })();
  }, [open, saleId]);

  const photos = useMemo(() => {
    const all = Array.isArray(sale?.images) ? sale.images : [];
    const usable = all.filter(p => !p?.excluded_from_public && keyOf(p));
    if (!search.trim()) return usable;
    const q = search.toLowerCase();
    return usable.filter(p => photoTitle(p).toLowerCase().includes(q));
  }, [sale, search]);

  const selectedKeys = photos.filter(p => selected.has(keyOf(p))).map(keyOf);
  const allSelected = photos.length > 0 && selectedKeys.length === photos.length;

  const toggle = (photo, on) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (on) next.add(keyOf(photo));
      else next.delete(keyOf(photo));
      return next;
    });
  };

  const addItems = async () => {
    if (!saleId || selectedKeys.length === 0) return;
    setSaving(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke('createItemsFromPhotos', {
        sale_id: saleId,
        photo_ids: selectedKeys,
      });
      const data = res.data || {};
      const parts = [`${data.created_count || 0} item${data.created_count === 1 ? '' : 's'} added`];
      if (data.skipped_count) parts.push(`${data.skipped_count} skipped`);
      if (data.failed_count) parts.push(`${data.failed_count} failed`);
      const needsPrice = (data.created || []).filter(i => i.needs_price).length;
      if (needsPrice) parts.push(`${needsPrice} need a price`);
      setResult({ tone: data.failed_count ? 'warn' : 'ok', message: parts.join(' · ') });
      setSelected(new Set());
      onCreated?.();
    } catch (error) {
      const raw = error?.response?.data?.error;
      setResult({
        tone: 'error',
        message: (typeof raw === 'string' ? raw : raw?.message) || 'Could not add those items.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add items from a past sale</DialogTitle>
        </DialogHeader>

        {loadingSales ? (
          <div className="py-10 flex items-center justify-center text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading your sales…
          </div>
        ) : sales.length === 0 ? (
          <p className="py-8 text-center text-slate-500">
            You have no sales yet. Photos become inventory items once a sale has photos.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <Select value={saleId} onValueChange={setSaleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a sale" />
                </SelectTrigger>
                <SelectContent>
                  {sales.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.title || 'Untitled sale'}
                      {s.property_address?.city ? ` — ${s.property_address.city}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Search photos by name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {loadingSale ? (
              <div className="py-10 flex items-center justify-center text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading photos…
              </div>
            ) : photos.length === 0 ? (
              <div className="py-10 text-center text-slate-500">
                <ImageOff className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                No photos on this sale yet.
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 font-medium text-slate-700">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={(v) => setSelected(v ? new Set(photos.map(keyOf)) : new Set())}
                    />
                    Select all ({photos.length})
                  </label>
                  <span className="text-slate-500">{selectedKeys.length} selected</span>
                </div>

                <div className="grid sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto pr-1">
                  {photos.map((photo) => {
                    const key = keyOf(photo);
                    const checked = selected.has(key);
                    return (
                      <label
                        key={key}
                        className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors ${
                          checked ? 'border-cyan-400 bg-cyan-50' : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <Checkbox checked={checked} onCheckedChange={(v) => toggle(photo, v)} />
                        <div className="w-12 h-12 rounded bg-slate-100 overflow-hidden flex-shrink-0">
                          {photo.thumbnail_url || photo.url ? (
                            <img
                              src={photo.thumbnail_url || photo.url}
                              alt={photoTitle(photo)}
                              className="w-full h-full object-cover"
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-900 truncate">{photoTitle(photo)}</p>
                          <p className="text-xs text-slate-500">
                            {photo.price ? `$${Number(photo.price).toLocaleString()}` : 'Needs price'}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </>
            )}

            {result && (
              <div
                className={`rounded-lg px-3 py-2 text-sm flex items-start gap-2 ${
                  result.tone === 'ok'
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : result.tone === 'warn'
                      ? 'bg-amber-50 text-amber-800 border border-amber-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {result.tone === 'ok' ? (
                  <CheckCircle2 className="w-4 h-4 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 mt-0.5" />
                )}
                <span>{result.message}</span>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>Close</Button>
              <Button
                onClick={addItems}
                disabled={saving || selectedKeys.length === 0}
                className="bg-cyan-600 hover:bg-cyan-700"
              >
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Add {selectedKeys.length || ''} to inventory
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}