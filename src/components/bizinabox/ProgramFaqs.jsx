import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { PROGRAM_FAQS } from './content';

export default function ProgramFaqs() {
  const [open, setOpen] = useState(null);

  return (
    <div className="divide-y divide-slate-200 border-y border-slate-200">
      {PROGRAM_FAQS.map((faq, i) => (
        <div key={i}>
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between gap-4 py-4 text-left"
          >
            <span className="font-bold text-slate-900 text-sm md:text-base">{faq.q}</span>
            {open === i ? (
              <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
            )}
          </button>
          {open === i && <p className="pb-4 text-sm text-slate-600 leading-relaxed">{faq.a}</p>}
        </div>
      ))}
    </div>
  );
}