// Phase 4D (Part 36) — client-safe domain view: the included EstateSalen
// hostname, custom-domain status, and a Connect Domain CTA that stays disabled
// until the publication phase (4E). The approval/publication lifecycle cannot
// be bypassed from here.
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Globe, Link2, Lock } from 'lucide-react';

const STATUS_LABELS = {
  reserved: 'Reserved', verification_pending: 'Verifying', verified: 'Verified',
  provisioning: 'Setting up', active: 'Connected', error: 'Problem', disconnected: 'Disconnected'
};

export default function ClientDomainPanel({ domains }) {
  const d = domains || {};
  const custom = d.custom || [];
  return (
    <div className="space-y-4 max-w-2xl">
      <div className="bg-white rounded-lg border border-slate-200 p-5">
        <div className="font-heading font-bold text-slate-900 flex items-center gap-2"><Globe className="w-4 h-4" /> Website Address</div>
        <p className="text-sm text-slate-500 mt-1">Your website address on EstateSalen is included — no setup needed.</p>
        <div className="mt-3 bg-slate-50 border border-slate-200 rounded-md px-4 py-3 flex items-center gap-2">
          <Link2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <span className="font-medium text-slate-800 truncate">{d.platform_hostname}</span>
          <Badge className="bg-green-100 text-green-700 border border-green-200 ml-auto">Included</Badge>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-5">
        <div className="font-heading font-bold text-slate-900">Custom Domain</div>
        <p className="text-sm text-slate-500 mt-1">Use your own web address (like smithestatesales.com). Connecting a custom domain becomes available when your website is approved and ready to publish.</p>
        {custom.length === 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button disabled variant="outline" size="sm"><Lock className="w-3.5 h-3.5 mr-1.5" /> Connect Custom Domain</Button>
            <span className="text-xs text-slate-400">Available after approval, at publication time.</span>
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100 border border-slate-100 rounded-md">
            {custom.map(c => (
              <li key={c.hostname} className="px-4 py-3 flex items-center justify-between gap-3">
                <span className="font-medium text-slate-800 truncate">{c.hostname}</span>
                <Badge className={c.status === 'active' || c.status === 'verified' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-amber-100 text-amber-800 border border-amber-200'}>
                  {STATUS_LABELS[c.status] || c.status}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}