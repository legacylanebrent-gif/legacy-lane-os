import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Pin, PinOff, Plus, StickyNote } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

// Chapter 2 P1 — operational sale notes: ordinary internal team memory (property quirks,
// logistics, who-did-what). NOT client decisions (SaleClientDecision) and NOT tasks (SaleTask).
// Author + timestamp come from the platform built-ins; visibility follows sale/team RLS.
export default function SaleNotesPanel({ saleId }) {
  const [notes, setNotes] = useState([]);
  const [text, setText] = useState('');
  const [saleInfo, setSaleInfo] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (saleId) load();
  }, [saleId]);

  const load = async () => {
    try {
      const [noteData, saleData] = await Promise.all([
        base44.entities.SaleNote.filter({ sale_id: saleId }, '-created_date', 200),
        base44.entities.EstateSale.filter({ id: saleId }),
      ]);
      setNotes(noteData || []);
      setSaleInfo(saleData[0] || null);
    } catch (e) {
      toast.error('Could not load sale notes');
    }
  };

  const addNote = async () => {
    const body = text.trim();
    if (!body) return;
    setSaving(true);
    try {
      const me = await base44.auth.me();
      await base44.entities.SaleNote.create({
        sale_id: saleId,
        operator_id: saleInfo?.operator_id || me.id,
        sale_team_ids: saleInfo?.sale_team || [],
        note: body,
        created_by_name: me?.full_name || me?.email || '',
      });
      setText('');
      await load();
      toast.success('Note added');
    } catch (e) {
      toast.error('Could not save note');
    } finally {
      setSaving(false);
    }
  };

  const togglePin = async (note) => {
    try {
      await base44.entities.SaleNote.update(note.id, { pinned: !note.pinned });
      await load();
    } catch (e) {
      toast.error('Could not update note');
    }
  };

  const pinned = notes.filter(n => n.pinned);
  const rest = notes.filter(n => !n.pinned);

  const renderNote = (note) => (
    <div key={note.id} className={`rounded-lg border p-3 ${note.pinned ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white'}`}>
      <p className="text-sm text-slate-800 whitespace-pre-wrap">{note.note}</p>
      <div className="flex items-center justify-between mt-2 gap-2 flex-wrap">
        <span className="text-xs text-slate-500">
          {note.created_by_name || 'Team member'} · {note.created_date ? format(new Date(note.created_date), 'MMM d, yyyy h:mm a') : ''}
        </span>
        <button
          onClick={() => togglePin(note)}
          className={`text-xs flex items-center gap-1 px-2 py-1 rounded ${note.pinned ? 'text-amber-700 bg-amber-100' : 'text-slate-400 hover:bg-slate-100'}`}
        >
          {note.pinned ? <><PinOff className="w-3 h-3" /> Unpin</> : <><Pin className="w-3 h-3" /> Pin</>}
        </button>
      </div>
    </div>
  );

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <StickyNote className="w-5 h-5 text-orange-600" /> Operational Notes
        </CardTitle>
        <p className="text-xs text-slate-500">
          Internal team memory for this sale. Consequential client decisions still belong in Client Authority &amp; Decisions.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder='e.g. "Neighbor has key to detached garage" or "Electrician coming Wednesday at 10"'
            rows={2}
          />
          <Button onClick={addNote} disabled={saving || !text.trim()} size="sm" className="bg-orange-600 hover:bg-orange-700">
            <Plus className="w-4 h-4 mr-1" /> {saving ? 'Adding…' : 'Add Note'}
          </Button>
        </div>
        {pinned.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-amber-700 flex items-center gap-1"><Pin className="w-3 h-3" /> Pinned</p>
            {pinned.map(renderNote)}
          </div>
        )}
        {rest.length > 0 && <div className="space-y-2">{rest.map(renderNote)}</div>}
        {notes.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-2">
            No notes yet — keep property details out of texts and notebooks.
          </p>
        )}
      </CardContent>
    </Card>
  );
}