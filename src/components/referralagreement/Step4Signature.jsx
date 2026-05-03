import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

export default function Step4Signature({ user, onSubmit, submitting }) {
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [electronicAgreed, setElectronicAgreed] = useState(false);

  const canSubmit = fullName.trim().length > 2 && electronicAgreed && !submitting;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-serif font-bold text-slate-900">Electronic Signature</h2>
        <p className="text-slate-500 mt-1 text-sm">Sign below to activate your Referral Exchange participation.</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="fullName">Full Legal Name *</Label>
          <Input
            id="fullName"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            placeholder="Enter your full name"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            value={user?.email || ''}
            disabled
            className="mt-1 bg-slate-50 text-slate-500"
          />
        </div>
      </div>

      <div
        onClick={() => setElectronicAgreed(v => !v)}
        className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
          electronicAgreed ? 'border-orange-400 bg-orange-50' : 'border-slate-200 bg-white hover:border-slate-300'
        }`}
      >
        <Checkbox
          checked={electronicAgreed}
          onCheckedChange={() => setElectronicAgreed(v => !v)}
          className="mt-0.5 flex-shrink-0"
          onClick={e => e.stopPropagation()}
        />
        <Label className="text-sm text-slate-700 leading-relaxed cursor-pointer">
          I agree to sign this agreement electronically and understand this signature is legally binding.
        </Label>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
        <p className="text-xs text-slate-400 mb-1">Signature Preview</p>
        <p className={`text-2xl font-serif italic ${fullName.trim() ? 'text-slate-800' : 'text-slate-300'}`}>
          {fullName.trim() || 'Your Name Here'}
        </p>
      </div>

      <Button
        onClick={() => onSubmit({ signed_name: fullName.trim() })}
        disabled={!canSubmit}
        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-5 rounded-xl text-base disabled:opacity-50"
      >
        {submitting ? 'Activating…' : 'Activate Participation'}
      </Button>
    </div>
  );
}