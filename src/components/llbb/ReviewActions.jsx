// Phase 4D — review workflow actions (Parts 20/25/27/28).
// role 'admin': Submit for Review · Request Changes (note dialog) · Approve.
// role 'client': Submit / Resubmit for Review only — client self-approval is
// impossible (the server refuses; the button is never rendered either).
// All actions go through the websiteCollab review seam: readiness blockers,
// unresolved-note and stale-review refusals surface with their exact reasons.
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, AlertCircle, ThumbsUp, MessageSquareWarning, CheckCircle2 } from 'lucide-react';

export default function ReviewActions({ overview, role = 'admin', onDone }) {
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const [blockers, setBlockers] = useState(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestNote, setRequestNote] = useState('');

  const tenant = (overview && overview.website) || (overview && overview.tenant) || {};
  const workflow = overview ? (overview.workflow_status || (overview.website && overview.website.workflow_status) || tenant.workflow_status) : null;
  const tenantId = tenant.id;

  const run = async (action, extra) => {
    setBusy(action); setError(null); setBlockers(null);
    try {
      await base44.functions.invoke('websiteCollab', { action, website_tenant_id: tenantId, ...extra });
      setBusy(null);
      if (onDone) await onDone();
      return true;
    } catch (e) {
      const d = e.response && e.response.data && e.response.data.error;
      if (d && d.code === 'setup_blockers') setBlockers(d.blockers || []);
      else if (d && d.code === 'unresolved_notes') setError('Resolve or respond to the requested changes first.');
      else if (d && d.code === 'review_stale') setError('The website changed after submission — a refreshed review is required. Resubmit for review.');
      else setError(d ? (d.message || d.code) : 'Action failed.');
      setBusy(null);
      return false;
    }
  };

  const errorBox = (msg) => (
    <div className="flex items-start gap-1.5 text-xs text-red-600 max-w-sm">
      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> <span>{msg}</span>
    </div>
  );

  const blockersDialog = (
    <Dialog open={!!blockers} onOpenChange={(o) => { if (!o) setBlockers(null); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Website isn't ready yet</DialogTitle></DialogHeader>
        <p className="text-sm text-slate-600">Complete these required items:</p>
        <ul className="text-sm space-y-1.5">
          {(blockers || []).map(b => (
            <li key={b.key} className="flex items-start gap-2"><AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <span><span className="font-medium text-slate-800">{b.label}</span><span className="text-slate-500"> — {b.reason}</span></span></li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );

  if (!tenantId || !workflow) return null;
  const showSubmit = ['draft', 'setup_in_progress', 'changes_requested'].includes(workflow);
  const showReviewControls = role === 'admin' && workflow === 'ready_for_review';

  return (
    <div className="flex flex-wrap items-center gap-2">
      {showSubmit && (
        <Button size="sm" disabled={!!busy} onClick={() => run('submit_for_review')} className="bg-cyan-600 hover:bg-cyan-700 text-white">
          {busy === 'submit_for_review' ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : <Send className="w-3 h-3 mr-1.5" />}
          {workflow === 'changes_requested' ? 'Resubmit for Review' : 'Submit for Review'}
        </Button>
      )}
      {showReviewControls && (
        <>
          <Button size="sm" variant="outline" disabled={!!busy} onClick={() => { setRequestNote(''); setRequestOpen(true); }}>
            <MessageSquareWarning className="w-3.5 h-3.5 mr-1.5" /> Request Changes
          </Button>
          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" disabled={!!busy} onClick={() => run('approve_website')}>
            {busy === 'approve_website' ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : <ThumbsUp className="w-3 h-3 mr-1.5" />}
            Approve
          </Button>
        </>
      )}
      {workflow === 'ready_for_review' && role === 'client' && (
        <Badge className="bg-blue-100 text-blue-800 border border-blue-200"><CheckCircle2 className="w-3 h-3 mr-1 inline" />Waiting for review</Badge>
      )}
      {workflow === 'approved' && (
        <Badge className="bg-indigo-100 text-indigo-800 border border-indigo-200">Approved — publication is a separate step</Badge>
      )}
      {error && errorBox(error)}
      {blockersDialog}
      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Request Changes</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-500">Tell the client what to change. At least one note is required.</p>
          <Textarea rows={4} value={requestNote} onChange={(e) => setRequestNote(e.target.value)}
            placeholder="e.g. Please confirm the phone number and add your Cleanout service description." />
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setRequestOpen(false)}>Cancel</Button>
            <Button size="sm" disabled={!requestNote.trim() || busy === 'request_changes'}
              onClick={async () => {
                const done = await run('request_changes', { note: requestNote.trim() });
                if (done) setRequestOpen(false);
              }}>
              {busy === 'request_changes' ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
              Request Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}