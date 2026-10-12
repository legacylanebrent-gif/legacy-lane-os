// Phase 4E (Parts 5-12) — admin domain management panel. Everything goes
// through the certified websiteDomainAdmin seam: connect, DNS instructions,
// verify, set primary, disconnect. The platform hostname is included and never
// managed from here.
import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Globe, Link2, Loader2, Plus, Star, Unplug, Copy, CheckCircle2 } from 'lucide-react';

const STATUS_BADGE = {
  reserved: 'bg-slate-100 text-slate-700 border border-slate-200',
  verification_pending: 'bg-amber-100 text-amber-800 border border-amber-200',
  verified: 'bg-blue-100 text-blue-800 border border-blue-200',
  provisioning: 'bg-blue-100 text-blue-800 border border-blue-200',
  active: 'bg-green-100 text-green-700 border border-green-200',
  error: 'bg-red-100 text-red-700 border border-red-200',
  disconnected: 'bg-slate-100 text-slate-500 border border-slate-200'
};
const STATUS_LABEL = {
  reserved: 'Reserved', verification_pending: 'Verifying', verified: 'Verified',
  provisioning: 'Setting up', active: 'Connected', error: 'Problem', disconnected: 'Disconnected'
};

export default function DomainsManagerPanel({ websiteTenantId, domains, includedHostname }) {
  const [list, setList] = useState(domains || []);
  const [adding, setAdding] = useState(false);
  const [host, setHost] = useState('');
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const [instructions, setInstructions] = useState(null);

  const load = async () => {
    try {
      const res = await base44.functions.invoke('websiteDomainAdmin', { action: 'list', website_tenant_id: websiteTenantId });
      setList(res.data.domains || []);
    } catch (e) { /* keep current list */ }
  };

  const connect = async () => {
    if (!host.trim()) return;
    setBusy('connect'); setError(null);
    try {
      const res = await base44.functions.invoke('websiteDomainAdmin', { action: 'connect_custom', website_tenant_id: websiteTenantId, hostname: host.trim().toLowerCase() });
      setHost(''); setAdding(false);
      await load();
      const created = res.data && res.data.domain;
      if (created) showInstructions(created);
    } catch (e) {
      const d = e.response && e.response.data && e.response.data.error;
      setError((d && d.message) || 'Could not add this domain.');
    }
    setBusy(null);
  };

  const showInstructions = async (domain) => {
    try {
      const res = await base44.functions.invoke('websiteDomainAdmin', { action: 'dns_instructions', domain_id: domain.id });
      setInstructions(res.data);
    } catch (e) { setError('Could not load DNS instructions.'); }
  };

  const verify = async (d) => {
    setBusy(d.id); setError(null);
    try {
      await base44.functions.invoke('websiteDomainAdmin', { action: 'verify', domain_id: d.id });
      await load();
    } catch (e) {
      const r = e.response && e.response.data;
      const det = r && r.detail ? ` — ${r.detail}` : '';
      setError(`Verification not complete yet${det}`);
    }
    setBusy(null);
  };

  const setPrimary = async (d) => {
    setBusy(d.id); setError(null);
    try {
      await base44.functions.invoke('websiteDomainAdmin', { action: 'set_primary', domain_id: d.id });
      await load();
    } catch (e) { setError('Could not set primary.'); }
    setBusy(null);
  };

  const disconnect = async (d) => {
    setBusy(d.id); setError(null);
    try {
      await base44.functions.invoke('websiteDomainAdmin', { action: 'disconnect', domain_id: d.id, reason: 'disconnected by admin' });
      setInstructions(null);
      await load();
    } catch (e) { setError('Could not disconnect.'); }
    setBusy(null);
  };

  const custom = list.filter(d => d.domain_type === 'custom_domain');
  const platform = list.find(d => d.domain_type === 'platform_subdomain');

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="bg-white rounded-lg border border-slate-200 p-5">
        <div className="font-heading font-bold text-slate-900 flex items-center gap-2"><Globe className="w-4 h-4" /> Domains</div>
        <p className="text-sm text-slate-500 mt-1">The included EstateSalen hostname is permanent. Custom domains connect as additional addresses with your own DNS.</p>
        {platform && (
          <div className="mt-3 bg-slate-50 border border-slate-200 rounded-md px-4 py-3 flex items-center gap-2">
            <Link2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span className="font-medium text-slate-800 truncate">{platform.hostname}</span>
            <Badge className={`${STATUS_BADGE[platform.status]} ml-auto`}>{platform.is_primary ? 'Primary · Included' : 'Included'}</Badge>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="font-heading font-bold text-slate-900">Custom Domains</div>
          {!adding && <Button size="sm" variant="outline" onClick={() => { setAdding(true); setInstructions(null); }}><Plus className="w-3.5 h-3.5 mr-1" /> Connect Domain</Button>}
        </div>

        {adding && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Input value={host} onChange={e => setHost(e.target.value)} placeholder="yourdomain.com" className="max-w-xs" />
            <Button size="sm" onClick={connect} disabled={busy === 'connect'}>
              {busy === 'connect' && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />} Add
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setHost(''); }}>Cancel</Button>
          </div>
        )}
        {error && <p className="text-xs text-red-600 mt-2">{error}</p>}

        {custom.length === 0 && !adding ? (
          <p className="text-sm text-slate-500 mt-3">No custom domains connected yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100 border border-slate-100 rounded-md">
            {custom.map(d => (
              <li key={d.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium text-slate-800 truncate flex items-center gap-1.5">
                      <Link2 className="w-3.5 h-3.5 text-slate-400" />{d.hostname}
                      {d.is_primary && <Badge className="bg-indigo-100 text-indigo-800 border border-indigo-200">Primary</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={STATUS_BADGE[d.status]}>{STATUS_LABEL[d.status] || d.status}</Badge>
                    {!d.is_primary && d.status !== 'disconnected' && (
                      <Button size="sm" variant="ghost" onClick={() => setPrimary(d)} disabled={busy === d.id}><Star className="w-3.5 h-3.5 mr-1" /> Make Primary</Button>
                    )}
                    {(d.status === 'verification_pending' || d.status === 'verified' || d.status === 'failed') && (
                      <Button size="sm" variant="outline" onClick={() => verify(d)} disabled={busy === d.id}>
                        {busy === d.id ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1" />} Verify DNS
                      </Button>
                    )}
                    {d.status === 'active' && (
                      <Button size="sm" variant="outline" onClick={() => showInstructions(d)}>DNS</Button>
                    )}
                    {d.status !== 'disconnected' && (
                      <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700" onClick={() => disconnect(d)} disabled={busy === d.id}>
                        <Unplug className="w-3.5 h-3.5 mr-1" /> Disconnect
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {instructions && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
          <div className="font-heading font-bold text-slate-900 text-sm">DNS Setup — {instructions.hostname || (instructions.domain && instructions.domain.hostname)}</div>
          <p className="text-sm text-slate-600 mt-1">Add these records at your domain provider. Verification can take up to 24-48 hours to propagate.</p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-xs bg-white rounded-md border border-blue-200">
              <thead><tr className="text-left text-slate-500 border-b border-blue-100">
                <th className="px-3 py-2 font-medium">Type</th><th className="px-3 py-2 font-medium">Name / Host</th><th className="px-3 py-2 font-medium">Value</th>
              </tr></thead>
              <tbody>
                {(instructions.records || []).map((r, i) => (
                  <tr key={i} className="border-b border-blue-50 last:border-0">
                    <td className="px-3 py-2 font-medium text-slate-800">{r.type}</td>
                    <td className="px-3 py-2 text-slate-700 break-all">{r.name}</td>
                    <td className="px-3 py-2 text-slate-700 break-all flex items-center gap-1">
                      <span className="break-all">{r.value}</span>
                      <button className="text-slate-400 hover:text-slate-700 flex-shrink-0" onClick={() => navigator.clipboard && navigator.clipboard.writeText(r.value)}><Copy className="w-3 h-3" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button size="sm" variant="ghost" className="mt-3" onClick={() => setInstructions(null)}>Close</Button>
        </div>
      )}
    </div>
  );
}