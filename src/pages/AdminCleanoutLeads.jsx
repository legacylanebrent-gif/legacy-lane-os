import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Truck, MapPin, Clock, RefreshCw, Download, CheckCircle, XCircle, Eye } from 'lucide-react';

const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

const STATUS_COLORS = {
  new: 'bg-blue-100 text-blue-700',
  sent: 'bg-yellow-100 text-yellow-700',
  accepted: 'bg-green-100 text-green-700',
  contacted: 'bg-purple-100 text-purple-700',
  quoted: 'bg-indigo-100 text-indigo-700',
  won: 'bg-emerald-100 text-emerald-700',
  lost: 'bg-red-100 text-red-700',
  closed: 'bg-slate-100 text-slate-600',
};

function DetailDrawer({ lead, onClose, onUpdate }) {
  if (!lead) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div className="w-full max-w-lg bg-white h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="font-bold text-slate-800">Cleanout Lead Detail</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl font-bold">×</button>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Property</h3>
            <p className="font-bold text-slate-900">{lead.property_address}</p>
            <p className="text-slate-600">{lead.city}, {lead.state} {lead.zip}</p>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {[
              ['Source', lead.lead_source],
              ['Timeline', lead.timeline],
              ['Condition', lead.property_condition],
              ['Cleanout Type', lead.cleanout_type],
              ['Status', lead.lead_status],
              ['Vendors Matched', lead.assigned_vendor_ids?.length || 0],
            ].map(([label, val]) => (
              <div key={label}>
                <p className="text-xs text-slate-400 font-semibold uppercase">{label}</p>
                <p className="text-slate-700">{val || '—'}</p>
              </div>
            ))}
          </div>
          {(lead.agent_name || lead.agent_email) && (
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Agent / Contact</h3>
              <p className="text-slate-700">{lead.agent_name}{lead.brokerage ? ` · ${lead.brokerage}` : ''}</p>
              {lead.agent_email && <p className="text-slate-500 text-sm"><a href={`mailto:${lead.agent_email}`} className="text-blue-600 underline">{lead.agent_email}</a></p>}
              {lead.agent_phone && <p className="text-slate-500 text-sm">{lead.agent_phone}</p>}
            </div>
          )}
          {lead.notes && (
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Notes</h3>
              <p className="text-slate-600 text-sm">{lead.notes}</p>
            </div>
          )}
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Update Status</h3>
            <select defaultValue={lead.lead_status}
              onChange={async e => { await base44.entities.CleanoutLead.update(lead.id, { lead_status: e.target.value }); onUpdate(); }}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 bg-white text-slate-800">
              {['new','sent','accepted','contacted','quoted','won','lost','closed'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex gap-3">
            <Button onClick={async () => { await base44.entities.CleanoutLead.update(lead.id, { lead_status: 'won' }); onUpdate(); onClose(); }}
              className="flex-1 bg-green-600 hover:bg-green-700 text-sm"><CheckCircle className="w-4 h-4 mr-1" />Mark Won</Button>
            <Button onClick={async () => { await base44.entities.CleanoutLead.update(lead.id, { lead_status: 'lost' }); onUpdate(); onClose(); }}
              variant="outline" className="flex-1 text-sm border-red-200 text-red-600 hover:bg-red-50"><XCircle className="w-4 h-4 mr-1" />Mark Lost</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminCleanoutLeads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState({ search: '', state: '', timeline: '', condition: '', cleanout_type: '', status: '' });

  const load = useCallback(async () => {
    setLoading(true);
    const data = await base44.entities.CleanoutLead.list('-created_date', 500);
    setLeads(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = leads.filter(l => {
    if (filters.state && l.state !== filters.state) return false;
    if (filters.status && l.lead_status !== filters.status) return false;
    if (filters.timeline && l.timeline !== filters.timeline) return false;
    if (filters.condition && l.property_condition !== filters.condition) return false;
    if (filters.cleanout_type && l.cleanout_type !== filters.cleanout_type) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!l.property_address?.toLowerCase().includes(q) && !l.agent_name?.toLowerCase().includes(q) && !l.city?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const stats = {
    total: leads.length,
    new: leads.filter(l => l.lead_status === 'new').length,
    sent: leads.filter(l => l.lead_status === 'sent').length,
    won: leads.filter(l => l.lead_status === 'won').length,
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Truck className="w-6 h-6 text-green-600 flex-shrink-0" />Cleanout Leads</h1>
          <p className="text-slate-500 text-sm mt-1">Manage property cleanout opportunities</p>
        </div>
        <Button onClick={load} variant="outline" size="sm" className="w-full md:w-auto"><RefreshCw className="w-4 h-4 mr-2" />Refresh</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[['Total', stats.total, 'bg-slate-50 border-slate-200 text-slate-700'], ['New', stats.new, 'bg-blue-50 border-blue-200 text-blue-700'], ['Sent', stats.sent, 'bg-yellow-50 border-yellow-200 text-yellow-700'], ['Won', stats.won, 'bg-green-50 border-green-200 text-green-700']].map(([label, count, cls]) => (
          <div key={label} className={`${cls.split(' ')[0]} ${cls.split(' ')[1]} rounded-xl p-4`}>
            <p className="text-xs font-semibold text-slate-500 uppercase">{label}</p>
            <p className={`text-2xl font-bold ${cls.split(' ')[2]}`}>{count}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Input placeholder="Search address, agent…" value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} className="col-span-2" />
        <select value={filters.state} onChange={e => setFilters(f => ({ ...f, state: e.target.value }))} className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-sm text-slate-700">
          <option value="">All States</option>
          {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-sm text-slate-700">
          <option value="">All Statuses</option>
          {['new','sent','accepted','contacted','quoted','won','lost','closed'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filters.timeline} onChange={e => setFilters(f => ({ ...f, timeline: e.target.value }))} className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-sm text-slate-700">
          <option value="">All Timelines</option>
          {['Immediately','Within 7 Days','Within 14 Days','Within 30 Days','30+ Days'].map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <select value={filters.cleanout_type} onChange={e => setFilters(f => ({ ...f, cleanout_type: e.target.value }))} className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-sm text-slate-700">
          <option value="">All Types</option>
          {['Whole House','Partial House','Garage','Basement','Attic','Storage Unit','Rental Property','Estate Property'].map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Truck className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>No cleanout leads found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Property', 'State', 'Type', 'Condition', 'Timeline', 'Agent', 'Vendors', 'Status', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(l => (
                  <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800 max-w-[180px] truncate">{l.property_address}</p>
                      <p className="text-xs text-slate-400">{l.city}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{l.state}</td>
                    <td className="px-4 py-3"><Badge className="bg-green-100 text-green-700 text-xs whitespace-nowrap">{l.cleanout_type || '—'}</Badge></td>
                    <td className="px-4 py-3 text-slate-500 text-xs max-w-[100px] truncate">{l.property_condition || '—'}</td>
                    <td className="px-4 py-3"><span className="text-xs text-slate-600">{l.timeline || '—'}</span></td>
                    <td className="px-4 py-3 text-slate-600 text-xs max-w-[120px] truncate">{l.agent_name || '—'}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{l.assigned_vendor_ids?.length || 0}</td>
                    <td className="px-4 py-3"><Badge className={`${STATUS_COLORS[l.lead_status] || 'bg-slate-100'} text-xs`}>{l.lead_status}</Badge></td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="sm" onClick={() => setSelected(l)}><Eye className="w-4 h-4" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && <DetailDrawer lead={selected} onClose={() => setSelected(null)} onUpdate={load} />}
    </div>
  );
}