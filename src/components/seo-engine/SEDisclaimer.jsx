import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default function SEDisclaimer() {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
      <p className="text-xs text-amber-800 leading-relaxed">
        <strong>Educational Information Only:</strong> EstateSalen provides general educational information about probate, estate sales, cleanouts, downsizing, inherited property, and real estate transition services. EstateSalen is not a law firm and does not provide legal, tax, financial, or real estate brokerage advice. Always confirm requirements with the appropriate court, licensed attorney, tax professional, financial advisor, or licensed real estate professional.
      </p>
    </div>
  );
}