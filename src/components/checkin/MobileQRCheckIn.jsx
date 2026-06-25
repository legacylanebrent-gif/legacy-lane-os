import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import QRCodeScanner from '@/components/checkin/QRCodeScanner';
import { QrCode } from 'lucide-react';

export default function MobileQRCheckIn() {
  const [open, setOpen] = useState(false);

  const handleScan = (decodedText) => {
    // Extract saleId from a URL or raw ID
    let saleId = decodedText.trim();
    try {
      const url = new URL(decodedText);
      const id = url.searchParams.get('saleId');
      if (id) saleId = id;
    } catch { /* not a URL — use raw text */ }
    setOpen(false);
    window.location.href = `${window.location.origin}/CheckIn?saleId=${encodeURIComponent(saleId)}`;
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative p-3 text-slate-400 hover:text-slate-600"
        aria-label="Scan QR to check in"
      >
        <QrCode className="w-7 h-7" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-orange-600" />
              Sale Check-In
            </DialogTitle>
          </DialogHeader>
          <QRCodeScanner onScan={handleScan} onClose={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}