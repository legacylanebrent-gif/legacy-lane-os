// Chapter 17 P1-19..P1-31 — SALE-FLOOR SIGNS: data-driven printable generators
// (item-tied SOLD signs, discount-stage signs, pickup signs, custom category
// signs, buyer-guide QR). DOCTRINE: a printed sign is a SNAPSHOT — printing
// never creates sold state, never changes prices, never grants pickup
// authorization; canonical Item/Order/pickup records remain the only truth.
import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Printer, QrCode, Ban, PackageOpen, Tag } from 'lucide-react';
import { liveItemStatus } from '@/components/staging/stagingModel';

const esc = (s) => String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const openPrint = (title, bodyHtml) => {
  const w = window.open('', '', 'width=850,height=1100');
  if (!w) return false;
  w.document.write(`<html><head><title>${esc(title)}</title><style>
    body{font-family:Arial,sans-serif;margin:0;padding:24px}
    .sheet{display:flex;flex-wrap:wrap;gap:12px;justify-content:center}
    .sign{border:3px solid #111;border-radius:10px;padding:22px;text-align:center;page-break-inside:avoid;break-inside:avoid;flex:0 0 300px}
    .sign h1{font-size:44px;letter-spacing:3px;margin:0 0 8px}
    .sign .sub{font-size:18px;font-weight:bold;margin:4px 0}
    .sign .meta{font-size:13px;color:#333;margin:4px 0}
    .sign .qr{width:150px;height:150px;margin:10px auto;display:block}
    .foot{font-size:9px;color:#999;margin-top:8px}
  </style></head><body>${bodyHtml}
  <script>window.onload=()=>window.print();</script></body></html>`);
  w.document.close();
  return true;
};

