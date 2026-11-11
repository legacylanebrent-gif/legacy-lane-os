import React from 'react';
import { X } from 'lucide-react';
import InquiryForm from './InquiryForm';

export default function ApplyModal({ path, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 bg-black/60 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 sm:p-8 my-8">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Apply now</h3>
            <p className="text-xs text-slate-500 mt-1">Applying records your interest. It does not start billing, activate an operator, or start the build-phase clock.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 shrink-0" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <InquiryForm mode="apply" pathLabel={path?.name} onClose={onClose} />
      </div>
    </div>
  );
}