import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { QrCode, CreditCard, AlertCircle, Check, Trash2, RefreshCw } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';

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

  const completeCheckout = async () => {
    if (!currentCart || !cartUser) return;

    setCompleting(true);
    try {
      // Create order from cart
      const order = await base44.entities.Order.create({
        order_number: `ORD-${Date.now()}`,
        buyer_id: currentCart.user_id,
        buyer_name: cartUser.full_name || 'Customer',
        items: currentCart.items,
        subtotal: currentCart.total,
        total: currentCart.total,
        status: 'paid',
        payment_method: paymentMethod,
        fulfillment_method: 'pickup',
      });

      // Clear cart
      await base44.entities.Cart.delete(currentCart.id);

      setMessage({ type: 'success', text: `Order ${order.order_number} completed!` });
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

  const clearCart = () => {
    setCurrentCart(null);
    setCartUser(null);
    setMessage(null);
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

                {/* Payment Method */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-900">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Credit/Debit Card</option>
                    <option value="venmo">Venmo</option>
                    <option value="check">Check</option>
                  </select>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  <Button
                    onClick={completeCheckout}
                    disabled={completing}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-6 text-lg"
                  >
                    {completing ? 'Processing...' : 'Complete Sale'}
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