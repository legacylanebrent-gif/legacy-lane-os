import React from 'react';
import { Zap, TrendingUp } from 'lucide-react';

const AUTOMATION_SCORES = [
  { label: 'Lead Capture', score: 100, color: 'bg-green-500' },
  { label: 'Lead Routing', score: 92, color: 'bg-green-500' },
  { label: 'Agent Outreach', score: 58, color: 'bg-yellow-400' },
  { label: 'Estate Sale Company Owner Outreach', score: 71, color: 'bg-yellow-400' },
  { label: 'Reseller Outreach', score: 65, color: 'bg-yellow-400' },
  { label: 'Cleanout Outreach', score: 62, color: 'bg-yellow-400' },
  { label: 'Social Media', score: 74, color: 'bg-yellow-400' },
  { label: 'Email Automation', score: 48, color: 'bg-orange-400' },
  { label: 'Follow-Up', score: 31, color: 'bg-red-400' },
  { label: 'Referral Tracking', score: 44, color: 'bg-red-400' },
];

export default function SuperAgentUtilization() {
  const overall = Math.round(AUTOMATION_SCORES.reduce((a, s) => a + s.score, 0) / AUTOMATION_SCORES.length);
  const radius = 54;
  const circ = 2 * Math.PI * radius;
  const dashOffset = circ - (overall / 100) * circ;
  const color = overall >= 80 ? 'stroke-green-500' : overall >= 60 ? 'stroke-yellow-400' : 'stroke-orange-500';
  const textColor = overall >= 80 ? 'text-green-600' : overall >= 60 ? 'text-yellow-600' : 'text-orange-500';

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Gauge */}
        <div className="bg-slate-900 rounded-2xl p-6 flex items-center gap-6">
          <div className="relative w-36 h-36 flex-shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r={radius} stroke="#334155" strokeWidth="10" fill="none" />
              <circle cx="60" cy="60" r={radius} className={color} strokeWidth="10" fill="none"
                strokeDasharray={circ} strokeDashoffset={dashOffset} strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-3xl font-black ${textColor}`}>{overall}%</span>
              <span className="text-xs text-slate-400 font-semibold">Utilized</span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-orange-400" />
              <h3 className="text-white font-bold text-lg">SuperAgent Utilization</h3>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">
              {100 - overall}% of automation opportunities are <span className="text-orange-400 font-semibold">not yet activated</span>. Each percentage point represents hours of manual work that can be reclaimed.
            </p>
          </div>
        </div>

        {/* Scorecard bars */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-slate-500" />Automation Scorecard
          </h3>
          {AUTOMATION_SCORES.map(s => (
            <div key={s.label} className="flex items-center gap-3">
              <div className="w-32 text-xs text-slate-600 flex-shrink-0">{s.label}</div>
              <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                <div className={`h-full ${s.color} rounded-full transition-all`} style={{ width: `${s.score}%` }} />
              </div>
              <div className={`w-8 text-right text-xs font-bold ${s.score >= 80 ? 'text-green-600' : s.score >= 60 ? 'text-yellow-600' : 'text-red-500'}`}>{s.score}</div>
            </div>
          ))}
          <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold">Overall Automation Score</span>
            <span className={`text-lg font-black ${textColor}`}>{overall}/100</span>
          </div>
        </div>
      </div>
    </div>
  );
}