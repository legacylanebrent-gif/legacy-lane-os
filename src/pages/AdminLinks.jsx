import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ADMIN_LINK_SECTIONS } from '@/components/admin/adminLinksData';

export default function AdminLinks() {
  const totalLinks = ADMIN_LINK_SECTIONS.reduce((n, s) => n + s.links.length, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-orange-50 to-cyan-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-serif font-bold text-slate-800">Admin Links</h1>
          <p className="text-slate-500 mt-1">
            Every admin page on one screen, organized by section — {totalLinks} links across {ADMIN_LINK_SECTIONS.length} sections.
          </p>
        </div>

        <div className="space-y-6">
          {ADMIN_LINK_SECTIONS.map(section => (
            <div key={section.title} className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">{section.title}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {section.links.map(link => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.page}
                      to={createPageUrl(link.page)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-md border border-slate-200 bg-slate-50 hover:bg-orange-50 hover:border-orange-300 transition-colors text-sm text-slate-700 hover:text-slate-900"
                    >
                      <Icon className="w-4 h-4 flex-shrink-0 text-orange-600" />
                      <span className="truncate">{link.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}