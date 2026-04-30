import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { QrCode, ShoppingCart, Trash2, Plus, Minus, Check, AlertCircle } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function ScanAndCart() {
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [sale, setSale] = useState(null);
  const scannerRef = useRef(null);
  const [qrScanner, setQrScanner] = useState(null);

  useEffect(() => {
    loadUserAndCart();
  }, []);

  const loadUserAndCart = async () => {
    try {
      const userData = await base44.auth.me();
      if (!userData) {
        setMessage({ type: 'error', text: 'Please log in first' });
        setLoading(false);
        return;
      }
      setUser(userData);

      // Load user's cart
      const carts = await base44.entities.Cart.filter({ user_id: userData.id });
      if (carts.length > 0) {
        setCart(carts[0].items || []);
      }

      // Load current sale (first active sale)
      const sales = await base44.entities.EstateSale.filter({ status: 'active' }, '-created_date', 1);
      if (sales.length > 0) {
        setSale(sales[0]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setMessage({ type: 'error', text: 'Failed to load data' });
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
            // Parse QR code (expects item ID or URL with itemId param)
            let itemId = decodedText;
            if (decodedText.includes('itemId=')) {
              const url = new URL(decodedText, window.location.origin);
              itemId = url.searchParams.get('itemId');
            }

            if (!itemId) throw new Error('Invalid QR code format');

            // Fetch item details
            const items = await base44.entities.Item.filter({ id: itemId });
            if (items.length === 0) throw new Error('Item not found');

            const item = items[0];

            // Add to cart
            setCart(prev => {
              const existing = prev.find(ci => ci.item_id === item.id);
              if (existing) {
                return prev.map(ci =>
                  ci.item_id === item.id ? { ...ci, quantity: ci.quantity + 1 } : ci
                );
              }
              return [
                ...prev,
                {
                  item_id: item.id,
                  item_title: item.title,
                  quantity: 1,
                  price: item.price,
                  seller_id: item.seller_id,
                  seller_name: item.seller_name,
                },
              ];
            });

            setMessage({ type: 'success', text: `Added "${item.title}" to cart` });

            // Auto-hide message
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

  const saveCart = async () => {
    try {
      const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

      // Find or create cart
      const carts = await base44.entities.Cart.filter({ user_id: user.id });
      if (carts.length > 0) {
        await base44.entities.Cart.update(carts[0].id, {
          items: cart,
          total,
        });
      } else {
        await base44.entities.Cart.create({
          user_id: user.id,
          items: cart,
          total,
        });
      }

      setMessage({ type: 'success', text: 'Cart saved successfully' });
      setTimeout(() => setMessage(null), 2000);
    } catch (error) {
      console.error('Error saving cart:', error);
      setMessage({ type: 'error', text: 'Failed to save cart' });
    }
  };

  const removeItem = (itemId) => {
    setCart(prev => prev.filter(ci => ci.item_id !== itemId));
  };

  const updateQuantity = (itemId, qty) => {
    if (qty <= 0) {
      removeItem(itemId);
    } else {
      setCart(prev =>
        prev.map(ci => (ci.item_id === itemId ? { ...ci, quantity: qty } : ci))
      );
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-slate-200 border-t-orange-600 rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-serif font-bold text-slate-900 flex items-center gap-2">
            <ShoppingCart className="w-8 h-8 text-orange-600" />
            {sale?.title || 'Estate Sale'} — Shopping Cart
          </h1>
          <p className="text-slate-600 mt-1">Scan items to add to your cart</p>
        </div>

        {/* Messages */}
        {message && (
          <div
            className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${
              message.type === 'success'
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
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
            <div className="bg-white rounded-lg shadow-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <QrCode className="w-6 h-6 text-orange-600" />
                  Scan Items
                </h2>
                {scanning ? (
                  <Button onClick={stopScanning} variant="destructive">
                    Stop Scanning
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
                  className="w-full rounded-lg overflow-hidden bg-slate-100 min-h-96"
                />
              )}

              {!scanning && (
                <div className="bg-slate-100 rounded-lg p-8 text-center text-slate-500">
                  <QrCode className="w-16 h-16 mx-auto mb-3 opacity-30" />
                  <p>Click "Start Scanner" to begin scanning item QR codes</p>
                </div>
              )}
            </div>
          </div>

          {/* Cart Summary */}
          <div className="bg-white rounded-lg shadow-lg p-6 space-y-4 h-fit sticky top-4">
            <h2 className="text-xl font-bold text-slate-900">Your Cart ({cart.length})</h2>

            {cart.length === 0 ? (
              <p className="text-slate-500 text-center py-6">No items in cart yet</p>
            ) : (
              <>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {cart.map(item => (
                    <div
                      key={item.item_id}
                      className="border border-slate-200 rounded-lg p-3 space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900 line-clamp-2 text-sm">
                            {item.item_title}
                          </p>
                          <p className="text-orange-600 font-bold text-lg mt-1">
                            ${(item.price * item.quantity).toFixed(2)}
                          </p>
                        </div>
                        <button
                          onClick={() => removeItem(item.item_id)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.item_id, item.quantity - 1)}
                          className="p-1 rounded bg-slate-100 hover:bg-slate-200"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="flex-1 text-center font-semibold">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.item_id, item.quantity + 1)}
                          className="p-1 rounded bg-slate-100 hover:bg-slate-200"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      <p className="text-xs text-slate-500">${item.price} each</p>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="border-t border-slate-200 pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Subtotal:</span>
                    <span className="font-semibold">${cartTotal.toFixed(2)}</span>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-3">
                    <div className="flex justify-between">
                      <span className="font-bold text-slate-900">Total:</span>
                      <span className="text-2xl font-bold text-orange-600">
                        ${cartTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <Button
                    onClick={saveCart}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold"
                  >
                    Save Cart & Ready for Checkout
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