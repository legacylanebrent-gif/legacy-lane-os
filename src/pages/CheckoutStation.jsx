import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { QrCode, CreditCard, AlertCircle, Check, Trash2, RefreshCw } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import SaleReceipt from '@/components/checkout/SaleReceipt';
import AskForHelpDialog from '@/components/staffing/AskForHelpDialog';
import { currentDiscountStage } from '@/components/livesale/liveSaleModel';

export default function CheckoutStation() {
  const [staff, setStaff] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [currentCart, setCurrentCart] = useState(null);
  const [cartUser, setCartUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const scannerRef = useRef(null);
  const [qrScanner, setQrScanner] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [completing, setCompleting] = useState(false);
  const [processingOnline, setProcessingOnline] = useState(false);
  const [lastReceipt, setLastReceipt] = useState(null);
  const [guidance, setGuidance] = useState(null);
  const [liveSale, setLiveSale] = useState(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [unresolved, setUnresolved] = useState(null);
  const [resolveNote, setResolveNote] = useState('');
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    loadStaff();
  }, []);

  const loadStaff = async () => {
    try {
      const userData = await base44.auth.me();
      if (!userData) {
        setMessage({ type: 'error', text: 'Staff must be logged in' });
        setLoading(false);
        return;
      }
      setStaff(userData);
    } catch (error) {
      console.error('Error loading staff:', error);
      setMessage({ type: 'error', text: 'Failed to load' });
    } finally {
      setLoading(false);
    }
  };

  const startScanning = () => {
    setScanning(true);
    setTimeout(() => {
      if (scannerRef.current) {
        const scanner = new Html5QrcodeScanner(
          'qr-scanner-container',
          { fps: 10, qrbox: 250 },
          false
        );

        const onScanSuccess = async (decodedText) => {
          try {
            // Parse cart code — expects userId or special format like cart:<userId>
            let userId = decodedText;
            if (decodedText.startsWith('cart:')) {
              userId = decodedText.replace('cart:', '');
            } else if (decodedText.includes('userId=')) {
              const url = new URL(decodedText, window.location.origin);
              userId = url.searchParams.get('userId');
            }

            if (!userId) throw new Error('Invalid cart QR code');

            // Fetch user's cart
            const carts = await base44.entities.Cart.filter({ user_id: userId });
            if (carts.length === 0) throw new Error('No cart found for this customer');

            const cartData = carts[0];

            // Fetch user details
            const users = await base44.entities.User.filter({ id: userId });
            const user = users.length > 0 ? users[0] : null;

            setCurrentCart(cartData);
            setCartUser(user);
            stopScanning();
            loadGuidance(cartData);

            setMessage({ type: 'success', text: `Cart loaded for ${user?.full_name || 'Customer'}` });
            setTimeout(() => setMessage(null), 2000);
          } catch (error) {
            console.error('Scan error:', error);
            setMessage({ type: 'error', text: error.message });
          }
        };

        scanner.render(onScanSuccess, () => {});
        setQrScanner(scanner);
      }
    }, 100);
  };

  const stopScanning = () => {
    if (qrScanner) {
      qrScanner.clear();
      setQrScanner(null);
    }
    setScanning(false);
  };

  // Chapter 20 P1-25..P1-27 — cashier discount GUIDANCE assembled from the
  // canonical sale record (schedule + per-item exclusions + authority policy).
  // GUIDANCE ONLY: the system never applies a discount; a human makes any
  // authorized price change through the normal price-change path.
  const loadGuidance = async (cartData) => {
    setGuidance(null);
    setLiveSale(null);
    try {
      const ids = [...new Set(cartData.items.map((ci) => ci.item_id))];
      const fresh = await Promise.all(ids.map((id) => base44.entities.Item.get(id).catch(() => null)));
      const excluded = fresh.filter((i) => i && i.excluded_from_discounts).map((i) => i.title);
      const first = fresh.find((i) => i && i.estate_sale_id);
      if (!first) { setGuidance({ excluded, stage: null, policyNote: '' }); return; }
      const sales = await base44.entities.EstateSale.filter({ id: first.estate_sale_id });
      const sale = sales[0] || null;
      if (!sale) { setGuidance({ excluded, stage: null, policyNote: '' }); return; }
      let policyNote = '';
      try {
        const companies = await base44.entities.Company.filter({ primary_contact_user_id: sale.operator_id });
        const np = companies[0] && companies[0].negotiation_policy;
        if (np && np.policy === 'NO_NEGOTIATION') policyNote = 'Company policy: no negotiation';
        else if (np && np.policy === 'OPERATOR_ONLY') policyNote = 'Company policy: operator-only pricing';
        else if (np && np.policy === 'MANAGER_APPROVAL_THRESHOLD') policyNote = 'Company policy: manager approval above the threshold';
        else if (np && np.policy === 'EMPLOYEE_AUTHORITY_LIMIT') policyNote = np.employee_authority_max
          ? `Employee authority: up to ${np.employee_authority_unit === 'percent' ? `${np.employee_authority_max}%` : `$${np.employee_authority_max}`} off${np.escalation_threshold ? `; above $${np.escalation_threshold} ask the manager` : ''}`
          : 'Employee authority limit — see the posted policy';
      } catch (e) { /* policy is optional guidance */ }
      setLiveSale(sale);
      setGuidance({ excluded, stage: currentDiscountStage(sale), policyNote });
    } catch (e) {
      console.error('guidance load failed:', e);
      setGuidance({ excluded: [], stage: null, policyNote: '' });
    }
  };

  const completeCheckout = async () => {
    if (!currentCart || !cartUser) return;

    setCompleting(true);
    try {
      // Chapter 17 P1-18 — DUPLICATE-SALE GUARD: verify every cart item is
      // still AVAILABLE before creating the Order. A sold/held item can never
      // be sold twice through the normal sale-day workflow.
      const cartItemIds = [...new Set(currentCart.items.map(ci => ci.item_id))];
      const freshItems = await Promise.all(cartItemIds.map(id => base44.entities.Item.get(id).catch(() => null)));
      const titleById = Object.fromEntries(currentCart.items.map(ci => [ci.item_id, ci.item_title || 'an item']));
      const blocked = freshItems.filter(it => !it || it.status !== 'available');
      if (blocked.length > 0) {
        const names = blocked.map(it => titleById[it?.id] || it?.title || 'a cart item').join(', ');
        setMessage({ type: 'error', text: `Cannot complete sale — already sold or held: ${names}. Clear the cart and rescan the available items.` });
        setCompleting(false);
        return;
      }

      // Chapter 19 P0-1 — HIGH VALUE checkout requires the operator: the data
      // layer blocks sale-team updates on HIGH_VALUE items, so an employee
      // completing this checkout would leave the Order and the Item out of
      // sync. Stop deterministically BEFORE creating the Order.
      const hvBlocked = freshItems.filter(it => it && it.inventory_level === 'HIGH_VALUE'
        && it.operator_id !== staff?.id && it.seller_id !== staff?.id && staff?.role !== 'admin');
      if (hvBlocked.length > 0) {
        const hvNames = hvBlocked.map(it => titleById[it.id] || it.title).join(', ');
        setMessage({ type: 'error', text: `High Value merchandise (${hvNames}) is checked out by the operator. Ask the operator to complete or authorize this checkout.` });
        setCompleting(false);
        return;
      }

      // Create order from cart
      const order = await base44.entities.Order.create({
        order_number: `ORD-${Date.now()}`,
        buyer_id: currentCart.user_id,
        buyer_name: cartUser.full_name || 'Customer',
        items: currentCart.items,
        sale_id: liveSale?.id || null,
        subtotal: currentCart.total,
        total: currentCart.total,
        status: 'paid',
        payment_method: paymentMethod,
        fulfillment_method: 'pickup',
      });

      // Chapter 8 P0-2 — truthful current-state sync: the same physical
      // merchandise must not remain operationally AVAILABLE after checkout.
      // Order/Transaction keep their existing canonical responsibilities;
      // this only records the sale outcome on the Item records.
      const synced = new Set();
      const failedSync = [];
      for (const ci of currentCart.items) {
        if (synced.has(ci.item_id)) continue;
        synced.add(ci.item_id);
        try {
          await base44.entities.Item.update(ci.item_id, {
            status: 'sold',
            sold_date: new Date().toISOString(),
            payment_method_used: paymentMethod,
            buyer_name: cartUser?.full_name || 'Customer',
            buyer_contact: cartUser?.email || '',
          });
        } catch (e) {
          console.error('Item sold-status sync failed for', ci.item_id, e);
          failedSync.push(ci.item_title || ci.item_id);
        }
      }

      // Clear cart
      await base44.entities.Cart.delete(currentCart.id);

      const syncWarning = failedSync.length > 0 ? ` (Warning: could not mark ${failedSync.length} item(s) sold — check inventory.)` : '';
      setMessage({ type: failedSync.length > 0 ? 'error' : 'success', text: `Order ${order.order_number} completed!${syncWarning}` });
      setLastReceipt(order);
      setCurrentCart(null);
      setCartUser(null);
      setPaymentMethod('cash');

      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error completing checkout:', error);
      setMessage({ type: 'error', text: 'Failed to complete checkout' });
    } finally {
      setCompleting(false);
    }
  };

  const handleOnlinePayment = async () => {
    if (!currentCart) return;

    try {
      setProcessingOnline(true);
      const response = await base44.functions.invoke('create-checkout', {
        product: 'pos_order',
        cart_id: currentCart.id,
      });

      if (response.data?.redirectUrl) {
        window.location.href = response.data.redirectUrl;
      } else if (response.data?.unresolved_attempt) {
        // Chapter 21 P0-9 — retry stopped at the write layer; show the facts.
        setUnresolved(response.data.unresolved_attempt);
        setMessage({ type: 'error', text: response.data.error || 'An earlier payment attempt for this cart is still unresolved.' });
      } else {
        setMessage({ type: 'error', text: response.data?.error || 'Failed to start checkout' });
      }
    } catch (error) {
      const data = error?.response?.data;
      if (data?.unresolved_attempt) {
        setUnresolved(data.unresolved_attempt);
        setMessage({ type: 'error', text: data.error || 'An earlier payment attempt for this cart is still unresolved.' });
      } else {
        console.error('Online checkout error:', error);
        setMessage({ type: 'error', text: 'Failed to start checkout: ' + error.message });
      }
    } finally {
      setProcessingOnline(false);
    }
  };

  // Chapter 21 P1 — payment verification workflow (operator/admin): verify the
  // MERCHANT RECORD (Dashboard → Payments), then resolve. The customer's phone
  // is never the merchant record.
  const resolveAttempt = async (action) => {
    if (!unresolved) return;
    setResolving(true);
    try {
      const res = await base44.functions.invoke('resolvePaymentAttempt', {
        attempt_id: unresolved.id,
        action,
        note: resolveNote,
      });
      const d = res.data || {};
      setUnresolved(null);
      setResolveNote('');
      setMessage({ type: 'success', text: d.message || 'Attempt resolved.' });
      if (d.result === 'completed') {
        clearCart();
      } else {
        setTimeout(() => setMessage(null), 4000);
      }
    } catch (error) {
      const msg = error?.response?.data?.error || error.message;
      setMessage({ type: 'error', text: msg });
    } finally {
      setResolving(false);
    }
  };

  const clearCart = () => {
    setCurrentCart(null);
    setCartUser(null);
    setMessage(null);
    setGuidance(null);
    setLiveSale(null);
    setHelpOpen(false);
    setUnresolved(null);
    setResolveNote('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-slate-200 border-t-orange-600 rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-4xl font-serif font-bold text-white flex items-center gap-3">
            <CreditCard className="w-10 h-10 text-orange-500" />
            Checkout Station
          </h1>
          <p className="text-slate-300 mt-2">Scan customer cart QR codes to ring up sales</p>
        </div>

        {/* Messages */}
        {message && (
          <div
            className={`mb-4 p-4 rounded-lg flex items-center gap-2 text-white ${
              message.type === 'success' ? 'bg-green-600' : 'bg-red-600'
            }`}
          >
            {message.type === 'success' ? (
              <Check className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            {message.text}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Scanner */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <QrCode className="w-7 h-7 text-orange-600" />
                  Scan Customer Cart
                </h2>
                {scanning ? (
                  <Button onClick={stopScanning} variant="destructive">
                    Stop
                  </Button>
                ) : (
                  <Button onClick={startScanning} className="bg-orange-600 hover:bg-orange-700">
                    Start Scanner
                  </Button>
                )}
              </div>

              {scanning && (
                <div
                  id="qr-scanner-container"
                  ref={scannerRef}
                  className="w-full rounded-lg overflow-hidden bg-slate-100 min-h-[500px]"
                />
              )}

              {!scanning && (
                <div className="bg-slate-100 rounded-lg p-12 text-center text-slate-500 min-h-[500px] flex flex-col items-center justify-center">
                  <QrCode className="w-24 h-24 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-semibold mb-2">Ready to Scan</p>
                  <p className="text-sm">
                    Customer should show their cart QR code from their phone
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Checkout Summary */}
          <div className="bg-white rounded-lg shadow-2xl p-6 space-y-4 h-fit sticky top-4">
            <h2 className="text-2xl font-bold text-slate-900">
              {currentCart ? `Customer: ${cartUser?.full_name}` : 'No Cart Loaded'}
            </h2>

            {lastReceipt && (
              <SaleReceipt order={lastReceipt} companyName={staff?.company_name} sale={liveSale} />
            )}

            {!currentCart ? (
              <div className="bg-slate-100 rounded-lg p-6 text-center text-slate-500 py-12">
                <QrCode className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Scan a customer cart to begin</p>
              </div>
            ) : (
              <>
                {/* Items */}
                <div className="border border-slate-200 rounded-lg divide-y max-h-64 overflow-y-auto">
                  {currentCart.items.map(item => (
                    <div key={item.item_id} className="p-3 space-y-1">
                      <p className="font-semibold text-slate-900 line-clamp-1 text-sm">
                        {item.item_title}
                      </p>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">
                          {item.quantity}x @ ${item.price}
                        </span>
                        <span className="font-bold text-orange-600">
                          ${(item.quantity * item.price).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Items:</span>
                    <span className="font-semibold">{currentCart.items.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Subtotal:</span>
                    <span className="font-semibold">
                      ${currentCart.total?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                  <div className="border-t pt-2 flex justify-between">
                    <span className="font-bold text-slate-900">Total:</span>
                    <span className="text-3xl font-bold text-orange-600">
                      ${currentCart.total?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                </div>

                {/* Chapter 20 P1-25..P1-27 — cashier discount GUIDANCE (the
                    system never applies a discount) + P1-45 floor-support routing */}
                {guidance && (
                  <div className="border border-slate-200 rounded-lg p-3 space-y-1">
                    <p className="text-xs font-semibold text-slate-900">Discount guidance — you apply the discount; the system never changes prices.</p>
                    {guidance.stage && guidance.stage.hasSchedule ? (
                      <p className="text-xs text-slate-700">
                        {guidance.stage.active
                          ? `Current stage: ${guidance.stage.active.name}${guidance.stage.active.discount_percent ? ` (${guidance.stage.active.discount_percent}% off guidance)` : ''}${guidance.stage.active.note ? ` — ${guidance.stage.active.note}` : ''}`
                          : 'First stage has not started — full asking prices apply.'}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-500">No discount schedule recorded for this sale.</p>
                    )}
                    {guidance.excluded.length > 0 && (
                      <p className="text-xs text-red-700">Excluded from discounts: {guidance.excluded.join(', ')}</p>
                    )}
                    {guidance.policyNote && <p className="text-xs text-slate-600">Authority: {guidance.policyNote}</p>}
                    <p className="text-[10px] text-slate-400">Apply an authorized discount only through the normal price-change path.</p>
                  </div>
                )}
                <Button variant="outline" className="w-full" disabled={!liveSale} onClick={() => setHelpOpen(true)}>
                  Request floor support / help
                </Button>
                {helpOpen && liveSale && (
                  <AskForHelpDialog sale={liveSale} defaultCategory="checkout" onClose={() => setHelpOpen(false)} />
                )}

                {/* Chapter 21 P0-9/P1 — unresolved payment attempt: stop, verify, resolve */}
                {unresolved && (
                  <div className="border border-amber-300 bg-amber-50 rounded-lg p-3 space-y-1.5">
                    <p className="text-xs font-semibold text-amber-900">Earlier payment attempt unresolved — do NOT charge again</p>
                    <p className="text-[11px] text-amber-900">
                      ${Number(unresolved.amount).toFixed(2)} · {unresolved.status} · started{' '}
                      {unresolved.created_at ? new Date(unresolved.created_at).toLocaleString() : '—'} · session {unresolved.provider_session_id || '—'}
                    </p>
                    <p className="text-[11px] text-amber-800">
                      Verify the merchant record: Dashboard → Payments → All Payments. A pending bank charge or the customer's phone is NEVER payment; do not release merchandise.
                    </p>
                    {(staff?.role === 'admin' || staff?.id === unresolved.operator_id) ? (
                      <div className="space-y-1.5">
                        <input
                          value={resolveNote}
                          onChange={(e) => setResolveNote(e.target.value)}
                          placeholder="What the merchant record showed"
                          className="w-full px-2 py-1.5 border border-amber-300 rounded text-xs"
                        />
                        <div className="flex flex-wrap gap-1.5">
                          <Button size="sm" disabled={resolving} onClick={() => resolveAttempt('verified_approved')} className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700">
                            Verified paid — complete order
                          </Button>
                          <Button size="sm" variant="outline" disabled={resolving} onClick={() => resolveAttempt('merchant_declined')} className="h-7 text-xs">
                            Merchant says declined
                          </Button>
                          <Button size="sm" variant="outline" disabled={resolving} onClick={() => resolveAttempt('merchant_failed')} className="h-7 text-xs">
                            Merchant says failed
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-amber-800">Ask the operator to verify with the payment provider and resolve this attempt.</p>
                    )}
                  </div>
                )}

                {/* Payment Method */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-900">
                    Payment Method (Offline)
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Credit/Debit Card (manual)</option>
                    <option value="venmo">Venmo</option>
                    <option value="check">Check</option>
                  </select>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  <Button
                    onClick={handleOnlinePayment}
                    disabled={processingOnline}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 flex items-center justify-center gap-2"
                  >
                    {processingOnline ? 'Redirecting...' : 'Pay Online (Base44 Payments)'}
                  </Button>
                  <div className="text-center text-xs text-slate-500">— or —</div>
                  <Button
                    onClick={completeCheckout}
                    disabled={completing}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 text-lg"
                  >
                    {completing ? 'Processing...' : 'Complete Offline Sale'}
                  </Button>
                  <Button
                    onClick={clearCart}
                    variant="outline"
                    className="w-full"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Clear & Scan Next
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}