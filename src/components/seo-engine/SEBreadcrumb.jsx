import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export default function SEBreadcrumb({ crumbs = [] }) {
  return (
    <nav className="bg-slate-100 px-4 py-2.5 text-sm text-slate-600 border-b border-slate-200">
      <div className="max-w-5xl mx-auto flex items-center gap-1 flex-wrap">
        <Link to="/" className="hover:text-slate-900 flex items-center gap-1">
          <Home className="w-3 h-3" /> Home
        </Link>
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            <ChevronRight className="w-3 h-3 text-slate-400" />
            {c.href ? (
              <Link to={c.href} className="hover:text-slate-900">{c.label}</Link>
            ) : (
              <span className="text-slate-900 font-medium">{c.label}</span>
            )}
          </React.Fragment>
        ))}
      </div>
    </nav>
  );
}