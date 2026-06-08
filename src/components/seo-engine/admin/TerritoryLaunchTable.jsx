import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Globe, Loader2, Eye, CheckCircle2, XCircle, MapPin } from 'lucide-react';

const STATUS_COLORS = {
  draft: 'bg-slate-100 text-slate-600',
  review: 'bg-yellow-100 text-yellow-700',
  published: 'bg-green-100 text-green-700',
  unpublished: 'bg-red-100 text-red-700',
};

const SITEMAP_COLORS = {
  not_queued: 'bg-slate-100 text-slate-500',
  queued: 'bg-blue-100 text-blue-700',
  submitted: 'bg-green-100 text-green-700',
};

export default function TerritoryLaunchTable({ launches, onRefresh }) {
  const [publishing, setPublishing] = useState({});
  const [expanded, setExpanded] = useState(null);

  const handlePublish = async (id, action) => {
    setPublishing(p => ({ ...p, [id]: true }));
    await base44.functions.invoke('publishTerritoryPages', { territory_launch_id: id, action });
    setPublishing(p => ({ ...p, [id]: false }));
    onRefresh();
  };

  if (!launches?.length) {
    return (
      <div className="text-center py-16 text-slate-400">
        <MapPin className="w-8 h-8 mx-auto mb-3 opacity-40" />
        <p className="text-sm">No territories launched yet.</p>
        <p className="text-xs mt-1">Click "New Territory Launch" to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {launches.map(t => (
        <div key={t.id} className="border border-slate-200 rounded-xl bg-white overflow-hidden">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <p className="font-semibold text-slate-800 text-sm">{t.county}, {t.state}</p>
                <p className="text-xs text-slate-400">{t.county_slug} · {t.pages_created_json?.length || 0} pages</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[t.launch_status] || 'bg-slate-100 text-slate-500'}`}>
                {t.launch_status}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SITEMAP_COLORS[t.sitemap_status] || 'bg-slate-100 text-slate-500'}`}>
                sitemap: {t.sitemap_status}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setExpanded(expanded === t.id ? null : t.id)}
                className="text-xs"
              >
                <Eye className="w-3.5 h-3.5 mr-1" />
                {expanded === t.id ? 'Hide' : 'Pages'}
              </Button>
              {t.launch_status !== 'published' ? (
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white text-xs h-7"
                  disabled={!!publishing[t.id]}
                  onClick={() => handlePublish(t.id, 'publish')}
                >
                  {publishing[t.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <><CheckCircle2 className="w-3 h-3 mr-1" />Publish All</>}
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7 text-red-600 border-red-200 hover:bg-red-50"
                  disabled={!!publishing[t.id]}
                  onClick={() => handlePublish(t.id, 'unpublish')}
                >
                  {publishing[t.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <><XCircle className="w-3 h-3 mr-1" />Unpublish</>}
                </Button>
              )}
            </div>
          </div>

          {/* Provider coverage row */}
          <div className="border-t border-slate-100 px-4 py-2 bg-slate-50 flex flex-wrap gap-2 text-xs text-slate-500">
            {t.assigned_operator_name && <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">🏷 {t.assigned_operator_name}</span>}
            {t.assigned_agent_name && <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">🏡 {t.assigned_agent_name}</span>}
            {t.assigned_cleanout_vendor_name && <span className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full">🧹 {t.assigned_cleanout_vendor_name}</span>}
            {t.assigned_investor_name && <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded-full">💰 {t.assigned_investor_name}</span>}
            {t.routing_rules_created > 0 && <span className="text-slate-400">{t.routing_rules_created} routing rules</span>}
            {t.zip_codes_json?.length > 0 && <span className="text-slate-400">{t.zip_codes_json.length} ZIPs</span>}
            {t.cities_json?.length > 0 && <span className="text-slate-400">{t.cities_json.join(', ')}</span>}
          </div>

          {/* Expanded pages list */}
          {expanded === t.id && t.pages_created_json?.length > 0 && (
            <div className="border-t border-slate-100 p-4 space-y-1">
              {t.pages_created_json.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-mono truncate max-w-xs">
                    {p.url.replace('https://www.estatesalen.com', '')}
                  </a>
                  <span className={`px-2 py-0.5 rounded-full ${STATUS_COLORS[p.status] || 'bg-slate-100 text-slate-500'}`}>
                    {p.page_type} · {p.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}