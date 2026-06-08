import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle } from 'lucide-react';

const CATEGORY_COLORS = {
  'Documents to Gather':         'bg-blue-100 text-blue-700',
  'People to Contact':           'bg-purple-100 text-purple-700',
  'Property to Identify':        'bg-cyan-100 text-cyan-700',
  'Belongings: Sort / Keep / Sell / Donate / Discard': 'bg-green-100 text-green-700',
  'When to Call an Estate Sale Company': 'bg-amber-100 text-amber-700',
  'When to Call a Realtor':      'bg-orange-100 text-orange-700',
  'When to Consider Cleanout Services': 'bg-rose-100 text-rose-700',
  'When to Consider an Investor Cash Offer': 'bg-emerald-100 text-emerald-700',
  'Final Steps & Notes':         'bg-slate-100 text-slate-700',
  'Immediate Steps':             'bg-red-100 text-red-700',
  'Legal':                       'bg-purple-100 text-purple-700',
  'Asset Management':            'bg-amber-100 text-amber-700',
  'Real Estate':                 'bg-cyan-100 text-cyan-700',
  'Estate Sale':                 'bg-yellow-100 text-yellow-700',
  'Closing the Estate':          'bg-slate-100 text-slate-700',
};

function colorForCategory(cat) {
  return CATEGORY_COLORS[cat] || 'bg-slate-100 text-slate-600';
}

export default function ChecklistViewer({ items, title }) {
  const [checked, setChecked] = useState({});
  const toggle = (i) => setChecked(p => ({ ...p, [i]: !p[i] }));

  const categories = [...new Set(items.map(i => i.category))];
  const completedCount = Object.values(checked).filter(Boolean).length;
  const pct = items.length ? Math.round((completedCount / items.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="bg-slate-50 rounded-xl p-5 flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-600">Your Progress</p>
          <p className="text-2xl font-bold text-slate-900">{completedCount} / {items.length} steps</p>
        </div>
        <div className="w-20 h-20 relative">
          <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="3" />
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f59e0b" strokeWidth="3"
              strokeDasharray={`${pct} 100`} />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-700">{pct}%</span>
        </div>
      </div>

      {/* Items by category */}
      {categories.map(cat => (
        <div key={cat}>
          <h3 className="text-base font-bold text-slate-800 mb-3">
            <Badge className={colorForCategory(cat)}>{cat}</Badge>
          </h3>
          <div className="space-y-2">
            {items.filter(item => item.category === cat).map((item, idx) => {
              const key = `${cat}-${idx}`;
              return (
                <div key={key} onClick={() => toggle(key)}
                  className={`flex gap-4 p-4 rounded-xl border cursor-pointer transition-all select-none ${checked[key] ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                  <div className="flex-shrink-0 mt-0.5">
                    {checked[key]
                      ? <CheckCircle2 className="w-5 h-5 text-green-600" />
                      : <Circle className="w-5 h-5 text-slate-300" />}
                  </div>
                  <div>
                    <p className={`font-semibold text-sm ${checked[key] ? 'text-green-800 line-through' : 'text-slate-900'}`}>
                      {item.task}
                      {item.priority === 'high' && <span className="ml-2 text-xs font-normal text-red-500 no-underline">● High priority</span>}
                    </p>
                    {item.description && <p className="text-xs text-slate-500 mt-1">{item.description}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div className="text-xs text-slate-400 border-t pt-4">
        <strong>Disclaimer:</strong> This checklist is for educational purposes only. EstateSalen does not provide legal, tax, or financial advice. Laws and procedures vary by state and county. Always confirm requirements with your local court or a licensed attorney.
      </div>
    </div>
  );
}