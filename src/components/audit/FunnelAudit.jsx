import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Edit2, Save } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const DEFAULT_FUNNELS = [
  { landing_page: 'Agent Estate Sale Request', form_submission_connected: true, database_write_connected: true, superagent_trigger_connected: true, operator_notification_connected: true, email_notification_connected: true, thank_you_page_connected: true, status: 'Complete' },
  { landing_page: 'Operator Claim Page', form_submission_connected: true, database_write_connected: true, superagent_trigger_connected: false, operator_notification_connected: true, email_notification_connected: false, thank_you_page_connected: false, status: 'Partial' },
  { landing_page: 'Reseller Network', form_submission_connected: true, database_write_connected: true, superagent_trigger_connected: false, operator_notification_connected: false, email_notification_connected: true, thank_you_page_connected: false, status: 'Partial' },
  { landing_page: 'Cleanout Network', form_submission_connected: true, database_write_connected: true, superagent_trigger_connected: false, operator_notification_connected: true, email_notification_connected: true, thank_you_page_connected: false, status: 'Partial' },
  { landing_page: 'Operator Trial Page', form_submission_connected: false, database_write_connected: false, superagent_trigger_connected: false, operator_notification_connected: false, email_notification_connected: false, thank_you_page_connected: false, status: 'Missing' },
  { landing_page: 'Agent Referral Page', form_submission_connected: false, database_write_connected: false, superagent_trigger_connected: false, operator_notification_connected: false, email_notification_connected: false, thank_you_page_connected: false, status: 'Missing' },
];

const BOOL_FIELDS = ['form_submission_connected','database_write_connected','superagent_trigger_connected','operator_notification_connected','email_notification_connected','thank_you_page_connected'];
const LABELS = ['Form','DB Write','SuperAgent','Op. Notify','Email','Thank You'];

const Bool = ({ val }) => val
  ? <CheckCircle className="w-4 h-4 text-green-500" />
  : <XCircle className="w-4 h-4 text-red-400" />;

const StatusBadge = ({ status }) => {
  const map = { Complete: 'bg-green-100 text-green-700', Partial: 'bg-yellow-100 text-yellow-700', Missing: 'bg-red-100 text-red-700' };
  return <Badge className={`text-xs ${map[status] || 'bg-slate-100 text-slate-600'}`}>{status}</Badge>;
};

export default function FunnelAudit({ onScoreUpdate }) {
  const [funnels, setFunnels] = useState(DEFAULT_FUNNELS);
  const [editing, setEditing] = useState(null);

  React.useEffect(() => {
    const complete = funnels.filter(f => f.status === 'Complete').length;
    onScoreUpdate?.({ complete, total: funnels.length });
  }, [funnels]);

  const toggle = (idx, field) => setFunnels(prev => prev.map((f, i) => {
    if (i !== idx) return f;
    const updated = { ...f, [field]: !f[field] };
    const allTrue = BOOL_FIELDS.every(bf => updated[bf]);
    const allFalse = BOOL_FIELDS.every(bf => !updated[bf]);
    updated.status = allTrue ? 'Complete' : allFalse ? 'Missing' : 'Partial';
    return updated;
  }));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-bold text-slate-800">Funnel Audit</h3>
        <span className="text-xs text-slate-400">{funnels.filter(f => f.status === 'Complete').length}/{funnels.length} complete</span>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm min-w-[800px]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Landing Page</th>
              {LABELS.map(l => <th key={l} className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">{l}</th>)}
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {funnels.map((f, idx) => (
              <tr key={f.landing_page} className={`${f.status === 'Missing' ? 'bg-red-50/40' : f.status === 'Partial' ? 'bg-yellow-50/30' : 'hover:bg-slate-50'} transition-colors`}>
                <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">{f.landing_page}</td>
                {BOOL_FIELDS.map(field => (
                  <td key={field} className="px-3 py-3 text-center cursor-pointer" onClick={() => toggle(idx, field)}>
                    <Bool val={f[field]} />
                  </td>
                ))}
                <td className="px-4 py-3 text-center"><StatusBadge status={f.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}