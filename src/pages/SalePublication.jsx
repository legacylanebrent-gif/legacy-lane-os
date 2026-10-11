import React from 'react';
import PublicationPanel from '@/components/publication/PublicationPanel';

export default function SalePublication() {
  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-serif text-navy-900">Sale Publication</h1>
        <p className="text-sm text-slate-600 mt-1">Publish your EstateSalen sales to website destinations. EstateSalen remains the single source of operational truth.</p>
      </div>
      <PublicationPanel />
    </div>
  );
}