import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, ExternalLink, Edit2, Save } from 'lucide-react';

const DEFAULT_PAGES = [
  { page_name: 'Estate Sale Company Owner Claim Page', page_url: '/claim-business', page_status: 'Built', form_connected: true, thank_you_page_exists: false, crm_capture_exists: true, operator_notification_exists: true, email_notification_exists: true, retargeting_capture_exists: false },
  { page_name: 'Agent Estate Sale Request', page_url: '/agent-listing-estate-sale-request', page_status: 'Built', form_connected: true, thank_you_page_exists: true, crm_capture_exists: true, operator_notification_exists: true, email_notification_exists: true, retargeting_capture_exists: false },
  { page_name: 'Reseller Network', page_url: '/reseller-network', page_status: 'Built', form_connected: true, thank_you_page_exists: false, crm_capture_exists: true, operator_notification_exists: false, email_notification_exists: true, retargeting_capture_exists: false },
  { page_name: 'Cleanout Network', page_url: '/cleanout-network', page_status: 'Built', form_connected: true, thank_you_page_exists: false, crm_capture_exists: true, operator_notification_exists: true, email_notification_exists: true, retargeting_capture_exists: false },
  { page_name: 'Estate Sale Company Owner Trial Page', page_url: '/Estate Sale Company Owner-trial', page_status: 'Not Built', form_connected: false, thank_you_page_exists: false, crm_capture_exists: false, operator_notification_exists: false, email_notification_exists: false, retargeting_capture_exists: false },
  { page_name: 'Estate Sale Company Owner Referral Page', page_url: '/Estate Sale Company Owner-referral', page_status: 'Not Built', form_connected: false, thank_you_page_exists: false, crm_capture_exists: false, operator_notification_exists: false, email_notification_exists: false, retargeting_capture_exists: false },
  { page_name: 'Agent Referral Page', page_url: '/agent-referral', page_status: 'Not Built', form_connected: false, thank_you_page_exists: false, crm_capture_exists: false, operator_notification_exists: false, email_notification_exists: false, retargeting_capture_exists: false },
  { page_name: 'Directory Listing Page', page_url: '/estate-sale-companies', page_status: 'Built', form_connected: false, thank_you_page_exists: false, crm_capture_exists: false, operator_notification_exists: false, email_notification_exists: false, retargeting_capture_exists: false },
  { page_name: 'Lead Opportunity Dashboard', page_url: '/PropstreamREListings', page_status: 'Built', form_connected: true, thank_you_page_exists: false, crm_capture_exists: true, operator_notification_exists: true, email_notification_exists: false, retargeting_capture_exists: false },
];

const Bool = ({ val }) => val
  ? <CheckCircle className="w-4 h-4 text-green-500" />
  : <XCircle className="w-4 h-4 text-red-400" />;

const StatusBadge = ({ status }) => {
  const map = { 'Built': 'bg-green-100 text-green-700', 'Published': 'bg-blue-100 text-blue-700', 'Not Built': 'bg-red-100 text-red-700' };
  return <Badge className={`text-xs ${map[status] || 'bg-slate-100 text-slate-600'}`}>{status}</Badge>;
};

export default function LandingPageAudit({ onScoreUpdate }) {
  const [pages, setPages] = useState(DEFAULT_PAGES);
  const [editing, setEditing] = useState(null);

  React.useEffect(() => {
    const built = pages.filter(p => p.page_status !== 'Not Built').length;
    const formConn = pages.filter(p => p.form_connected).length;
    onScoreUpdate?.({ built, formConn, total: pages.length });
  }, [pages]);

  const toggleField = (idx, field) => {
    setPages(prev => prev.map((p, i) => i === idx ? { ...p, [field]: !p[field] } : p));
  };

  const BOOL_FIELDS = ['form_connected', 'thank_you_page_exists', 'crm_capture_exists', 'operator_notification_exists', 'email_notification_exists', 'retargeting_capture_exists'];
  const LABELS = ['Form', 'Thank You', 'CRM', 'Op. Notify', 'Email', 'Retargeting'];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-bold text-slate-800">Landing Page Audit</h3>
        <span className="text-xs text-slate-400">{pages.filter(p => p.page_status !== 'Not Built').length}/{pages.length} pages built</span>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Page</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
              {LABELS.map(l => <th key={l} className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">{l}</th>)}
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pages.map((p, idx) => (
              <tr key={p.page_name} className={`${p.page_status === 'Not Built' ? 'bg-red-50/40' : 'hover:bg-slate-50'} transition-colors`}>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-800">{p.page_name}</p>
                  <a href={p.page_url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 flex items-center gap-1 hover:underline">
                    {p.page_url} <ExternalLink className="w-3 h-3" />
                  </a>
                </td>
                <td className="px-4 py-3">
                  {editing === idx ? (
                    <select value={p.page_status}
                      onChange={e => { setPages(prev => prev.map((pg, i) => i === idx ? { ...pg, page_status: e.target.value } : pg)); }}
                      className="border border-slate-300 rounded px-2 py-1 text-xs bg-white">
                      {['Not Built','Built','Published'].map(s => <option key={s}>{s}</option>)}
                    </select>
                  ) : <StatusBadge status={p.page_status} />}
                </td>
                {BOOL_FIELDS.map(field => (
                  <td key={field} className="px-3 py-3 text-center cursor-pointer" onClick={() => toggleField(idx, field)}>
                    <Bool val={p[field]} />
                  </td>
                ))}
                <td className="px-4 py-3">
                  {editing === idx
                    ? <Save className="w-4 h-4 text-green-600 cursor-pointer" onClick={() => setEditing(null)} />
                    : <Edit2 className="w-4 h-4 text-slate-400 hover:text-slate-600 cursor-pointer" onClick={() => setEditing(idx)} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}