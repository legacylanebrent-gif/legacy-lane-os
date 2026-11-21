import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { toolLinksFor } from './coachToolLinks';

// "Do it now" buttons under a coaching answer — each one opens the EstateSalen tool
// that executes that part of the advice.
export default function CoachToolLinks({ text, exclude = [] }) {
  const links = toolLinksFor(text).filter(l => !exclude.includes(l.key));
  if (!links.length) return null;
  return (
    <div className="mt-2 ml-8 space-y-1.5">
      <p className="text-[11px] text-slate-500 font-medium">Do it in EstateSalen:</p>
      <div className="flex flex-wrap gap-1.5">
        {links.map(l => (
          <Link
            key={l.key}
            to={l.path}
            className="inline-flex items-center gap-1 text-[11px] font-medium bg-orange-950/50 hover:bg-orange-900/70 border border-orange-800/60 hover:border-orange-600 text-orange-200 hover:text-white rounded-lg px-2.5 py-1.5 transition-all"
          >
            {l.label}
            <span className="text-orange-400/80 font-normal">· {l.hint}</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        ))}
      </div>
    </div>
  );
}