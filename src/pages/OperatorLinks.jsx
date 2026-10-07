import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';
import { OPERATOR_LINK_SECTIONS } from '@/components/operators/operatorLinksData';

// Elite-only marketing pages (mirrors the sidebar gate for Professional tier)
const ELITE_ONLY = new Set(['CampaignBuilder', 'Campaigns', 'Analytics', 'SocialAdsHub']);

export default function OperatorLinks() {
  const [tier, setTier] = useState('checking');

  useEffect(() => {
    const loadTier = async () => {
      try {
        const subs = await base44.entities.Subscription.filter({ user_id: (await base44.auth.me()).id, status: 'active' });
        setTier(subs.length > 0 ? subs[0].tier : null);
      } catch {
        setTier(null);
      }
    };
    loadTier();
  }, []);

  const isElite = tier === 'admin' || tier === 'elite';
  const allowedSections = OPERATOR_LINK_SECTIONS
    .map(s => ({ ...s, links: s.links.filter(l => !l.elite || isElite) }))
    .filter(s => s.links.length > 0);
  const totalLinks = allowedSections.reduce((n, s) => n + s.links.length, 0);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-serif font-bold text-slate-800">Operator Links</h1>
        <p className="text-slate-500 mt-1 text-sm md:text-base">
          Every tool on one screen, organized by section — {totalLinks} links across {allowedSections.length} sections.
        </p>
      </div>

      {tier === 'checking' ? (
        <div className="flex items-center justify-center py-16 text-slate-400 text-sm">
          <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading your tools...
        </div>
      ) : (
        <div className="space-y-6">
          {allowedSections.map(section => (
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
      )}
    </div>
  );
}