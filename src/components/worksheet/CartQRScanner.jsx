import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { QrCode, Plus, X, AlertCircle, Check } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function CartQRScanner({ open, onClose, onItemsAdded, itemName, setItemName, setQuantity, setPrice }) {
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState(null);
  const scannerRef = useRef(null);
  const [qrScanner, setQrScanner] = useState(null);

  const startScanning = () => {
    setScanning(true);
    setTimeout(() => {
      if (scannerRef.current) {
        const scanner = new Html5QrcodeScanner(
          'cart-qr-scanner-container',
          { fps: 10, qrbox: 250 },
          false
        );

        const onScanSuccess = async (decodedText) => {
          try {
            // Parse QR code — expects cart:<userId>
            let userId = decodedText;
            if (decodedText.startsWith('cart:')) {
              userId = decodedText.replace('cart:', '');
            }

            if (!userId) throw new Error('Invalid QR code format');

            // Fetch user's cart
            const carts = await base44.entities.Cart.filter({ user_id: userId });
            if (carts.length === 0) throw new Error('No cart found for this customer');

            const cartData = carts[0];

            // Add each cart item line by line
            if (cartData.items && cartData.items.length > 0) {
              // Add first item to form fields
              const firstItem = cartData.items[0];
              setItemName(firstItem.item_title);
              setQuantity(firstItem.quantity);
              setPrice(firstItem.price.toString());

              // Show success message with count
              setMessage({
                type: 'success',
                text: `Loaded ${cartData.items.length} items from customer cart`
              });

              // Call callback with all items
              if (onItemsAdded) {
                onItemsAdded(cartData.items);
              }

              stopScanning();
              setTimeout(() => onClose(), 2000);
            }
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

  useEffect(() => {
    return () => {
      if (qrScanner) {
        qrScanner.clear();
      }
    };
  }, [qrScanner]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            Scan Customer Cart
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {message && (
            <div
              className={`p-3 rounded-lg flex items-center gap-2 text-sm ${
                message.type === 'success'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {message.type === 'success' ? (
                <Check className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              {message.text}
            </div>
          )}

          {scanning ? (
            <>
              <div
                id="cart-qr-scanner-container"
                ref={scannerRef}
                className="w-full rounded-lg overflow-hidden bg-slate-100 min-h-64"
              />
              <Button
                onClick={stopScanning}
                variant="destructive"
                className="w-full"
              >
                Stop Scanning
              </Button>
            </>
          ) : (
            <>
              <div className="bg-slate-100 rounded-lg p-8 text-center text-slate-500 min-h-64 flex flex-col items-center justify-center">
                <QrCode className="w-16 h-16 mx-auto mb-3 opacity-30" />
                <p className="font-semibold">Ready to Scan</p>
                <p className="text-sm">Customer should show their cart QR code</p>
              </div>
              <Button
                onClick={startScanning}
                className="w-full bg-orange-600 hover:bg-orange-700"
              >
                <QrCode className="w-4 h-4 mr-2" />
                Start Scanner
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}