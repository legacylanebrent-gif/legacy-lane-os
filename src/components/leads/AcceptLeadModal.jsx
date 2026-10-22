import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MapPin, User, PauseCircle } from 'lucide-react';

// Referral Rebuild Phase 1 — compensated lead acceptance is paused server-side
// (acceptLeadAndGenerateAgreement). This modal explains the pause instead of
// offering an accept flow that cannot complete.
export default function AcceptLeadModal({ open, lead, onClose, onSuccess }) {
  if (!open || !lead) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Accept Lead</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 py-4">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <PauseCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900 text-sm">Referral Exchange acceptance is paused</p>
              <p className="text-amber-800 text-sm mt-1 leading-relaxed">
                The legacy referral exchange is being rebuilt with a proper eligibility system. New lead acceptance, deal agreements, and referral compensation are temporarily unavailable. Existing agreements and history are preserved.
              </p>
            </div>
          </div>

          <h3 className="font-semibold text-slate-900">Lead Summary</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <MapPin className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase">Property Address</p>
                <p className="text-sm font-medium text-slate-900">{lead.property_address}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <User className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase">Client Name</p>
                <p className="text-sm font-medium text-slate-900">{lead.client_name}</p>
              </div>
            </div>
          </div>

          <Button variant="outline" onClick={onClose} className="w-full">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}