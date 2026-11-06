import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { createPageUrl } from '@/utils';

/**
 * Consistent "back to My Estate Sales" control for pages that are reached
 * from the My Estate Sales action buttons (My Sale Day, Calendar, Workload, etc.).
 */
export default function BackToMySales({ label = 'Back to My Estate Sales', className = '' }) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate(createPageUrl('MySales'))}
      className={`inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors ${className}`}
    >
      <ArrowLeft className="w-4 h-4 flex-shrink-0" />
      {label}
    </button>
  );
}