import React from 'react';
import { Check } from 'lucide-react';

export default function StepIndicator({ currentStep, steps }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((label, i) => {
        const step = i + 1;
        const done = step < currentStep;
        const active = step === currentStep;
        return (
          <React.Fragment key={step}>
            <div className="flex flex-col items-center flex-shrink-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all
                ${done ? 'bg-green-500 text-white' : active ? 'bg-orange-500 text-white ring-4 ring-orange-100' : 'bg-slate-200 text-slate-400'}`}>
                {done ? <Check className="w-4 h-4" /> : step}
              </div>
              <span className={`mt-1 text-xs whitespace-nowrap ${active ? 'text-orange-600 font-semibold' : 'text-slate-400'}`}>{label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-0.5 flex-1 mx-1 mb-5 ${done ? 'bg-green-400' : 'bg-slate-200'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}