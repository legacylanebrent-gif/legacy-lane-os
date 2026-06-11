import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Target, AlertTriangle, CheckCircle2, Clock, TrendingUp } from 'lucide-react';

const WEIGHTS = [
  { key: 'operator', label: 'Operator Experience', weight: 15 },
  { key: 'sale', label: 'Sale Creation', weight: 15 },
  { key: 'image', label: 'Image Pipeline', weight: 15 },
  { key: 'ai_serp', label: 'AI & SERP Systems', weight: 10 },
  { key: 'seo', label: 'SEO Engine', weight: 10 },
  { key: 'referral', label: 'Referral System', weight: 10 },
  { key: 'pos', label: 'POS Accuracy', weight: 10 },
  { key: 'security', label: 'Security', weight: 10 },
  { key: 'load', label: 'Performance & Load', weight: 5 },
];

const STATUS_MAP = {
  not_started: { score: 0, color: 'bg-slate-600', label: 'Not Started' },
  in_progress: { score: 40, color: 'bg-amber-500', label: 'In Progress' },
  partial: { score: 65, color: 'bg-yellow-400', label: 'Partial' },
  passed: { score: 100, color: 'bg-emerald-500', label: 'Passed' },
  failed: { score: 0, color: 'bg-red-500', label: 'Failed' },
};

const INITIAL_STATUSES = Object.fromEntries(WEIGHTS.map(w => [w.key, 'not_started']));

export default function LaunchReadinessScorecard() {
  const [statuses, setStatuses] = useState(INITIAL_STATUSES);
  const [launchDate, setLaunchDate] = useState('2026-07-01');
  const [notes, setNotes] = useState({});

  const totalScore = Math.round(
    WEIGHTS.reduce((acc, w) => {
      const s = STATUS_MAP[statuses[w.key]] || STATUS_MAP.not_started;
      return acc + (s.score * w.weight) / 100;
    }, 0)
  );

  const getScoreColor = (score) => {
    if (score >= 95) return 'text-emerald-400';
    if (score >= 75) return 'text-amber-400';
    return 'text-red-400';
  };

  const daysUntilLaunch = Math.max(0, Math.ceil((new Date(launchDate) - new Date()) / 86400000));
  const blockingIssues = WEIGHTS.filter(w => statuses[w.key] === 'failed' && w.weight >= 10);

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Target className="w-6 h-6 text-red-400" />
          <div>
            <h2 className="text-lg font-black text-white uppercase tracking-wider">Launch Readiness Score</h2>
            <p className="text-slate-400 text-xs">Target: 95/100 before paid advertising begins</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className={`text-5xl font-black ${getScoreColor(totalScore)}`}>{totalScore}</div>
            <div className="text-xs text-slate-400">/ 100</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-black text-blue-400">{daysUntilLaunch}</div>
            <div className="text-xs text-slate-400">Days Left</div>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-slate-400 mb-1">
          <span>Progress</span><span>{totalScore}/100 (Target: 95)</span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-4 relative overflow-hidden">
          <div
            className={`h-4 rounded-full transition-all duration-500 ${totalScore >= 95 ? 'bg-emerald-500' : totalScore >= 75 ? 'bg-amber-500' : 'bg-red-500'}`}
            style={{ width: `${totalScore}%` }}
          />
          {/* Target line at 95% */}
          <div className="absolute top-0 bottom-0 w-0.5 bg-white/50" style={{ left: '95%' }} />
        </div>
        <div className="text-right text-xs text-white/30 mt-0.5">← 95 target</div>
      </div>

      {/* Category breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {WEIGHTS.map(({ key, label, weight }) => {
          const status = statuses[key];
          const info = STATUS_MAP[status];
          const contribution = Math.round((info.score * weight) / 100);
          return (
            <div key={key} className="bg-slate-800 rounded-xl p-3 border border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-300">{label}</span>
                <span className="text-xs text-slate-500">{weight}%</span>
              </div>
              <select
                value={status}
                onChange={e => setStatuses(s => ({ ...s, [key]: e.target.value }))}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2 py-1.5 text-xs text-white mb-2 focus:outline-none focus:ring-1 focus:ring-red-500"
              >
                {Object.entries(STATUS_MAP).map(([val, { label: slabel }]) => (
                  <option key={val} value={val}>{slabel}</option>
                ))}
              </select>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${info.color}`} />
                <span className="text-xs text-slate-400">+{contribution} pts</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Launch date config */}
      <div className="border-t border-slate-700 pt-4 flex items-center gap-3 flex-wrap">
        <Clock className="w-4 h-4 text-slate-400" />
        <span className="text-xs text-slate-400">Target Launch Date:</span>
        <input
          type="date"
          value={launchDate}
          onChange={e => setLaunchDate(e.target.value)}
          className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-red-500"
        />
        {blockingIssues.length > 0 && (
          <span className="px-3 py-1 bg-red-900/40 border border-red-600 rounded-full text-red-400 text-xs font-bold">
            ⚠ {blockingIssues.length} Blocking Issue{blockingIssues.length > 1 ? 's' : ''}
          </span>
        )}
        {totalScore >= 95 && (
          <span className="px-3 py-1 bg-emerald-900/40 border border-emerald-600 rounded-full text-emerald-400 text-xs font-bold">
            ✓ Ready To Launch
          </span>
        )}
      </div>

      {/* Final scorecard */}
      <div className="mt-4 border-t border-slate-700 pt-4">
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Final Launch Scorecard</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
          {[
            'Operator Signup', 'Sale Creation', 'Upload Pipeline', 'SERP API', 'AI Research',
            'SEO Engine', 'Repository', 'VIP Events', 'POS System', 'Referrals',
            'Email Automation', 'Social Automation', 'Security', 'Database Health', 'Load Testing'
          ].map((item, i) => {
            const keys = ['operator', 'sale', 'image', 'ai_serp', 'ai_serp', 'seo', 'operator', 'pos', 'pos', 'referral', 'ai_serp', 'ai_serp', 'security', 'operator', 'load'];
            const status = statuses[keys[i]] || 'not_started';
            const isPassed = status === 'passed';
            const isFailed = status === 'failed';
            return (
              <div key={item} className={`flex items-center justify-between p-2 rounded-lg border text-xs ${
                isPassed ? 'bg-emerald-900/30 border-emerald-700' :
                isFailed ? 'bg-red-900/30 border-red-700' :
                'bg-slate-800 border-slate-700'
              }`}>
                <span className={`truncate mr-1 ${isPassed ? 'text-emerald-400' : isFailed ? 'text-red-400' : 'text-slate-400'}`}>{item}</span>
                <span className={`font-black shrink-0 ${isPassed ? 'text-emerald-400' : isFailed ? 'text-red-400' : 'text-slate-600'}`}>
                  {isPassed ? '✓' : isFailed ? '✗' : '—'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}