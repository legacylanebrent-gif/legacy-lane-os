import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const DEFAULT_ROUTING = [
  { lead_type: 'Estate Sale Leads', routing_enabled: true, destination_exists: true, territory_matching_enabled: true, notification_enabled: true, status: 'Active' },
  { lead_type: 'Reseller Leads', routing_enabled: true, destination_exists: true, territory_matching_enabled: true, notification_enabled: true, status: 'Active' },
  { lead_type: 'Buyout Leads', routing_enabled: true, destination_exists: true, territory_matching_enabled: false, notification_enabled: false, status: 'Partial' },
  { lead_type: 'Cleanout Leads', routing_enabled: true, destination_exists: true, territory_matching_enabled: true, notification_enabled: true, status: 'Active' },
  { lead_type: 'Agent Referral Leads', routing_enabled: false, destination_exists: false, territory_matching_enabled: false, notification_enabled: false, status: 'Missing' },
  { lead_type: 'Vendor Leads', routing_enabled: false, destination_exists: false, territory_matching_enabled: false, notification_enabled: false, status: 'Missing' },
];

const Bool = ({ val }) => val ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-400" />;
const StatusBadge = ({ status }) => {
  const map = { Active: 'bg-green-100 text-green-700', Partial: 'bg-yellow-100 text-yellow-700', Missing: 'bg-red-100 text-red-700' };
  return <Badge className={`text-xs ${map[status] || 'bg-slate-100'}`}>{status}</Badge>;
};

export default function LeadRoutingAudit({ onScoreUpdate }) {
  const [rows, setRows] = useState(DEFAULT_ROUTING);
  const BOOL_FIELDS = ['routing_enabled','destination_exists','territory_matching_enabled','notification_enabled'];
  const LABELS = ['Routing Enabled','Destination Exists','Territory Matching','Notification'];

  React.useEffect(() => {
    const active = rows.filter(r => r.status === 'Active').length;
    onScoreUpdate?.({ active, total: rows.length });
  }, [rows]);

  const toggle = (idx, field) => setRows(prev => prev.map((r, i) => {
    if (i !== idx) return r;
    const updated = { ...r, [field]: !r[field] };
    const allTrue = BOOL_FIELDS.every(f => updated[f]);
    const allFalse = BOOL_FIELDS.every(f => !updated[f]);
    updated.status = allTrue ? 'Active' : allFalse ? 'Missing' : 'Partial';
    return updated;
  }));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-bold text-slate-800">Lead Routing Audit</h3>
        <span className="text-xs text-slate-400">{rows.filter(r => r.status === 'Active').length}/{rows.length} active</span>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Lead Type</th>
              {LABELS.map(l => <th key={l} className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">{l}</th>)}
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r, idx) => (
              <tr key={r.lead_type} className={`${r.status === 'Missing' ? 'bg-red-50/40' : r.status === 'Partial' ? 'bg-yellow-50/30' : 'hover:bg-slate-50'} transition-colors`}>
                <td className="px-4 py-3 font-medium text-slate-800">{r.lead_type}</td>
                {BOOL_FIELDS.map(field => (
                  <td key={field} className="px-4 py-3 text-center cursor-pointer" onClick={() => toggle(idx, field)}>
                    <Bool val={r[field]} />
                  </td>
                ))}
                <td className="px-4 py-3 text-center"><StatusBadge status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}