import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, QrCode, Printer, Loader2 } from 'lucide-react';
import { asList } from '@/components/equipment/equipmentModel';

// Chapter 8 P1 — ITEM QR LABEL GENERATOR. Closes the loop the scanners already
// support: the QR payload is the SAME format Scan & Cart / signs already use
// (<origin>/ItemDetail?itemId=<id>). Labels encode ONLY the stable public item
// id — no seller info, research flags, display attention, security or cost.
export default function ItemLabels() {
  const navigate = useNavigate();
  const [sale, setSale] = useState(null);
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState({});
  const [includePrice, setIncludePrice] = useState(true);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const saleId = params.get('saleId');
      if (!saleId) { navigate(createPageUrl('MySales')); return; }
      const saleData = asList(await base44.entities.EstateSale.filter({ id: saleId }));
      if (saleData.length === 0) { navigate(createPageUrl('MySales')); return; }
      setSale(saleData[0]);
      const itemData = asList(await base44.entities.Item.filter({ estate_sale_id: saleId }));
      setItems(itemData);
      setSelected(Object.fromEntries(itemData.map(i => [i.id, true])));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const printSheet = async () => {
    const chosen = items.filter(i => selected[i.id]);
    if (chosen.length === 0) return;
    setGenerating(true);
    try {
      const labels = [];
      for (const item of chosen) {
        const url = `${window.location.origin}/ItemDetail?itemId=${item.id}`;
        const qr = await QRCode.toDataURL(url, { width: 240, margin: 1 });
        labels.push({ title: item.title, price: item.price, qr });
      }
      const labelsHtml = labels.map(l => `
        <div class="label">
          <div class="qr"><img src="${l.qr}" /></div>
          <div class="meta">
            <div class="title">${escapeHtml(l.title || 'Item')}</div>
            ${includePrice && l.price != null ? `<div class="price">$${Number(l.price).toFixed(2)}</div>` : ''}
            <div class="scan">Scan for details &amp; cart</div>
          </div>
        </div>`).join('');
      const html = `<!DOCTYPE html><html><head><title>Item Labels — ${escapeHtml(sale.title || 'Sale')}</title><style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; padding: 8mm; }
        .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6mm; }
        .label { border: 1px dashed #999; border-radius: 4px; padding: 4mm; display: flex; gap: 4mm; align-items: center; page-break-inside: avoid; }
        .qr img { width: 30mm; height: 30mm; display: block; }
        .meta { min-width: 0; }
        .title { font-size: 12px; font-weight: bold; line-height: 1.2; word-break: break-word; }
        .price { font-size: 16px; font-weight: bold; margin-top: 2mm; }
        .scan { font-size: 8px; color: #777; margin-top: 2mm; }
        @media print { .label { border-color: #bbb; } }
      </style></head><body><div class="grid">${labelsHtml}</div></body></html>`;
      const w = window.open('', '_blank');
      if (w) {
        w.document.write(html);
        w.document.close();
      } else {
        // Popup blocked — print from an in-page sheet.
        const el = document.createElement('div');
        el.innerHTML = html;
        document.body.appendChild(el);
        window.print();
        document.body.removeChild(el);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  const escapeHtml = (s) => String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  if (loading) {
    return <div className="p-8 animate-pulse"><div className="h-8 bg-slate-200 rounded w-1/4 mb-4"></div><div className="h-64 bg-slate-200 rounded"></div></div>;
  }
  if (!sale) return <div className="p-8 text-slate-500">Sale not found.</div>;

  const selectedCount = Object.values(selected).filter(Boolean).length;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <Button variant="ghost" onClick={() => navigate(createPageUrl('MySales'))} className="text-slate-600 hover:text-slate-900 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" />Back to Sales
          </Button>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 break-words">{sale.title}</h1>
          <p className="text-slate-600">Item QR labels — printable label sheet</p>
        </div>
        <div className="flex flex-col items-stretch sm:items-end gap-2">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <Checkbox checked={includePrice} onCheckedChange={v => setIncludePrice(!!v)} />Include price on labels
          </label>
          <Button onClick={printSheet} disabled={generating || selectedCount === 0} className="bg-orange-600 hover:bg-orange-700">
            {generating ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Preparing...</> : <><Printer className="w-4 h-4 mr-1" />Print {selectedCount} label(s)</>}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 space-y-2">
          <p className="text-xs text-slate-500">
            Each label encodes only the item's public page link (the same format the Scan &amp; Cart scanner reads). No seller information, research flags, display attention, security notes, or costs are encoded.
          </p>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <Checkbox
              checked={selectedCount === items.length && items.length > 0}
              onCheckedChange={v => setSelected(Object.fromEntries(items.map(i => [i.id, !!v])))}
            />Select all ({items.length})
          </label>
        </CardContent>
      </Card>

      {items.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-slate-500">No items on this sale yet.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <label key={item.id} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg">
              <Checkbox checked={!!selected[item.id]} onCheckedChange={v => setSelected(s => ({ ...s, [item.id]: !!v }))} />
              <QrCode className="w-4 h-4 text-slate-400" />
              <span className="flex-1 min-w-0 text-sm font-medium text-slate-900 break-words">{item.title}</span>
              {item.price != null && <Badge variant="outline">${Number(item.price).toFixed(2)}</Badge>}
              <Badge className={item.status === 'sold' ? 'bg-slate-200 text-slate-600' : 'bg-green-100 text-green-700'}>{item.status}</Badge>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}