export default function SaleFloorSigns({ sale, items = [] }) {
  const [soldQrs, setSoldQrs] = useState({});
  const [guideQr, setGuideQr] = useState(null);
  const [catLabel, setCatLabel] = useState('');
  const [catPrice, setCatPrice] = useState('');

  // Sold/awaiting-pickup merchandise still in the house must look SOLD.
  const soldItems = items.filter(i => ['SOLD', 'AWAITING PICKUP'].includes(liveItemStatus(i)));

  useEffect(() => {
    const gen = async () => {
      const out = {};
      for (const it of soldItems.slice(0, 60)) {
        try {
          out[it.id] = await QRCode.toDataURL(`${window.location.origin}/ItemDetail?itemId=${it.id}`, { width: 160, margin: 1 });
        } catch (e) { out[it.id] = null; }
      }
      setSoldQrs(out);
    };
    gen();
  }, [soldItems.map(i => i.id).join(',')]);

  useEffect(() => {
    QRCode.toDataURL(`${window.location.origin}/SaleGuide?id=${sale.id}`, { width: 200, margin: 1 })
      .then(setGuideQr).catch(() => setGuideQr(null));
  }, [sale.id]);

  // P1-19/P1-20 — item-tied SOLD signs. Identifies the merchandise by item
  // number + title; NO buyer PII. Printing never creates sold state.
  const printSoldSigns = () => {
    const cards = soldItems.map(it => {
      const num = it.item_number != null ? `#${String(it.item_number).padStart(4, '0')}` : '';
      const awaiting = liveItemStatus(it) === 'AWAITING PICKUP';
      return `<div class="sign">
        <h1>SOLD</h1>
        ${awaiting ? '<div class="sub">Sold — awaiting pickup (do not remove)</div>' : '<div class="sub">Sold</div>'}
        <div class="sub">${num} ${esc(it.title)}</div>
        ${soldQrs[it.id] ? `<img class="qr" src="${soldQrs[it.id]}" alt="QR" />` : ''}
        <div class="foot">Scan for current status. This sign reflects digital status at print time; the sale record is the source of truth.</div>
      </div>`;
    }).join('');
    openPrint(`Sold Signs — ${sale.title}`, `<div class="sheet">${cards}</div>`);
  };

  // P1-24/P1-25 — discount signs generated from the ACTUAL Chapter 16
  // discount_schedule. Snapshot only — never modifies Item.price.
  const discountStages = (sale.discount_schedule || []).filter(s => s && Number(s.discount_percent) > 0);
  const excludedCount = items.filter(i => i.excluded_from_discounts).length;
  const printDiscountSigns = () => {
    if (!discountStages.length) return;
    const cards = discountStages.map(s => `<div class="sign">
      <h1>${Number(s.discount_percent)}% OFF</h1>
      <div class="sub">${esc(s.name || 'Discount stage')}</div>
      ${s.start_at ? `<div class="meta">Begins ${esc(new Date(s.start_at).toLocaleString())}</div>` : ''}
      ${s.note ? `<div class="meta">${esc(s.note)}</div>` : ''}
      ${excludedCount > 0 ? `<div class="meta" style="font-weight:bold">Some items are excluded from discounts — see item labels / ask staff.</div>` : ''}
      <div class="foot">Prices are adjusted by staff at checkout. This sign is a snapshot of the sale's discount plan; item prices remain set by the operator.</div>
    </div>`).join('');
    openPrint(`Discount Signs — ${sale.title}`, `<div class="sheet">${cards}</div>`);
  };

  // P1-26 — pickup signs from SAFE canonical pickup rules only. Printing never
  // authorizes anything.
  const printPickupSigns = () => {
    const plan = sale.pickup_plan || {};
    const scheduledItems = items.filter(i => i.pickup_requirements?.scheduled_required);
    const cards = [];
    if (scheduledItems.length) {
      cards.push(`<div class="sign"><h1>PICKUP</h1><div class="sub">Scheduled pickup required for large items</div><div class="meta">Please see staff at checkout to arrange pickup before removing large or heavy purchases.</div></div>`);
    }
    if (plan.pickup_window || plan.pickup_location) {
      cards.push(`<div class="sign"><h1>PICKUP</h1>
        ${plan.pickup_window ? `<div class="sub">${esc(plan.pickup_window)}</div>` : ''}
        ${plan.pickup_location ? `<div class="meta">Location: ${esc(plan.pickup_location)}</div>` : ''}
        ${plan.instructions ? `<div class="meta">${esc(plan.instructions)}</div>` : ''}
        <div class="foot">This sign describes the sale's pickup procedure. It does not by itself authorize removal of any item.</div></div>`);
    }
    if (!cards.length) return;
    openPrint(`Pickup Signs — ${sale.title}`, `<div class="sheet">${cards.join('')}</div>`);
  };

  // P1-23 — custom category pricing sign for grouped/ordinary merchandise
  // (no Item record required for every low-value object).
  const printCategorySign = () => {
    if (!catLabel.trim() || !catPrice) return;
    openPrint(`Category Sign — ${catLabel}`, `<div class="sheet"><div class="sign">
      <h1>${esc(catLabel.trim().toUpperCase())}</h1>
      <div class="sub" style="font-size:40px">$${esc(catPrice)}</div>
    </div></div>`);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Ban className="w-4 h-4 text-red-600" /> Sold Signs (item-tied)</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-slate-500">
            Prints a SOLD sign for every sold item still awaiting pickup or release — item number, title and QR identify the merchandise. No buyer information. Printing a sign does NOT create sold status; the sale record is the truth.
          </p>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{soldItems.length} sold item{soldItems.length === 1 ? '' : 's'}</Badge>
            <Button size="sm" onClick={printSoldSigns} disabled={soldItems.length === 0} className="bg-orange-600 hover:bg-orange-700 text-xs h-8">
              <Printer className="w-3 h-3 mr-1" />Print sold signs
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Tag className="w-4 h-4 text-emerald-600" /> Discount & Category Signs</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{discountStages.length} configured discount stage{discountStages.length === 1 ? '' : 's'}</Badge>
            {excludedCount > 0 && <Badge variant="outline" className="text-amber-700 border-amber-300">{excludedCount} excluded item{excludedCount === 1 ? '' : 's'}</Badge>}
            <Button size="sm" onClick={printDiscountSigns} disabled={discountStages.length === 0} className="bg-orange-600 hover:bg-orange-700 text-xs h-8">
              <Printer className="w-3 h-3 mr-1" />Print discount signs
            </Button>
          </div>
          <p className="text-xs text-slate-500">Generated from the sale's actual discount plan (Chapter 16). A printed sign is a snapshot — it never changes any item price, and excluded items are never discounted by printing.</p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
            <label className="flex-1"><span className="text-[10px] uppercase tracking-wide text-slate-500">Category sign (grouped merchandise — no item record needed)</span>
              <Input value={catLabel} onChange={e => setCatLabel(e.target.value)} placeholder="e.g. ALL BOOKS" className="mt-1 text-xs h-8" /></label>
            <label className="w-full sm:w-32"><span className="text-[10px] uppercase tracking-wide text-slate-500">Price</span>
              <Input value={catPrice} onChange={e => setCatPrice(e.target.value)} placeholder="$2 / $5 each" className="mt-1 text-xs h-8" /></label>
            <Button size="sm" variant="outline" className="text-xs h-8" onClick={printCategorySign} disabled={!catLabel.trim() || !catPrice}>
              <Printer className="w-3 h-3 mr-1" />Print
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><PackageOpen className="w-4 h-4 text-cyan-700" /> Pickup Signs</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-slate-500">
            Prints the sale's safe pickup rules (scheduled-pickup-required items, configured window/location/instructions). A printed pickup sign never authorizes removal — authorization lives in the pickup record.
          </p>
          <Button size="sm" onClick={printPickupSigns}
            disabled={!((sale.pickup_plan || {}).pickup_window || (sale.pickup_plan || {}).pickup_location || items.some(i => i.pickup_requirements?.scheduled_required))}
            className="bg-orange-600 hover:bg-orange-700 text-xs h-8">
            <Printer className="w-3 h-3 mr-1" />Print pickup signs
          </Button>
        </CardContent>
      </Card>

      {/* P1-31 — QR to the safe public buyer guide */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><QrCode className="w-4 h-4 text-purple-600" /> Buyer Guide QR</CardTitle></CardHeader>
        <CardContent className="flex flex-col sm:flex-row items-center gap-4">
          {guideQr ? <img src={guideQr} alt="Buyer guide QR" className="w-32 h-32 border border-slate-200 rounded-lg p-1" /> : null}
          <div className="text-xs text-slate-500">
            <p className="font-medium text-slate-700">How This Sale Works — public buyer guide.</p>
            <p>Print this QR for the entrance: it opens the sale's public guide (entry, shopping areas, checkout, discounts, sold items, furniture pickup, policies) from current sale truth. No private operator data is included.</p>
            <p className="mt-1">Guide link: {`${window.location.origin}/SaleGuide?id=${sale.id}`}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}