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
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4 mb-4">
      <p className="text-xs text-amber-400 font-semibold uppercase tracking-widest mb-3">
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
                done   ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                active ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-[0_0_8px_rgba(245,158,11,0.3)]' :
                         'bg-slate-700/40 text-slate-500 border border-slate-700'
              }`}>
                {done   ? <CheckCircle2 className="w-3 h-3" /> :
                 active ? <Loader2 className="w-3 h-3 animate-spin" /> :
                          <Circle className="w-3 h-3" />}
                {agent.label}
              </div>
              {i < AGENTS.length - 1 && (
                <span className={`text-xs transition-colors ${done ? 'text-green-500/50' : 'text-slate-600'}`}>→</span>
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
              done ? 'text-green-400' : active ? 'text-amber-300' : 'text-slate-500'
            }`}>
              {done   ? <CheckCircle2 className="w-3 h-3 flex-shrink-0" /> :
               active ? <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" /> :
                        <Circle className="w-3 h-3 flex-shrink-0" />}
              <span>{agent.label}</span>
              {active && <span className="text-amber-400/70 italic">{agent.desc}</span>}
            </div>
          );
        })}
      </div>

      {/* Status line */}
      {running && activeIndex >= 0 && activeIndex < AGENTS.length && (
        <p className="text-xs text-amber-400/80 mt-2 italic">
          {AGENTS[activeIndex].desc}
        </p>
      )}
    </div>
  );
}