import React from 'react';
import { CheckCircle, AlertCircle, XCircle } from 'lucide-react';

export default function AuditScorecard({ score, breakdown }) {
  const color = score >= 80 ? 'green' : score >= 60 ? 'yellow' : 'red';
  const colorMap = {
    green: { ring: 'stroke-green-500', text: 'text-green-600', bg: 'bg-green-50 border-green-200', label: 'Launch Ready' },
    yellow: { ring: 'stroke-yellow-400', text: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200', label: 'Needs Attention' },
    red: { ring: 'stroke-red-500', text: 'text-red-600', bg: 'bg-red-50 border-red-200', label: 'Not Ready' },
  };
  const c = colorMap[color];
  const radius = 52;
  const circ = 2 * Math.PI * radius;
  const dashOffset = circ - (score / 100) * circ;

  return (
    <div className={`rounded-2xl border-2 p-6 ${c.bg} flex flex-col md:flex-row items-center gap-6`}>
      <div className="relative w-36 h-36 flex-shrink-0">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={radius} stroke="#e2e8f0" strokeWidth="10" fill="none" />
          <circle cx="60" cy="60" r={radius} className={c.ring} strokeWidth="10" fill="none"
            strokeDasharray={circ} strokeDashoffset={dashOffset} strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-black ${c.text}`}>{score}%</span>
          <span className="text-xs text-slate-500 font-semibold">{c.label}</span>
        </div>
      </div>
      <div className="flex-1">
        <h2 className="text-xl font-bold text-slate-800 mb-1">Launch Readiness Score</h2>
        <p className="text-slate-500 text-sm mb-4">Based on pages built, funnels connected, routing active, notifications active, and audience capture.</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {breakdown.map(({ label, value, total }) => {
            const pct = total > 0 ? Math.round((value / total) * 100) : 0;
            const Icon = pct === 100 ? CheckCircle : pct >= 50 ? AlertCircle : XCircle;
            const ic = pct === 100 ? 'text-green-500' : pct >= 50 ? 'text-yellow-500' : 'text-red-500';
            return (
              <div key={label} className="flex items-center gap-2 bg-white/70 rounded-lg px-3 py-2">
                <Icon className={`w-4 h-4 flex-shrink-0 ${ic}`} />
                <div>
                  <p className="text-xs font-semibold text-slate-700">{label}</p>
                  <p className="text-xs text-slate-500">{value}/{total}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}