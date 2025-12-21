import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export default function VenmoPaymentModal({ open, onClose, amount, venmoQRCode, onConfirm, loading }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
                <span className="text-white font-bold text-sm">V</span>
              </div>
              <h2 className="text-lg font-semibold text-slate-900">Venmo Payment</h2>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Amount */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-sm text-slate-600 mb-1">Amount to Pay:</div>
            <div className="text-3xl font-bold text-blue-600">${amount.toFixed(2)}</div>
          </div>

          {/* Instructions */}
          <p className="text-sm text-center text-slate-600">
            Scan the QR code below with your Venmo app to complete the payment
          </p>

          {/* QR Code */}
          <div className="flex justify-center py-4">
            {venmoQRCode ? (
              <div className="bg-white p-6 rounded-lg border-2 border-slate-200 shadow-sm">
                <img 
                  src={venmoQRCode} 
                  alt="Venmo QR Code" 
                  className="w-64 h-64 object-contain"
                />
                <div className="text-center mt-3">
                  <img 
                    src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Venmo_Logo.svg/2560px-Venmo_Logo.svg.png" 
                    alt="Venmo"
                    className="h-6 mx-auto opacity-80"
                  />
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 p-6 rounded-lg border-2 border-slate-200 w-64 h-64 flex items-center justify-center">
                <p className="text-sm text-slate-500 text-center">
                  No Venmo QR code uploaded.<br />
                  Please add one in your profile.
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            <Button
              onClick={onConfirm}
              disabled={loading || !venmoQRCode}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-base font-semibold"
            >
              {loading ? 'Processing...' : 'Confirm Payment Received'}
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              disabled={loading}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}