import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { X, Camera } from 'lucide-react';

export default function QRCodeScanner({ onScan, onClose }) {
  const scannerRef = useRef(null);
  const [scanner, setScanner] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const html5QrCode = new Html5Qrcode("qr-reader");
    setScanner(html5QrCode);

    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    html5QrCode.start(
      { facingMode: "environment" },
      config,
      (decodedText) => {
        // Successfully scanned
        html5QrCode.stop().then(() => {
          onScan(decodedText);
        }).catch(() => {
          onScan(decodedText);
        });
      },
      (errorMessage) => {
        // Ignore scanning errors, they happen constantly
      }
    ).catch((err) => {
      const errorMsg = err?.message || err?.toString() || 'Unable to start camera. Please check permissions.';
      setError(errorMsg);
      console.error('QR Scanner Error:', err);
    });

    return () => {
      if (html5QrCode.isScanning) {
        html5QrCode.stop().catch(err => console.log('Error stopping scanner:', err));
      }
    };
  }, [onScan]);

  const handleClose = () => {
    if (scanner && scanner.isScanning) {
      scanner.stop().then(() => {
        onClose();
      }).catch(err => {
        console.log('Error stopping scanner:', err);
        onClose();
      });
    } else {
      onClose();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-orange-600" />
          <h3 className="font-semibold text-slate-900">Scan QR Code</h3>
        </div>
        <Button variant="ghost" size="icon" onClick={handleClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-slate-900 rounded-lg overflow-hidden">
        <div id="qr-reader" ref={scannerRef}></div>
      </div>

      <div className="text-center text-sm text-slate-600">
        <p>Position the QR code within the frame</p>
        <p className="text-xs mt-1">Scanning will stop automatically once detected</p>
      </div>
    </div>
  );
}