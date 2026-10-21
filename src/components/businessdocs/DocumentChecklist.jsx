import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import { DOC_CATEGORIES } from './documentModel';

// Chapter 6 P1-5 — the book's Business Document Checklist, provided by the
// Vault itself (no separate static worksheet). "On file" is derived from the
// operator's real vault contents. This is a starting guide, NOT legal
// advice: nothing here claims every business needs every document, and
// checklist completion is never represented as legal compliance.
const GUIDE = {
  FORMATION: 'Documents that establish the business (e.g. articles, operating agreement).',
  INSURANCE: 'Liability and other coverage documents.',
  AGREEMENT: 'Standard client/contractor agreements.',
  POLICY: 'Team policies, confidentiality, safety, sale-day procedures.',
  REGISTRATION: 'Business registrations and registrations with authorities.',
  PERMIT: 'Local permits relevant to sales and operations.',
  CERTIFICATION: 'Professional certifications or credentials.',
  PROFESSIONAL: 'Documents to review with your professional advisers.',
};

export default function DocumentChecklist({ categoryCounts }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <button className="w-full flex items-center justify-between p-4 text-left" onClick={() => setOpen(o => !o)}>
        <div>
          <p className="font-semibold text-slate-900 text-sm">Starting guide — documents to review with your professional advisers</p>
          <p className="text-xs text-slate-500">Consider whether your business needs each kind of document. Nothing here is legal advice.</p>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2">
          <div className="flex items-start gap-2 rounded-lg bg-slate-50 p-2.5 text-[11px] text-slate-600">
            <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-slate-400" />
            <span>On-file counts come from your vault. A category you skip may simply be not applicable to your business — that decision is yours (with your advisers), not the app's.</span>
          </div>
          {DOC_CATEGORIES.map(c => {
            const n = categoryCounts[c.key] || 0;
            return (
              <div key={c.key} className="flex items-start justify-between gap-2 text-xs">
                <div className="min-w-0">
                  <p className="font-medium text-slate-700">{c.label}</p>
                  <p className="text-slate-400">{GUIDE[c.key]}</p>
                </div>
                <Badge variant="outline" className={n > 0 ? 'bg-green-50 text-green-700 flex-shrink-0' : 'bg-slate-50 text-slate-400 flex-shrink-0'}>
                  {n > 0 ? `${n} on file` : 'Not on file'}
                </Badge>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}