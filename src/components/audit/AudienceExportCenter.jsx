import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Users, Loader } from 'lucide-react';

const AUDIENCE_SOURCES = [
  { key: 'all', label: 'Master Audience', color: 'bg-slate-100 text-slate-700' },
  { key: 'operator_claim', label: 'Operator Audience', color: 'bg-blue-100 text-blue-700' },
  { key: 'agent_estate_sale_request', label: 'Agent / Estate Sale', color: 'bg-orange-100 text-orange-700' },
  { key: 'reseller_request', label: 'Reseller Audience', color: 'bg-purple-100 text-purple-700' },
  { key: 'cleanout_request', label: 'Cleanout Audience', color: 'bg-green-100 text-green-700' },
  { key: 'agent_referral', label: 'Agent Referral', color: 'bg-pink-100 text-pink-700' },
  { key: 'free_trial', label: 'Free Trial', color: 'bg-yellow-100 text-yellow-700' },
  { key: 'directory_claim', label: 'Directory Claim', color: 'bg-cyan-100 text-cyan-700' },
];

const CSV_FIELDS = ['first_name','last_name','email','phone','city','state','zip','lead_source','lead_type','created_date','status','territory','assigned_operator','assigned_agent'];
const META_FIELDS = ['email','phone','first_name','last_name','city','state','zip'];
const GOOGLE_FIELDS = ['email','phone','first_name','last_name','state','zip'];

function toCSV(rows, fields) {
  const header = fields.join(',');
  const data = rows.map(r => fields.map(f => `"${(r[f] || '').toString().replace(/"/g, '""')}"`).join(','));
  return [header, ...data].join('\n');
}

function downloadCSV(content, filename) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function AudienceExportCenter({ onScoreUpdate }) {
  const [audiences, setAudiences] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.RetargetingAudience.list('-created_date', 2000);
    setAudiences(data);
    const c = { all: data.length };
    AUDIENCE_SOURCES.slice(1).forEach(s => { c[s.key] = data.filter(d => d.lead_source === s.key).length; });
    setCounts(c);
    onScoreUpdate?.({ captured: data.length > 0 ? 1 : 0, total: 1 });
    setLoading(false);
  };

  const exportAudience = (sourceKey, filename, fields) => {
    const rows = sourceKey === 'all' ? audiences : audiences.filter(a => a.lead_source === sourceKey);
    downloadCSV(toCSV(rows, fields || CSV_FIELDS), filename);
  };

  const exportMeta = () => {
    downloadCSV(toCSV(audiences, META_FIELDS), 'meta_custom_audience.csv');
  };

  const exportGoogle = () => {
    const rows = audiences.map(a => ({ ...a, country: 'US' }));
    downloadCSV(toCSV(rows, GOOGLE_FIELDS), 'google_customer_match.csv');
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-bold text-slate-800 mb-1">Retargeting Audience Center</h3>
        <p className="text-slate-500 text-sm">Every form submission automatically builds these audiences for retargeting.</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-slate-400 py-4"><Loader className="w-4 h-4 animate-spin" />Loading audiences…</div>
      ) : (
        <>
          {/* Audience overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {AUDIENCE_SOURCES.map(s => (
              <div key={s.key} className="bg-white rounded-xl border border-slate-200 p-4">
                <Badge className={`text-xs mb-2 ${s.color}`}>{s.label}</Badge>
                <p className="text-2xl font-bold text-slate-800">{counts[s.key] || 0}</p>
                <p className="text-xs text-slate-400">contacts</p>
              </div>
            ))}
          </div>

          {/* Standard exports */}
          <div>
            <h4 className="font-semibold text-slate-700 mb-3 text-sm">CSV Export Center</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {AUDIENCE_SOURCES.map(s => (
                <button key={s.key} onClick={() => exportAudience(s.key, `${s.label.toLowerCase().replace(/\s+/g,'-')}.csv`)}
                  className="flex items-center gap-2 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 transition-colors">
                  <Download className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  Export {s.label}
                </button>
              ))}
              <button onClick={() => exportAudience('all', 'all-leads.csv')}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl px-4 py-3 text-sm font-medium transition-colors">
                <Download className="w-4 h-4 flex-shrink-0" />
                Export All Leads
              </button>
            </div>
          </div>

          {/* Ad platform exports */}
          <div>
            <h4 className="font-semibold text-slate-700 mb-3 text-sm">Ad Platform Exports</h4>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={exportMeta}
                className="flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 py-4 font-semibold transition-colors">
                <Download className="w-5 h-5" />
                <div className="text-left">
                  <p className="text-sm font-bold">Meta Custom Audience</p>
                  <p className="text-xs opacity-80">email, phone, name, city, state, zip</p>
                </div>
              </button>
              <button onClick={exportGoogle}
                className="flex items-center gap-3 bg-green-600 hover:bg-green-700 text-white rounded-xl px-5 py-4 font-semibold transition-colors">
                <Download className="w-5 h-5" />
                <div className="text-left">
                  <p className="text-sm font-bold">Google Customer Match</p>
                  <p className="text-xs opacity-80">email, phone, name, country, zip</p>
                </div>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}