import React, { useState, useEffect } from 'react';
import { Clock, Edit2, Check } from 'lucide-react';

export default function LaunchCountdown() {
  const [launchDate, setLaunchDate] = useState('2026-07-01');
  const [editing, setEditing] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const stored = localStorage.getItem('launchCommandCenter_launchDate');
    if (stored) setLaunchDate(stored);
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const save = () => {
    localStorage.setItem('launchCommandCenter_launchDate', launchDate);
    setEditing(false);
  };

  const target = new Date(launchDate + 'T00:00:00');
  const diff = Math.max(0, target - now);
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  const isPast = diff === 0;

  return (
    <div className="bg-slate-900 border border-red-700/50 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-red-400" />
          <h3 className="text-sm font-black text-white uppercase tracking-widest">Launch Countdown</h3>
        </div>
        <button onClick={() => editing ? save() : setEditing(true)} className="text-slate-400 hover:text-white">
          {editing ? <Check className="w-4 h-4 text-emerald-400" /> : <Edit2 className="w-4 h-4" />}
        </button>
      </div>

      {editing ? (
        <input
          type="date"
          value={launchDate}
          onChange={e => setLaunchDate(e.target.value)}
          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-red-500 mb-2"
        />
      ) : (
        <p className="text-xs text-slate-500 mb-3">Target: {new Date(launchDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
      )}

      {isPast ? (
        <div className="text-center py-4">
          <span className="text-3xl font-black text-emerald-400">🚀 LAUNCHED</span>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {[['Days', days], ['Hrs', hours], ['Min', mins], ['Sec', secs]].map(([lbl, val]) => (
            <div key={lbl} className="bg-slate-800 rounded-xl p-3 text-center border border-slate-700">
              <div className="text-2xl font-black text-red-400">{String(val).padStart(2, '0')}</div>
              <div className="text-xs text-slate-500">{lbl}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}