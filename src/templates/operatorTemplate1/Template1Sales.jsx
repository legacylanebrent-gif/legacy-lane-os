// Template #1 sales page (Part 26) — renders ONLY publication-visible
// canonical sales from the runtime (never local presentation copies).
import React from 'react';
import SaleCard from './SaleCard.jsx';
import TemplateErrorState from './TemplateErrorState.jsx';

export default function Template1Sales({ website }) {
  const sales = website.published_sales || [];
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Sales</h1>
      {sales.length === 0 ? <TemplateErrorState kind="no_sales" /> : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {sales.map(s => <SaleCard key={s.public_id} sale={s} hostname={website.hostname} />)}
        </div>
      )}
    </div>
  );
}