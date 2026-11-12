import React from 'react';
import { Globe } from 'lucide-react';

// Status note only. The operator website refuses to create a listing for a sale it
// has never seen ("unknown sale, no auto-create"), so a first-time push can never
// succeed — the sale has to be pulled once from the website's own admin first.
export default function PushToWebsiteButton({ sale, className = '' }) {
  // Draft and archived sales are never on a public website.
  const blocked = ['draft', 'archived'].includes(sale?.status);

  return (
    <p className={`flex items-start gap-1 text-xs text-slate-500 ${className}`}>
      <Globe className="w-3 h-3 mt-0.5 flex-shrink-0" />
      <span>
        {blocked
          ? 'Publish this sale (upcoming or active) before it can appear on your website.'
          : 'To put this sale on your website, go to your website admin and pull it there first.'}
      </span>
    </p>
  );
}