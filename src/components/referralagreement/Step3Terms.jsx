import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

const SECTIONS = [
  { title: '1. Platform Overview', body: 'Houszu and Legacy Lane provide a shared ecosystem connecting real estate agents and estate sale operators. By participating, you agree to use the platform infrastructure for all lead management, communication, and transaction tracking related to introduced leads.' },
  { title: '2. Lead Introductions', body: 'Leads may be provided at no upfront cost and remain subject to platform protections. All introduced leads are considered proprietary to the platform and are shared under the terms of this agreement.' },
  { title: '3. Referral Routing', body: 'All real estate transactions resulting from platform-introduced leads must be routed through the designated referral agent, Brent Cramp, Keller Williams Realty Central Monmouth, or another approved licensed referral entity as designated by the platform.' },
  { title: '4. Compensation Structure', body: 'All payments to participants are structured as platform credits, marketing incentives, or service-based compensation — not direct real estate commissions. Nothing in this agreement creates an agency, employment, or partnership relationship.' },
  { title: '5. Non-Circumvention', body: 'Participants may not bypass the platform, directly solicit, or engage with any platform-introduced lead outside of the platform structure. This prohibition applies to all communication channels, including direct contact, referrals to third parties, and use of independently obtained information.' },
  { title: '6. Liquidated Damages', body: 'Violation of the non-circumvention clause may result in liquidated damages equal to the greater of 25% of the gross commission earned on the circumvented transaction or $5,000, whichever is greater. The parties agree this amount is a reasonable estimate of harm.' },
  { title: '7. Enforcement', body: 'The platform reserves the right to suspend access, revoke credits, or permanently terminate accounts upon evidence of non-compliance, without prior notice.' },
  { title: '8. Termination', body: 'Participants may terminate this agreement within 14 days of signing. After the 14-day period, termination requests are subject to platform review and may not be granted for leads already introduced under this agreement.' },
  { title: '9. Survival', body: 'The non-circumvention obligations in Section 5 survive termination of this agreement for a period of 12 months from the date of the relevant lead introduction.' },
  { title: '10. Electronic Signature', body: 'This agreement is legally binding upon electronic signature. By checking the agreement box and submitting your name, you acknowledge that your electronic signature is valid and enforceable to the same extent as a handwritten signature.' },
];

export default function Step3Terms({ onNext }) {
  const [agreed, setAgreed] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const scrollRef = useRef(null);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 20) {
      setScrolled(true);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-serif font-bold text-slate-900">Terms & Conditions</h2>
        <p className="text-slate-500 mt-1 text-sm">Please scroll through and read the full agreement before continuing.</p>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-72 overflow-y-auto border border-slate-200 rounded-xl p-5 bg-slate-50 space-y-5 text-sm text-slate-700 leading-relaxed"
      >
        {SECTIONS.map(s => (
          <div key={s.title}>
            <p className="font-bold text-slate-900 mb-1">{s.title}</p>
            <p>{s.body}</p>
          </div>
        ))}
        <div className="h-4" />
      </div>

      {!scrolled && (
        <p className="text-xs text-slate-400 text-center italic">↓ Scroll to the bottom to enable the checkbox</p>
      )}

      <div
        onClick={() => scrolled && setAgreed(v => !v)}
        className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all ${
          agreed ? 'border-orange-400 bg-orange-50' : 'border-slate-200 bg-white'
        } ${scrolled ? 'cursor-pointer hover:border-slate-300' : 'opacity-40 cursor-not-allowed'}`}
      >
        <Checkbox
          checked={agreed}
          disabled={!scrolled}
          onCheckedChange={() => scrolled && setAgreed(v => !v)}
          className="mt-0.5 flex-shrink-0"
          onClick={e => e.stopPropagation()}
        />
        <Label className="text-sm text-slate-700 leading-relaxed cursor-pointer">
          I agree to the Terms and Conditions
        </Label>
      </div>

      <Button
        onClick={onNext}
        disabled={!agreed}
        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-5 rounded-xl text-base disabled:opacity-50"
      >
        Continue
      </Button>
    </div>
  );
}