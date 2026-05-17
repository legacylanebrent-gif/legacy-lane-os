import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DollarSign, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function StarterPublishFeeModal({ open, onClose, onFeePaid, saleName }) {
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);

  const handlePayFee = async () => {
    setPaying(true);
    // Simulate payment processing — replace with real payment integration when ready
    await new Promise(r => setTimeout(r, 1500));
    setPaid(true);
    setPaying(false);
    setTimeout(() => {
      onFeePaid();
      onClose();
      setPaid(false);
    }, 1000);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900">
            <DollarSign className="w-5 h-5 text-orange-600" />
            Publishing Fee Required
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Starter Plan — Per-Sale Publishing Fee</p>
              <p className="text-sm text-amber-700 mt-1">
                Your Starter subscription includes a <strong>$25 fee per sale published</strong>. This fee is required before your sale can go live.
              </p>
            </div>
          </div>

          <div className="border rounded-lg p-4 space-y-2">
            <p className="text-xs text-slate-500 uppercase font-medium tracking-wide">Sale Being Published</p>
            <p className="text-slate-900 font-semibold">{saleName || 'Estate Sale'}</p>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <span className="text-slate-700 font-medium">Publishing Fee</span>
            <Badge className="bg-orange-600 text-white text-base px-3 py-1">$25.00</Badge>
          </div>

          <p className="text-xs text-slate-500 text-center">
            Upgrade to <strong>Professional</strong> ($129/mo) for unlimited sales with no per-sale fees.
          </p>

          {paid ? (
            <div className="flex items-center justify-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">Payment successful! Publishing your sale...</span>
            </div>
          ) : (
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} className="flex-1" disabled={paying}>
                Cancel
              </Button>
              <Button
                onClick={handlePayFee}
                disabled={paying}
                className="flex-1 bg-orange-600 hover:bg-orange-700"
              >
                {paying ? 'Processing...' : 'Pay $25 & Publish'}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}