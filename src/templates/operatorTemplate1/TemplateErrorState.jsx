// Reusable neutral error/empty states (Part 39). Never leaks internal
// Publication/runtime state or configuration detail.
import React from 'react';
import { AlertCircle, SearchX, Globe } from 'lucide-react';

const MESSAGES = {
  unknown_site: { icon: Globe, title: 'Website not found', body: 'This website does not exist or is no longer available.' },
  unavailable: { icon: AlertCircle, title: 'Website temporarily unavailable', body: 'Please check back soon.' },
  sale_not_found: { icon: SearchX, title: 'Sale not found', body: 'This sale is not available on this website.' },
  no_sales: { icon: SearchX, title: 'No upcoming sales', body: 'Check back soon — new sales are announced regularly.' },
  no_inventory: { icon: SearchX, title: 'No items listed yet', body: 'Photos and items will appear as they are prepared.' },
  unknown_template: { icon: AlertCircle, title: 'Site configuration error', body: 'Please contact the site owner.' }
};

export default function TemplateErrorState({ kind }) {
  const m = MESSAGES[kind] || MESSAGES.unavailable;
  const Icon = m.icon;
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center px-4">
      <Icon className="w-10 h-10 mb-4 opacity-50" aria-hidden="true" />
      <h1 className="text-xl font-semibold mb-2">{m.title}</h1>
      <p className="text-sm opacity-70 max-w-sm">{m.body}</p>
    </div>
  );
}