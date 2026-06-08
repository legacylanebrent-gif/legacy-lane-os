import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default function ProbateDisclaimer() {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
      <p className="text-xs text-amber-800 leading-relaxed">
        <strong>Educational Information Only:</strong> EstateSalen provides general educational information about probate, estate sales, cleanouts, and inherited property transitions. EstateSalen is not a law firm and does not provide legal, tax, or financial advice. Probate rules, deadlines, forms, and requirements vary by state and county. Always confirm information with the appropriate probate court, licensed attorney, tax professional, or financial advisor before taking action.
      </p>
    </div>
  );
}