// Authenticated draft/live preview panel (Phase 4A — Part 5/7).
// Loads the certified runtime view models through the AUTHENTICATED
// site_preview seam (drafts never resolve through the public runtime) and
// renders the platform-controlled template directly.
import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { getTemplate } from '@/templates/registry';
import TemplateErrorState from '@/templates/operatorTemplate1/TemplateErrorState';
import { Loader2, Eye, ShieldCheck } from 'lucide-react';

const PAGES = [
  ['home', 'Home'], ['sales', 'Sales'], ['about', 'About'], ['services', 'Services'],
  ['contact', 'Contact'], ['faq', 'FAQ'], ['legal', 'Legal']
];

export default function ManagerPreviewPanel({ websiteTenantId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [page, setPage] = useState('home');

  useEffect(() => {
    let cancelled = false;
    setData(null); setError(null);
    (async () => {
      try {
        const r = await base44.functions.invoke('llbbAdmin', { action: 'site_preview', website_tenant_id: websiteTenantId });
        if (!cancelled) setData(r.data);
      } catch (e) {
        if (!cancelled) setError('Preview could not be loaded.');
      }
    })();
    return () => { cancelled = true; };
  }, [websiteTenantId]);

  if (error) return <div className="bg-white rounded-lg border border-slate-200 p-8 text-center text-slate-500">{error}</div>;
  if (!data) {
    return <div className="bg-white rounded-lg border border-slate-200 p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  }

  const website = data.website;
  const tpl = getTemplate(website && website.template && website.template.id);
  if (!tpl || !website) return <TemplateErrorState kind="unknown_template" />;
  const TemplateComponent = tpl.component;

  return (
    <div className="space-y-3">
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-2.5 flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-indigo-600 flex-shrink-0" />
        <span className="text-sm text-indigo-800">
          Authenticated preview — {data.tenant_status === 'active' ? 'live site view' : 'draft view'}. Draft websites are not publicly accessible or indexable.
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {PAGES.map(([key, label]) => (
          <button key={key} onClick={() => setPage(key)}
            className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${page === key ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
            {label}
          </button>
        ))}
      </div>
      <div className="border border-slate-200 rounded-lg overflow-hidden bg-white" style={{ minHeight: 480 }}>
        <TemplateComponent pageType={page} website={website} leadContext={data.lead_context} />
      </div>
    </div>
  );
}