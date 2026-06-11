import React, { useState } from 'react';
import { CheckCircle2, XCircle, Clock, Minus, ChevronDown, ChevronUp } from 'lucide-react';

const STATUS_CONFIG = {
  pending: { icon: Clock, color: 'text-slate-500', bg: 'bg-slate-700', label: 'Pending' },
  running: { icon: Clock, color: 'text-amber-400', bg: 'bg-amber-900/30', label: 'Running' },
  pass: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-900/30', label: 'Pass' },
  fail: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-900/30', label: 'Fail' },
  skipped: { icon: Minus, color: 'text-slate-500', bg: 'bg-slate-800', label: 'Skipped' },
};

export default function AuditSection({ title, description, sections, weight }) {
  const [checkStatuses, setCheckStatuses] = useState({});
  const [notes, setNotes] = useState({});
  const [times, setTimes] = useState({});
  const [collapsed, setCollapsed] = useState({});

  const allChecks = sections.flatMap(s => s.checks);
  const passed = allChecks.filter(c => checkStatuses[c.label] === 'pass').length;
  const failed = allChecks.filter(c => checkStatuses[c.label] === 'fail').length;
  const total = allChecks.length;
  const pct = total > 0 ? Math.round((passed / total) * 100) : 0;

  const cycleStatus = (label) => {
    const order = ['pending', 'running', 'pass', 'fail', 'skipped'];
    const current = checkStatuses[label] || 'pending';
    const next = order[(order.indexOf(current) + 1) % order.length];
    setCheckStatuses(s => ({ ...s, [label]: next }));
  };

  const markAll = (status) => {
    const newStatuses = {};
    allChecks.forEach(c => { newStatuses[c.label] = status; });
    setCheckStatuses(s => ({ ...s, ...newStatuses }));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
          <div>
            <h2 className="text-lg font-black text-white uppercase tracking-wider">{title}</h2>
            <p className="text-slate-400 text-sm mt-1">{description}</p>
            {weight > 0 && <span className="text-xs text-slate-500 mt-1 block">Scorecard Weight: {weight}%</span>}
          </div>
          <div className="text-right">
            <div className={`text-3xl font-black ${pct === 100 ? 'text-emerald-400' : pct >= 75 ? 'text-amber-400' : 'text-red-400'}`}>{pct}%</div>
            <div className="text-xs text-slate-400">{passed}/{total} passed</div>
          </div>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-2 mb-4">
          <div
            className={`h-2 rounded-full transition-all ${pct === 100 ? 'bg-emerald-500' : pct >= 75 ? 'bg-amber-500' : 'bg-red-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => markAll('pass')} className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition-colors">✓ Mark All Pass</button>
          <button onClick={() => markAll('fail')} className="px-3 py-1.5 bg-red-800 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors">✗ Mark All Fail</button>
          <button onClick={() => markAll('pending')} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-lg transition-colors">↺ Reset All</button>
          {failed > 0 && (
            <span className="px-3 py-1.5 bg-red-900/40 border border-red-700 text-red-400 text-xs font-bold rounded-lg">
              ⚠ {failed} Failed
            </span>
          )}
        </div>
      </div>

      {/* Sections */}
      {sections.map(({ heading, checks }) => {
        const isCollapsed = collapsed[heading];
        const sectionPassed = checks.filter(c => checkStatuses[c.label] === 'pass').length;
        return (
          <div key={heading} className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden">
            <button
              onClick={() => setCollapsed(c => ({ ...c, [heading]: !c[heading] }))}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-bold text-white">{heading}</h3>
                <span className="text-xs text-slate-400">{sectionPassed}/{checks.length}</span>
              </div>
              {isCollapsed ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronUp className="w-4 h-4 text-slate-500" />}
            </button>

            {!isCollapsed && (
              <div className="px-4 pb-4 space-y-2">
                {checks.map(({ label }) => {
                  const status = checkStatuses[label] || 'pending';
                  const cfg = STATUS_CONFIG[status];
                  const Icon = cfg.icon;
                  return (
                    <div key={label} className={`rounded-xl border border-slate-700 ${cfg.bg} p-3`}>
                      <div className="flex items-start gap-3">
                        <button onClick={() => cycleStatus(label)} className="mt-0.5 shrink-0">
                          <Icon className={`w-4 h-4 ${cfg.color}`} />
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-sm text-slate-300">{label}</span>
                            <select
                              value={status}
                              onChange={e => setCheckStatuses(s => ({ ...s, [label]: e.target.value }))}
                              className="bg-slate-700 border border-slate-600 rounded-lg px-2 py-0.5 text-xs text-white focus:outline-none shrink-0"
                            >
                              {Object.entries(STATUS_CONFIG).map(([val, { label: slabel }]) => (
                                <option key={val} value={val}>{slabel}</option>
                              ))}
                            </select>
                          </div>
                          <div className="mt-1.5 flex gap-2">
                            <input
                              type="text"
                              placeholder="Response time (ms)"
                              value={times[label] || ''}
                              onChange={e => setTimes(t => ({ ...t, [label]: e.target.value }))}
                              className="w-28 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-white placeholder:text-slate-600 focus:outline-none"
                            />
                            <input
                              type="text"
                              placeholder="Notes..."
                              value={notes[label] || ''}
                              onChange={e => setNotes(n => ({ ...n, [label]: e.target.value }))}
                              className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-white placeholder:text-slate-600 focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}