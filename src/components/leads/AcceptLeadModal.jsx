import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MapPin, User, CheckCircle, Download, FileText } from 'lucide-react';

const CHECKBOXES = [
  'I confirm I am accepting this lead through the platform.',
  'I understand this lead is protected by platform referral and non-circumvention rules.',
  'I agree that any resulting real estate transaction will include the designated referral agent, Brent Cramp, Keller Williams Realty Central Monmouth.',
  'I understand this action will generate a property-specific referral agreement.',
];

export default function AcceptLeadModal({ open, lead, onClose, onSuccess }) {
  const [step, setStep] = useState(1);
  const [checked, setChecked] = useState(Array(CHECKBOXES.length).fill(false));
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const toggle = (i) => setChecked(prev => prev.map((v, idx) => idx === i ? !v : v));
  const allChecked = checked.every(Boolean);

  const handleSubmit = async () => {
    setSubmitting(true);
    const res = await base44.functions.invoke('acceptLeadAndGenerateAgreement', {
      lead_id: lead.id,
    });
    setSubmitting(false);
    if (res.data?.deal_id) {
      setResult(res.data);
      onSuccess?.(res.data);
    }
  };

  if (!open || !lead) return null;

  if (result) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-lg">
          <div className="text-center space-y-5 py-6">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-serif font-bold text-slate-900">Lead Accepted</h2>
              <p className="text-sm text-slate-500 mt-1">Agreement Generated</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left space-y-2 text-sm text-slate-700">
              <p>✓ ReferralLead status updated to accepted</p>
              <p>✓ ReferralDealAgreement created</p>
              <p>✓ Contract document generated</p>
            </div>
            <div className="space-y-2 pt-2">
              {result.contract_url && (
                <a href={result.contract_url} target="_blank" rel="noopener noreferrer">
                  <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white gap-2">
                    <FileText className="w-4 h-4" /> View Agreement
                  </Button>
                </a>
              )}
              {result.contract_url && (
                <a href={result.contract_url} download>
                  <Button variant="outline" className="w-full gap-2">
                    <Download className="w-4 h-4" /> Download PDF
                  </Button>
                </a>
              )}
              <Button variant="ghost" onClick={onClose} className="w-full">
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        {step === 1 ? (
          <>
            <DialogHeader>
              <DialogTitle>Accept Lead</DialogTitle>
            </DialogHeader>
            <div className="space-y-5 py-4">
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
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-800">
                  <p className="font-semibold mb-1">Lead Source</p>
                  <p>Introduced through Houszu & Legacy Lane Referral Exchange</p>
                </div>
              </div>
              <Button
                onClick={() => setStep(2)}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-5"
              >
                Continue
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Confirm Acceptance</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-slate-600">All items must be checked to continue.</p>
              <div className="space-y-3">
                {CHECKBOXES.map((text, i) => (
                  <div
                    key={i}
                    onClick={() => toggle(i)}
                    className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      checked[i] ? 'border-orange-400 bg-orange-50' : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <Checkbox
                      checked={checked[i]}
                      onCheckedChange={() => toggle(i)}
                      className="mt-0.5 flex-shrink-0"
                      onClick={e => e.stopPropagation()}
                    />
                    <Label className="text-sm text-slate-700 leading-relaxed cursor-pointer">{text}</Label>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!allChecked || submitting}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-5 disabled:opacity-50"
                >
                  {submitting ? 'Generating…' : 'Accept & Generate Agreement'}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}