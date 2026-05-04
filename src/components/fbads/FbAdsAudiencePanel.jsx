import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, RefreshCw, Loader2, Plus, Lock } from 'lucide-react';

const STAGE_COLORS = {
  future_operator: 'bg-blue-100 text-blue-700',
  facebook_lead: 'bg-purple-100 text-purple-700',
  contacted: 'bg-amber-100 text-amber-700',
  demo_scheduled: 'bg-cyan-100 text-cyan-700',
  converted: 'bg-green-100 text-green-700',
};

export default function FbAdsAudiencePanel({ settings }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newLead, setNewLead] = useState({ owner_name: '', company_name: '', email: '', phone: '', state: 'NJ', source: 'manual' });

  useEffect(() => { loadLeads(); }, []);

  const loadLeads = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.FutureOperatorLead.list('-created_at', 100);
      setLeads(data);
    } catch (_) { setLeads([]); }
    setLoading(false);
  };

  const handleSync = async () => {
    if (!settings?.allow_meta_audience_sync) {
      setFeedback('Meta audience sync is disabled. Enable it in Admin Settings → Facebook Ads section.');
      return;
    }
    setSyncing(true);
    setFeedback('');
    try {
      const res = await base44.functions.invoke('syncFutureOperatorCustomAudience', {});
      setFeedback(`✓ Synced ${res.data.synced} leads to Meta audience "${res.data.audience_name}"`);
      await loadLeads();
    } catch (e) {
      setFeedback('Sync error: ' + (e?.response?.data?.error || e.message));
    }
    setSyncing(false);
  };

  const handleAddLead = async () => {
    if (!newLead.email && !newLead.phone) return;
    const now = new Date().toISOString();
    await base44.entities.FutureOperatorLead.create({ ...newLead, lead_stage: 'future_operator', audience_sync_status: 'not_synced', created_at: now, updated_at: now });
    setNewLead({ owner_name: '', company_name: '', email: '', phone: '', state: 'NJ', source: 'manual' });
    setShowAdd(false);
    await loadLeads();
  };

  const syncedCount = leads.filter(l => l.audience_sync_status === 'synced').length;

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Leads', value: leads.length, color: 'bg-blue-50 border-blue-200 text-blue-700' },
          { label: 'Synced to Meta', value: syncedCount, color: 'bg-green-50 border-green-200 text-green-700' },
          { label: 'Not Synced', value: leads.length - syncedCount, color: 'bg-amber-50 border-amber-200 text-amber-700' },
          { label: 'Facebook Leads', value: leads.filter(l => l.source === 'facebook_lead_ad').length, color: 'bg-purple-50 border-purple-200 text-purple-700' },
        ].map((s, i) => (
          <div key={i} className={`rounded-lg border p-3 ${s.color}`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs font-medium mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" onClick={handleSync} disabled={syncing || !settings?.allow_meta_audience_sync}
          className={`text-xs font-bold ${settings?.allow_meta_audience_sync ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
          {syncing ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Syncing...</> : <><Users className="w-3.5 h-3.5 mr-1.5" />Sync to Meta Audience</>}
        </Button>
        {!settings?.allow_meta_audience_sync && <span className="text-xs text-slate-400 flex items-center gap-1"><Lock className="w-3 h-3" />Enable in Settings</span>}
        <Button size="sm" variant="ghost" onClick={() => setShowAdd(s => !s)} className="text-slate-600 text-xs">
          <Plus className="w-3.5 h-3.5 mr-1" />Add Lead
        </Button>
        <Button size="sm" variant="ghost" onClick={loadLeads} className="text-slate-500 text-xs">
          <RefreshCw className="w-3.5 h-3.5 mr-1" />Refresh
        </Button>
      </div>

      {feedback && (
        <div className={`p-3 rounded-lg border text-sm ${feedback.startsWith('✓') ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {feedback}<button onClick={() => setFeedback('')} className="ml-2 text-xs opacity-50 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Add Lead Form */}
      {showAdd && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest">Add Future Operator Lead</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { key: 'owner_name', label: 'Owner Name' },
              { key: 'company_name', label: 'Company Name' },
              { key: 'email', label: 'Email' },
              { key: 'phone', label: 'Phone' },
              { key: 'state', label: 'State' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs text-slate-400 block mb-1">{f.label}</label>
                <Input value={newLead[f.key]} onChange={e => setNewLead(p => ({ ...p, [f.key]: e.target.value }))} className="text-sm bg-white" />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAddLead} className="bg-blue-600 hover:bg-blue-700 text-white text-xs">Add Lead</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)} className="text-slate-500 text-xs">Cancel</Button>
          </div>
        </div>
      )}

      {/* Leads Table */}
      {loading ? (
        <div className="text-center py-8 text-slate-400 text-sm">Loading audience leads...</div>
      ) : leads.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-sm">No leads yet. Add manually or import from Facebook Lead Ads.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Name', 'Company', 'Email', 'State', 'Stage', 'Meta Sync', 'Source'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-slate-500 font-semibold uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {leads.map(lead => (
                <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-3 py-2.5 text-slate-700 font-medium">{lead.owner_name || '—'}</td>
                  <td className="px-3 py-2.5 text-slate-600">{lead.company_name || '—'}</td>
                  <td className="px-3 py-2.5 text-slate-500">{lead.email || '—'}</td>
                  <td className="px-3 py-2.5 text-slate-500">{lead.state || '—'}</td>
                  <td className="px-3 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STAGE_COLORS[lead.lead_stage] || 'bg-slate-100 text-slate-500'}`}>{lead.lead_stage}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${lead.audience_sync_status === 'synced' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>{lead.audience_sync_status}</span>
                  </td>
                  <td className="px-3 py-2.5 text-slate-400">{lead.source || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}