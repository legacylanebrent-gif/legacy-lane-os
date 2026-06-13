import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

const ERROR_CATEGORIES = [
  { key: 'uploads', label: 'Failed Uploads', color: 'text-red-400', bgColor: 'bg-red-900/20 border-red-700' },
  { key: 'serp', label: 'Failed Google Lens Searches', color: 'text-orange-400', bgColor: 'bg-orange-900/20 border-orange-700' },
  { key: 'ai', label: 'Failed AI Jobs', color: 'text-yellow-400', bgColor: 'bg-yellow-900/20 border-yellow-700' },
  { key: 'seo', label: 'Failed SEO Jobs', color: 'text-amber-400', bgColor: 'bg-amber-900/20 border-amber-700' },
  { key: 'emails', label: 'Failed Emails', color: 'text-blue-400', bgColor: 'bg-blue-900/20 border-blue-700' },
  { key: 'referrals', label: 'Failed Referrals', color: 'text-purple-400', bgColor: 'bg-purple-900/20 border-purple-700' },
  { key: 'pos', label: 'Failed POS Transactions', color: 'text-pink-400', bgColor: 'bg-pink-900/20 border-pink-700' },
];

const MOCK_ERRORS = {
  uploads: { count: 0, last: null, user: null, sale: null },
  serp: { count: 0, last: null, user: null, sale: null },
  ai: { count: 0, last: null, user: null, sale: null },
  seo: { count: 0, last: null, user: null, sale: null },
  emails: { count: 0, last: null, user: null, sale: null },
  referrals: { count: 0, last: null, user: null, sale: null },
  pos: { count: 0, last: null, user: null, sale: null },
};

export default function ErrorMonitorWidget() {
  const [expanded, setExpanded] = useState(null);
  const totalErrors = Object.values(MOCK_ERRORS).reduce((a, b) => a + b.count, 0);

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <h3 className="text-sm font-black text-white uppercase tracking-widest">Error Monitor</h3>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${totalErrors === 0 ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-700' : 'bg-red-900/40 text-red-400 border border-red-700'}`}>
          {totalErrors === 0 ? '✓ No Errors' : `${totalErrors} Errors`}
        </span>
      </div>
      <div className="space-y-2">
        {ERROR_CATEGORIES.map(({ key, label, color, bgColor }) => {
          const err = MOCK_ERRORS[key];
          const isOpen = expanded === key;
          return (
            <div key={key} className={`rounded-xl border ${bgColor} overflow-hidden`}>
              <button
                onClick={() => setExpanded(isOpen ? null : key)}
                className="w-full flex items-center justify-between px-4 py-3 text-left"
              >
                <div className="flex items-center gap-3">
                  <span className={`text-2xl font-black ${err.count > 0 ? color : 'text-slate-500'}`}>{err.count}</span>
                  <span className="text-sm text-slate-300">{label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {err.count === 0 && <span className="text-xs text-emerald-400 font-semibold">✓ Clean</span>}
                  {isOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                </div>
              </button>
              {isOpen && (
                <div className="px-4 pb-3 pt-0 border-t border-slate-700 mt-0">
                  <div className="grid grid-cols-3 gap-3 text-xs text-slate-400 mt-2">
                    <div>
                      <span className="block text-slate-500">Last Occurrence</span>
                      <span className="text-slate-300">{err.last || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="block text-slate-500">Affected User</span>
                      <span className="text-slate-300">{err.user || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="block text-slate-500">Affected Sale</span>
                      <span className="text-slate-300">{err.sale || 'N/A'}</span>
                    </div>
                  </div>
                  {err.count === 0 && <p className="text-emerald-400 text-xs mt-2">No errors logged for this category.</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}