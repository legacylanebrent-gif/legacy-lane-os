import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

const ITEMS = [
  'I understand that Houszu and Legacy Lane may provide leads or opportunities at no upfront cost.',
  'I agree to use the platform as the primary method of managing and tracking any leads introduced through the system.',
  'I understand that any real estate opportunity resulting from a platform-introduced lead must be routed through the designated referral agent, Brent Cramp, Keller Williams Realty Central Monmouth, or another approved licensed referral entity.',
  'I understand that I am not receiving a direct real estate commission from the platform, and that any earnings, credits, or payments I receive are structured as platform incentives, marketing credits, or service-based compensation.',
  'I agree not to bypass, circumvent, or engage directly with any platform-introduced lead outside of the platform structure.',
  'I understand that non-circumvention obligations survive for 12 months from the date of lead introduction.',
  'I confirm that I have the authority to enter into this agreement.',
];

export default function Step2Acknowledgements({ onNext }) {
  const [checked, setChecked] = useState(Array(ITEMS.length).fill(false));

  const toggle = (i) => setChecked(prev => prev.map((v, idx) => idx === i ? !v : v));
  const allChecked = checked.every(Boolean);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-serif font-bold text-slate-900">Required Acknowledgements</h2>
        <p className="text-slate-500 mt-1 text-sm">All items must be checked to continue.</p>
      </div>

      <div className="space-y-4">
        {ITEMS.map((text, i) => (
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

      <Button
        onClick={onNext}
        disabled={!allChecked}
        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-5 rounded-xl text-base disabled:opacity-50"
      >
        Continue
      </Button>
    </div>
  );
}