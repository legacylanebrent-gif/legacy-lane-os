import React, { useEffect, useState } from 'react';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';

const AGENTS = [
  { id: 'intent',     label: 'Intent Router',      desc: 'Classifying admin command...' },
  { id: 'context',    label: 'Context Builder',     desc: 'Gathering Legacy Lane context...' },
  { id: 'strategy',   label: 'Strategy Agent',      desc: 'Building business strategy...' },
  { id: 'assets',     label: 'Asset Builder',       desc: 'Drafting assets & scripts...' },
  { id: 'compliance', label: 'Compliance Guard',    desc: 'Running compliance review...' },
  { id: 'execution',  label: 'Execution Planner',   desc: 'Preparing execution plan...' },
  { id: 'format',     label: 'Output Formatter',    desc: 'Formatting final report...' },
];

// Each agent gets ~N ms of display time
const STEP_DURATION = 1050;

export default function AgentChainIndicator({ running }) {
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    if (!running) {
      setActiveIndex(-1);
      return;
    }
    setActiveIndex(0);
    const intervals = AGENTS.map((_, i) =>
      setTimeout(() => setActiveIndex(i), i * STEP_DURATION)
    );
    return () => intervals.forEach(clearTimeout);
  }, [running]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 mb-4">
      <p className="text-xs text-amber-600 font-semibold uppercase tracking-widest mb-3">
        Agent Chain
      </p>

      {/* Chain visual — desktop horizontal */}
      <div className="hidden md:flex items-center gap-1 flex-wrap">
        {AGENTS.map((agent, i) => {
          const done = !running ? false : activeIndex > i;
          const active = running && activeIndex === i;
          return (
            <React.Fragment key={agent.id}>
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-300 ${
                done   ? 'bg-green-100 text-green-700 border border-green-300' :
                active ? 'bg-amber-100 text-amber-700 border border-amber-400 shadow-sm' :
                         'bg-slate-100 text-slate-400 border border-slate-200'
              }`}>
                {done   ? <CheckCircle2 className="w-3 h-3" /> :
                 active ? <Loader2 className="w-3 h-3 animate-spin" /> :
                          <Circle className="w-3 h-3" />}
                {agent.label}
              </div>
              {i < AGENTS.length - 1 && (
                <span className={`text-xs transition-colors ${done ? 'text-green-400' : 'text-slate-300'}`}>→</span>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Mobile vertical list */}
      <div className="md:hidden space-y-1.5">
        {AGENTS.map((agent, i) => {
          const done = !running ? false : activeIndex > i;
          const active = running && activeIndex === i;
          return (
            <div key={agent.id} className={`flex items-center gap-2 text-xs transition-all ${
              done ? 'text-green-600' : active ? 'text-amber-600' : 'text-slate-400'
            }`}>
              {done   ? <CheckCircle2 className="w-3 h-3 flex-shrink-0" /> :
               active ? <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" /> :
                        <Circle className="w-3 h-3 flex-shrink-0" />}
              <span>{agent.label}</span>
              {active && <span className="text-amber-500 italic">{agent.desc}</span>}
            </div>
          );
        })}
      </div>

      {/* Status line */}
      {running && activeIndex >= 0 && activeIndex < AGENTS.length && (
        <p className="text-xs text-amber-600 mt-2 italic">
          {AGENTS[activeIndex].desc}
        </p>
      )}
    </div>
  );
}