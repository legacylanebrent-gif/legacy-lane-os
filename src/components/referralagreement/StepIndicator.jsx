import React from 'react';
import { Check } from 'lucide-react';

const STEPS = ['Summary', 'Acknowledgements', 'Terms', 'Signature'];

export default function StepIndicator({ currentStep }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((label, idx) => {
        const step = idx + 1;
        const done = currentStep > step;
        const active = currentStep === step;
        return (
          <React.Fragment key={step}>
            <div className="flex flex-col items-center">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                done ? 'bg-green-500 border-green-500 text-white' :
                active ? 'bg-orange-500 border-orange-500 text-white' :
                'bg-white border-slate-300 text-slate-400'
              }`}>
                {done ? <Check className="w-4 h-4" /> : step}
              </div>
              <span className={`text-xs mt-1 font-medium ${active ? 'text-orange-600' : done ? 'text-green-600' : 'text-slate-400'}`}>
                {label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`h-0.5 w-10 mb-4 mx-1 ${currentStep > step ? 'bg-green-400' : 'bg-slate-200'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}