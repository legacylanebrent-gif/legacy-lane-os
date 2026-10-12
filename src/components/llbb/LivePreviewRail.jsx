// Live preview rail (Phase 4B — Part 25). Renders the SAME certified Template
// #1 components through the authenticated site_preview seam — never a fake
// renderer. Device widths (desktop/tablet/mobile) scale inside the rail.
import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { getTemplate } from '@/templates/registry';
import TemplateErrorState from '@/templates/operatorTemplate1/TemplateErrorState';
import { Loader2, Monitor, Smartphone } from 'lucide-react';

const DEVICES = [
  ['desktop', 'Desktop', Monitor, 1024],
  ['tablet', 'Tablet', Monitor, 820],
  ['mobile', 'Mobile', Smartphone, 400]
];

export default function LivePreviewRail({ websiteTenantId, nonce }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [device, setDevice] = useState('desktop');

  useEffect(() => {
    let cancelled = false;
    setError(null);
    (async () => {
      try {
        const r = await base44.functions.invoke('llbbAdmin', { action: 'site_preview', website_tenant_id: websiteTenantId });
        if (!cancelled) setData(r.data);
      } catch (e) { if (!cancelled) setError('Preview unavailable.'); }
    })();
    return () => { cancelled = true; };
  }, [websiteTenantId, nonce]);

  if (error) return <div className="bg-white rounded-lg border border-slate-200 p-6 text-center text-sm text-slate-500">{error}</div>;
  if (!data) return <div className="bg-white rounded-lg border border-slate-200 p-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>;

  const website = data.website;
  const tpl = getTemplate(website && website.template && website.template.id);
  if (!tpl || !website) return <TemplateErrorState kind="unknown_template" />;
  const TemplateComponent = tpl.component;
  const width = (DEVICES.find(d => d[0] === device) || DEVICES[0])[3];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 bg-slate-100 rounded-md p-0.5">
          {DEVICES.map(([key, label, Icon]) => (
            <button key={key} onClick={() => setDevice(key)} aria-label={`${label} preview`}
              className={`p-1.5 rounded ${device === key ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-700'}`}>
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>
        <span className="text-[10px] font-medium text-indigo-600 bg-indigo-50 rounded px-1.5 py-0.5">
          {data.tenant_status === 'active' ? 'Live view' : 'Draft preview'}
        </span>
      </div>
      <div className="border border-slate-200 rounded-lg bg-slate-100 p-2 overflow-hidden">
        <div className="mx-auto bg-white rounded-md shadow-sm overflow-hidden transition-all duration-200" style={{ width: '100%', maxWidth: width }}>
          <div style={{ transformOrigin: 'top left' }}>
            <TemplateComponent pageType="home" website={website} leadContext={data.lead_context} />
          </div>
        </div>
      </div>
    </div>
  );
}