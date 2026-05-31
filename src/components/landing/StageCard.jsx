import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function StageCard({ number, title, problem, solution, timeSaved, bonus }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white hover:shadow-md transition-shadow">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-6 py-5 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
            <span className="text-lg font-bold text-orange-600">{number}</span>
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-slate-900 text-lg">{title}</h3>
            <p className="text-sm text-orange-600 font-semibold">Save {timeSaved}</p>
          </div>
        </div>
        <ChevronDown className={`w-5 h-5 text-slate-400 flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="px-6 py-5 border-t border-slate-100 space-y-5">
          <div className="space-y-3">
            <div>
              <h4 className="font-bold text-slate-900 mb-2">The Problem</h4>
              <p className="text-slate-600 text-sm leading-relaxed">{problem}</p>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-2">How The App Helps</h4>
              <div className="text-slate-600 text-sm leading-relaxed space-y-1">
                {Array.isArray(solution) ? (
                  <ul className="space-y-1">
                    {solution.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-orange-500 flex-shrink-0">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>{solution}</p>
                )}
              </div>
            </div>
          </div>

          {bonus && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3">
              <p className="text-sm text-slate-700">{bonus}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}