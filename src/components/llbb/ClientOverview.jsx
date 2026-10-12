// Phase 4D (Part 7) — the client's "YOUR WEBSITE" landing dashboard.
// Clean, jargon-free: setup progress, required/recommended/optional steps,
// continue-setup deep links, preview, review status and requested changes.
// Uses the SAME canonical readiness engine as the admin (Part 11).
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import GuidedOnboarding from '@/components/llbb/GuidedOnboarding';
import ReviewActions from '@/components/llbb/ReviewActions';
import ActivityHistoryPanel from '@/components/llbb/ActivityHistoryPanel';
import { CLIENT_SECTION_TABS } from '@/components/llbb/managerConfig';
import { ArrowRight, Eye, AlertCircle, CheckCircle2, Circle, Loader2, MessageSquareWarning } from 'lucide-react';
import { WORKFLOW_LABELS } from '@/components/llbb/managerConfig';

const STEP_STATUS_ICON = {
  complete: <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />,
  warning: <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />,
  blocking: <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />,
  incomplete: <Circle className="w-4 h-4 text-slate-300 flex-shrink-0 mt-0.5" />,
  optional: <Circle className="w-4 h-4 text-slate-300 flex-shrink-0 mt-0.5" />
};

export default function ClientOverview({ data, onNavigate, onSaved }) {
  const [tourDone, setTourDone] = useState(() => {
    try { return !!localStorage.getItem(`llbbTourDone_${data.website.id}`); } catch (e) { return false; }
  });
  const w = data.website;
  const readiness = data.readiness;
  const required = readiness.sections.filter(s => s.blocking);
  const recommended = readiness.sections.filter(s => !s.blocking && !s.optional && s.key !== 'content_quality');
  const optional = readiness.sections.filter(s => s.optional);
  const nextStep = readiness.sections.find(s => s.blocking && s.key !== 'content_quality' && s.key !== 'runtime');
  const workflow = w.workflow_status;

  const closeTour = () => {
    setTourDone(true);
    try { localStorage.setItem(`llbbTourDone_${w.id}`, '1'); } catch (e) {}
  };

  return (
    <div className="space-y-5">
      <GuidedOnboarding
        open={!tourDone && workflow !== 'live'}
        websiteName={w.name}
        onStart={() => { closeTour(); onNavigate('business'); }}
        onSkip={closeTour}
      />

      {/* Hero — YOUR WEBSITE */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="text-xs font-semibold tracking-widest text-cyan-700 uppercase">Your Website</div>
        <h1 className="font-heading text-2xl md:text-3xl font-bold text-slate-900 mt-1">{w.name}</h1>
        <div className="flex flex-wrap items-center gap-3 mt-3">
          <Badge className={workflow === 'approved' ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' : workflow === 'ready_for_review' ? 'bg-blue-100 text-blue-800 border border-blue-200' : 'bg-amber-100 text-amber-800 border border-amber-200'}>
            {WORKFLOW_LABELS[workflow] || workflow}
          </Badge>
          <span className="text-sm text-slate-500">Setup {readiness.percent}% complete</span>
          <div className="flex-1 min-w-[120px] max-w-xs h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full ${readiness.blockers.length ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${readiness.percent}%` }} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          {nextStep && (
            <Button className="bg-cyan-600 hover:bg-cyan-700 text-white" onClick={() => onNavigate(CLIENT_SECTION_TABS[nextStep.key] || 'business')}>
              Continue Setup <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          )}
          <Button variant="outline" onClick={() => onNavigate('preview')}><Eye className="w-4 h-4 mr-1.5" /> Preview Website</Button>
          <ReviewActions overview={{ website: w, workflow_status: workflow }} role="client" onDone={onSaved} />
        </div>
      </div>

      {/* Requested changes banner (Part 25) */}
      {(workflow === 'changes_requested' || data.open_admin_notes > 0) && (
        <div className="bg-orange-50 border border-orange-300 rounded-lg p-4 flex items-start gap-3">
          <MessageSquareWarning className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-semibold text-orange-900">The EstateSalen team requested changes</div>
            <div className="text-sm text-orange-800">{data.open_admin_notes} item{data.open_admin_notes === 1 ? '' : 's'} to address, then resubmit for review.</div>
          </div>
          <Button size="sm" variant="outline" className="bg-white" onClick={() => onNavigate('review')}>Review Changes</Button>
        </div>
      )}

      {workflow === 'approved' && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-indigo-900">Website approved</div>
            <div className="text-sm text-indigo-800">Your content passed review. Publication (connecting your live web address) is arranged with the EstateSalen team as a separate step.</div>
          </div>
        </div>
      )}

      {/* Setup checklist */}
      <div className="grid md:grid-cols-3 gap-4">
        {[
          { title: 'Required', items: required, tone: 'text-red-600' },
          { title: 'Recommended', items: recommended, tone: 'text-amber-600' },
          { title: 'Optional', items: optional, tone: 'text-slate-400' }
        ].map(group => (
          <div key={group.title} className="bg-white rounded-lg border border-slate-200 p-4">
            <div className={`text-xs font-bold uppercase tracking-wide ${group.tone}`}>{group.title}</div>
            <ul className="mt-2 space-y-2">
              {group.items.map(s => (
                <li key={s.key}>
                  <button onClick={() => onNavigate(CLIENT_SECTION_TABS[s.key] || 'business')}
                    className="w-full text-left flex items-start gap-2 text-sm hover:bg-slate-50 rounded p-1 -m-1">
                    {STEP_STATUS_ICON[s.status] || STEP_STATUS_ICON.incomplete}
                    <span className="flex-1 min-w-0">
                      <span className="text-slate-800 font-medium">{s.label}</span>
                      {s.status !== 'complete' && <span className="block text-xs text-slate-400">{s.reason}</span>}
                    </span>
                  </button>
                </li>
              ))}
              {group.items.length === 0 && <li className="text-xs text-slate-400">Nothing needed here.</li>}
            </ul>
          </div>
        ))}
      </div>

      <ActivityHistoryPanel websiteTenantId={w.id} limit={15} />
    </div>
  );
}