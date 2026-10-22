import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Printer, LifeBuoy, Loader2 } from 'lucide-react';

// Chapter 24 P1 — MANUAL FALLBACK KIT / SALE-DAY CONTINUITY KIT.
// The smallest coherent fallback package, assembled from canonical records and
// existing printable surfaces. This is NOT an offline mode: EstateSalen stays
// an online system; the kit lets a crew keep operating, capturing, and
// reconciling when technology fails. Privacy: only team-safe fields are
// printed — never access codes, seller financial information, private client
// notes, or employee-private data.
const CAPTURE_ROWS = 14;

export default function ManualFallbackKit() {
  const [params] = useState(() => new URLSearchParams(window.location.search));
  const [saleId, setSaleId] = useState(params.get('saleId') || '');
  const [sales, setSales] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadSales(); }, []);
  useEffect(() => { if (saleId) load(); else setData(null); }, [saleId]);

  async function loadSales() {
    try {
      const me = await base44.auth.me();
      const mine = await base44.entities.EstateSale.filter({ operator_id: me.id }, '-created_date', 50);
      setSales(mine.items || mine);
    } catch (e) { console.error(e); }
  }

  async function load() {
    setLoading(true);
    try {
      const s = await base44.entities.EstateSale.get(saleId);
      const itemPage = await base44.entities.Item.filter({ estate_sale_id: saleId }, { limit: 500 });
      const items = itemPage.items || itemPage;
      const staffPage = await base44.entities.SaleStaffAssignment.filter({ sale_id: saleId });
      const staff = staffPage.items || staffPage;
      setData({ sale: s, items, staff });
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  const soldItems = data ? data.items.filter(i => i.status === 'sold') : [];
  const awaitingPickup = soldItems.filter(i => !i.pickup_completed_at);

  return (
    <div className="p-3 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6 print:space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <Badge className="bg-slate-800 text-white"><LifeBuoy className="w-3 h-3 mr-1" />CONTINUITY KIT</Badge>
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-slate-900">Manual Fallback Kit</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Printable sale-day continuity when technology fails. Not an offline mode — offline activity must be reconciled after recovery.</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={saleId} onChange={e => setSaleId(e.target.value)}
            className="border rounded-md px-2 py-1.5 text-sm bg-white">
            <option value="">Choose a sale…</option>
            {sales.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
          {data && <Button size="sm" onClick={() => window.print()}><Printer className="w-4 h-4 mr-1" />Print kit</Button>}
        </div>
      </div>

      {loading && <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>}

      {data && (
        <>
          <Card>
            <CardContent className="p-4 space-y-2">
              <h2 className="font-bold text-slate-900 text-lg">{data.sale.title} — Critical Sale Information</h2>
              <div className="text-sm text-slate-700 space-y-0.5">
                <p><strong>Dates/hours:</strong> {(data.sale.sale_dates || []).map(d => d.date).join(', ') || 'Not scheduled'}</p>
                <p><strong>Location:</strong> {data.sale.property_address?.formatted_address || [data.sale.property_address?.city, data.sale.property_address?.state].filter(Boolean).join(', ') || 'Not set'}</p>
                <p><strong>Payment methods:</strong> {(data.sale.payment_methods || []).join(', ') || 'Not set'}</p>
                <p><strong>Parking:</strong> {data.sale.parking_info || 'Not set'}</p>
                <p><strong>Pickup window:</strong> {data.sale.pickup_plan?.pickup_window || data.sale.pickup_plan?.pickup_location || 'Not set'}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h2 className="font-bold text-slate-900 mb-2">Team Assignments</h2>
              {data.staff.length === 0 ? <p className="text-sm text-slate-500">No staff assignments recorded.</p> : (
                <ul className="text-sm text-slate-700 space-y-1">
                  {data.staff.map(s => (
                    <li key={s.id}><strong>{s.staff_name || s.name || 'Team member'}</strong>{s.role ? ` — ${s.role}` : ''}{s.responsibilities ? `: ${s.responsibilities}` : ''}</li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h2 className="font-bold text-slate-900 mb-2">Paid / Awaiting-Pickup Merchandise ({awaitingPickup.length})</h2>
              {awaitingPickup.length === 0 ? <p className="text-sm text-slate-500">No sold merchandise awaiting pickup.</p> : (
                <ul className="text-sm text-slate-700 space-y-0.5">
                  {awaitingPickup.map(i => (
                    <li key={i.id}>#{i.item_number ?? ''} {i.title} — ${i.sold_price ?? i.price ?? 0}{i.quantity > 1 ? ` (qty ${i.quantity})` : ''}</li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-2">
              <h2 className="font-bold text-slate-900">Checkout Fallback Procedure</h2>
              <ol className="text-sm text-slate-700 list-decimal list-inside space-y-1">
                <li>Write every sale on the Manual Transaction Capture Sheet below — one line per transaction.</li>
                <li>Apply only discounts you are authorized to apply; note who authorized anything unusual.</li>
                <li>Record the payment method exactly as taken (cash, check, card-unknown, other). Never record card numbers, CVV, or codes.</li>
                <li><strong>UNKNOWN ≠ PAID.</strong> If a card or app payment cannot be verified, the merchandise does not leave. A customer's phone screen is not merchant truth — do not release merchandise on an unverified payment unless the operator explicitly authorizes a safe alternate method.</li>
                <li>For merchandise that must stay: place it on hold per normal hold rules and note it on the sheet.</li>
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-2">
              <h2 className="font-bold text-slate-900">Payment-System Fallback Procedure</h2>
              <ol className="text-sm text-slate-700 list-decimal list-inside space-y-1">
                <li>Cash and checks keep working; count cash at open and close exactly as the cash controls require.</li>
                <li>If the card reader or app is down, either take an authorized alternate method or politely hold the merchandise — never release it on an unverified payment.</li>
                <li>After recovery, the operator verifies each card/app payment in the merchant record before the order is marked paid. Offline notes are reconciled, never blindly imported as truth.</li>
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h2 className="font-bold text-slate-900 mb-2">Manual Transaction Capture Sheet</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="border p-1 text-left">Time</th>
                      <th className="border p-1 text-left">Item / merchandise</th>
                      <th className="border p-1 text-left">Price</th>
                      <th className="border p-1 text-left">Discount (who authorized)</th>
                      <th className="border p-1 text-left">Payment method</th>
                      <th className="border p-1 text-left">Buyer / pickup note</th>
                      <th className="border p-1 text-left">Cashier</th>
                      <th className="border p-1 text-left">Ref / notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: CAPTURE_ROWS }).map((_, r) => (
                      <tr key={r}>
                        {Array.from({ length: 8 }).map((_, c) => <td key={c} className="border p-1 h-6">&nbsp;</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Never write full card numbers, CVV, or access codes on this sheet.</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h2 className="font-bold text-slate-900 mb-2">System Failure Checklist</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="border p-1 text-left">Failure</th>
                      <th className="border p-1 text-left">What stops</th>
                      <th className="border p-1 text-left">What continues</th>
                      <th className="border p-1 text-left">Record on paper</th>
                      <th className="border p-1 text-left">Manager authority needed</th>
                      <th className="border p-1 text-left">Reconcile later</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-700">
                    <tr><td className="border p-1 font-semibold">Internet outage</td><td className="border p-1">Online lookups, app sync</td><td className="border p-1">Cash/check sales, printed prices</td><td className="border p-1">Every transaction on the capture sheet</td><td className="border p-1">Unusual discounts; alternate payment acceptance</td><td className="border p-1">Transactions → system; verify each payment</td></tr>
                    <tr><td className="border p-1 font-semibold">Payment device down</td><td className="border p-1">Card/app charges</td><td className="border p-1">Cash/check; holds</td><td className="border p-1">Method + amount + buyer note</td><td className="border p-1">Releasing merchandise without verified payment is operator-only</td><td className="border p-1">Verify in merchant record; UNKNOWN ≠ PAID</td></tr>
                    <tr><td className="border p-1 font-semibold">Phone outage</td><td className="border p-1">Calls, app-based payments</td><td className="border p-1">In-person sales</td><td className="border p-1">Transactions as usual</td><td className="border p-1">None beyond normal</td><td className="border p-1">Transactions → system</td></tr>
                    <tr><td className="border p-1 font-semibold">Printer outage</td><td className="border p-1">Receipts, signs</td><td className="border p-1">All sales</td><td className="border p-1">Hand-written receipts</td><td className="border p-1">None beyond normal</td><td className="border p-1">Reprint receipts after recovery</td></tr>
                    <tr><td className="border p-1 font-semibold">EstateSalen unavailable</td><td className="border p-1">All in-app tools</td><td className="border p-1">Sale floor operation with this kit</td><td className="border p-1">Transactions, holds, releases, issues</td><td className="border p-1">Same authority rules apply on paper</td><td className="border p-1">Full re-entry + cash reconciliation</td></tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h2 className="font-bold text-slate-900 mb-2">Recovery Checklist (after the system is restored)</h2>
              <ol className="text-sm text-slate-700 list-decimal list-inside space-y-1">
                <li>System restored — confirm the app is live before re-entering anything.</li>
                <li>Enter / reconcile offline transactions from the capture sheet.</li>
                <li>Verify payment truth for each card/app transaction in the merchant record (UNKNOWN ≠ PAID; a phone screen is not merchant truth).</li>
                <li>Verify item status and holds match what physically happened.</li>
                <li>Verify pickup / custody — release only against verified payment.</li>
                <li>Reconcile cash against the day's cash controls; record any variance honestly, never zero it.</li>
                <li>Resolve duplicates and exceptions (duplicate entries, missed holds).</li>
                <li>Complete the recovery review — a manager confirms the above are done before the sale day is closed.</li>
              </ol>
            </CardContent>
          </Card>

          <p className="text-[11px] text-slate-400 print:block">
            Printed from canonical sale records. This kit intentionally excludes access codes, seller financial information, private client notes, and employee-private information.
          </p>
        </>
      )}
    </div>
  );
}