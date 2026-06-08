import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

/**
 * Visible breadcrumb nav + injects BreadcrumbList JSON-LD.
 * crumbs = [{ label, href? }]   (last item has no href)
 */
export default function SEOBreadcrumb({ crumbs }) {
  if (!crumbs?.length) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center flex-wrap gap-1 text-sm text-slate-500 mb-4">
      {crumbs.map((crumb, idx) => (
        <React.Fragment key={idx}>
          {idx > 0 && <ChevronRight className="w-3 h-3 text-slate-400 flex-shrink-0" />}
          {crumb.href ? (
            <Link to={crumb.href} className="hover:text-orange-600 transition-colors">
              {crumb.label}
            </Link>
          ) : (
            <span className="text-slate-800 font-medium">{crumb.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}