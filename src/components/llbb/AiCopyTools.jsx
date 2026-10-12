// Phase 4F (Part 23) — per-field AI copy tools. Preview-only: the proposal is
// never applied silently; the operator applies it into the editor they were
// already editing. Facts are never added by the model; claims stay out.
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, Wand2, Check, X } from 'lucide-react';

const INSTRUCTIONS = [
  { key: 'improve', label: 'Improve clarity & flow' },
  { key: 'professional', label: 'More professional' },
  { key: 'friendlier', label: 'Warmer & friendlier' },
  { key: 'shorten', label: 'Shorten' },
  { key: 'expand', label: 'Expand slightly' },
  { key: 'seo', label: 'Improve for search' },
  { key: 'rewrite', label: 'Rewrite fresh' }
];

export default function AiCopyTools({ websiteTenantId, value, onApply }) {
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [proposal, setProposal] = useState(null);
  const [error, setError] = useState(null);

  const run = async (instruction) => {
    setRunning(true); setError(null);
    try {
      const res = await base44.functions.invoke('llbbAiBuilder', {
        action: 'edit_tool', website_tenant_id: websiteTenantId, instruction, text: value || ''
      });
      if (res.data && res.data.status === 'ready' && res.data.proposal) setProposal(res.data.proposal);
      else setError('AI could not rewrite this right now. Please try again or keep your current text.');
    } catch (e) {
      setError('AI could not rewrite this right now. Please try again or keep your current text.');
    }
    setRunning(false);
  };

  return (
    <div className="mt-2">
      <Button variant="ghost" size="sm" className="text-cyan-700 hover:text-cyan-800 -ml-2"
        onClick={() => setOpen(o => !o)}>
        <Wand2 className="w-3.5 h-3.5" /> {open ? 'Hide AI tools' : 'Improve with AI'}
      </Button>
      {open && (
        <div className="bg-cyan-50 border border-cyan-100 rounded-md p-3 mt-1 space-y-2">
          <div className="text-xs text-slate-600">AI proposes new wording — you choose whether to use it. It never adds facts you haven't given.</div>
          <div className="flex flex-wrap gap-1.5">
            {INSTRUCTIONS.map(i => (
              <Button key={i.key} variant="outline" size="sm" disabled={running}
                onClick={() => run(i.key)} className="bg-white text-xs">
                {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} {i.label}
              </Button>
            ))}
          </div>
          {error && <div className="text-xs text-red-600">{error}</div>}
          {proposal && (
            <div className="bg-white border border-cyan-200 rounded-md p-3">
              <div className="text-xs font-semibold text-cyan-800 mb-1">AI suggestion</div>
              <p className="text-sm text-slate-700 whitespace-pre-line">{proposal}</p>
              <div className="flex gap-2 mt-2">
                <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700 text-white"
                  onClick={() => { onApply(proposal); setProposal(null); setOpen(false); }}>
                  <Check className="w-3.5 h-3.5" /> Use this
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setProposal(null)}>
                  <X className="w-3.5 h-3.5" /> Keep current
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}