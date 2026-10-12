// Phase 4D — lightweight review communication (Parts 17/18/19).
// Shared by the admin Review Center and the client Review tab. Notes are
// general or section-associated; OPEN/RESOLVED lifecycle with responses.
// All reads/writes go through the websiteCollab seam — tenant-isolated.
import React, { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { Loader2, MessageSquarePlus, CheckCircle2, Reply, RotateCcw } from 'lucide-react';
import { MANAGER_NAV } from '@/components/llbb/managerConfig';

const SECTION_LABELS = Object.fromEntries(MANAGER_NAV.map(n => [n.key, n.label]));
const sectionLabel = (key) => SECTION_LABELS[key] || (key ? key.replace(/_/g, ' ') : 'General');

export default function ReviewNotesPanel({ websiteTenantId, authorRole, canAddNote, onChanged }) {
  const [notes, setNotes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showResolved, setShowResolved] = useState(false);
  const [draft, setDraft] = useState('');
  const [draftSection, setDraftSection] = useState('');
  const [adding, setAdding] = useState(false);
  const [reply, setReply] = useState({}); // note_id -> text

  const load = useCallback(async () => {
    try {
      const res = await base44.functions.invoke('websiteCollab', {
        action: 'list_notes', website_tenant_id: websiteTenantId, include_resolved: true
      });
      setNotes(res.data.notes || []);
    } catch (e) {
      setNotes([]);
    }
    setLoading(false);
  }, [websiteTenantId]);
  useEffect(() => { load(); }, [load]);

  const notifyChanged = () => { load(); if (onChanged) onChanged(); };

  async function addNote() {
    if (!draft.trim()) return;
    setAdding(true);
    try {
      await base44.functions.invoke('websiteCollab', {
        action: 'add_note', website_tenant_id: websiteTenantId,
        note: draft.trim(), section: draftSection || null
      });
      setDraft(''); setDraftSection('');
      toast({ title: 'Note added' });
      notifyChanged();
    } catch (e) {
      toast({ title: 'Could not add note', variant: 'destructive' });
    }
    setAdding(false);
  }

  async function respond(note) {
    const text = (reply[note.id] || '').trim();
    if (!text) return;
    try {
      await base44.functions.invoke('websiteCollab', {
        action: 'respond_note', website_tenant_id: websiteTenantId, note_id: note.id, response_text: text
      });
      setReply(r => ({ ...r, [note.id]: '' }));
      toast({ title: 'Response sent' });
      notifyChanged();
    } catch (e) {
      toast({ title: 'Could not send response', variant: 'destructive' });
    }
  }

  async function resolve(note) {
    try {
      await base44.functions.invoke('websiteCollab', {
        action: 'resolve_note', website_tenant_id: websiteTenantId, note_id: note.id
      });
      toast({ title: 'Note resolved' });
      notifyChanged();
    } catch (e) {
      toast({ title: 'Could not resolve note', variant: 'destructive' });
    }
  }

  async function reopen(note) {
    try {
      await base44.functions.invoke('websiteCollab', { action: 'add_note', website_tenant_id: websiteTenantId, note: note.body, section: note.section });
      toast({ title: 'Re-opened as a new note' });
      notifyChanged();
    } catch (e) {
      toast({ title: 'Could not re-open note', variant: 'destructive' });
    }
  }

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  const visible = (notes || []).filter(n => showResolved || n.status !== 'resolved');
  const resolvedCount = (notes || []).filter(n => n.status === 'resolved').length;

  return (
    <div className="space-y-4">
      {canAddNote && (
        <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3">
          <div className="font-heading font-bold text-slate-900 flex items-center gap-2"><MessageSquarePlus className="w-4 h-4" /> {authorRole === 'admin' ? 'Request a Change' : 'Add a Note'}</div>
          <Textarea rows={3} value={draft} onChange={(e) => setDraft(e.target.value)}
            placeholder={authorRole === 'admin' ? 'e.g. Please upload a higher-resolution logo.' : 'e.g. Done — the logo is replaced. Or ask a question.'} />
          <div className="flex flex-wrap items-center gap-2">
            <select value={draftSection} onChange={(e) => setDraftSection(e.target.value)}
              className="text-xs border border-slate-200 rounded-md px-2 py-2 bg-white text-slate-600">
              <option value="">General</option>
              {MANAGER_NAV.filter(n => n.key !== 'overview').map(n => <option key={n.key} value={n.key}>{n.label}</option>)}
            </select>
            <Button size="sm" disabled={adding || !draft.trim()} onClick={addNote}>
              {adding ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <MessageSquarePlus className="w-3.5 h-3.5 mr-1.5" />}
              Add Note
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-500">{visible.length} open note{visible.length === 1 ? '' : 's'}{resolvedCount > 0 ? ` · ${resolvedCount} resolved` : ''}</div>
        <Button variant="ghost" size="sm" onClick={() => setShowResolved(s => !s)}>
          {showResolved ? 'Hide resolved' : `Show resolved (${resolvedCount})`}
        </Button>
      </div>

      {visible.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-8 text-center text-sm text-slate-500">
          No review notes — all clear.
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map(note => (
            <div key={note.id} className={`bg-white rounded-lg border p-4 ${note.author_role === 'admin' ? 'border-slate-200' : 'border-cyan-200 bg-cyan-50/40'}`}>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Badge className={note.author_role === 'admin' ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' : 'bg-cyan-100 text-cyan-800 border border-cyan-200'}>
                  {note.author_role === 'admin' ? 'EstateSalen Team' : 'Client'}
                </Badge>
                <Badge variant="outline" className="bg-white">{sectionLabel(note.section)}</Badge>
                {note.review_round ? <span className="text-xs text-slate-400">Round {note.review_round}</span> : null}
                {note.status === 'resolved'
                  ? <Badge className="bg-green-100 text-green-800 border border-green-200 ml-auto">Resolved</Badge>
                  : <Badge className="bg-amber-100 text-amber-800 border border-amber-200 ml-auto">Open</Badge>}
              </div>
              <p className="text-sm text-slate-800 whitespace-pre-line">{note.body}</p>
              <div className="text-xs text-slate-400 mt-1.5">{note.author_display || '—'} · {note.created_date ? new Date(note.created_date).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''}</div>
              {note.response_text && (
                <div className="mt-3 border-l-2 border-slate-200 pl-3 text-sm text-slate-600">
                  <div className="text-xs text-slate-400 mb-0.5">Response · {note.response_at ? new Date(note.response_at).toLocaleString([], { month: 'short', day: 'numeric' }) : ''}</div>
                  <p className="whitespace-pre-line">{note.response_text}</p>
                </div>
              )}
              {note.status === 'open' && (
                <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                  <Input value={reply[note.id] || ''} onChange={(e) => setReply(r => ({ ...r, [note.id]: e.target.value }))}
                    placeholder="Write a response…" className="flex-1 min-w-[180px] text-sm" />
                  <Button size="sm" variant="outline" disabled={!(reply[note.id] || '').trim()} onClick={() => respond(note)}>
                    <Reply className="w-3.5 h-3.5 mr-1" /> Reply
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => resolve(note)}>
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Mark Resolved
                  </Button>
                </div>
              )}
              {note.status === 'resolved' && authorRole === 'admin' && (
                <div className="mt-2">
                  <Button size="sm" variant="ghost" onClick={() => reopen(note)}><RotateCcw className="w-3 h-3 mr-1" /> Re-open</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}