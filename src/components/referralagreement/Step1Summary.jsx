import React from 'react';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Users, AlertTriangle } from 'lucide-react';

const POINTS = [
  { icon: Users, text: 'You will receive access to shared lead opportunities from Houszu and Legacy Lane.' },
  { icon: ShieldCheck, text: 'You agree to use the platform as the primary method of managing those leads.' },
  { icon: AlertTriangle, text: 'You agree not to bypass, circumvent, or engage directly with any platform-introduced lead outside of the platform structure.' },
];

export default function Step1Summary({ onNext }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-serif font-bold text-slate-900">Referral Exchange — What You're Agreeing To</h2>
        <p className="text-slate-500 mt-1 text-sm">Before you gain access, please review these three core commitments.</p>
      </div>

      <div className="space-y-4">
        {POINTS.map(({ icon: Icon, text }, i) => (
          <div key={i} className="flex items-start gap-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
              <Icon className="w-4 h-4 text-orange-600" />
            </div>
            <p className="text-slate-700 text-sm leading-relaxed">{text}</p>
          </div>
        ))}
      </div>

      <Button onClick={onNext} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-5 rounded-xl text-base">
        Continue
      </Button>
    </div>
  );
}