import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Camera, ShieldAlert } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import VoiceNoteInput from '@/components/consultation/VoiceNoteInput';
import PhotoThumb from '@/components/consultation/PhotoThumb';
import { CONDITION_CATEGORIES, ATTENTION_LEVELS, CONDITION_LABEL, uid } from '@/components/consultation/consultationModel';

// Chapter 12 P1 — CONDITION / SAFETY OBSERVATIONS (P1-14/P1-15). Observations are
// OBSERVATIONS: the system NEVER diagnoses ("possible mold concern" never becomes
// "mold present") and NEVER declares the property safe. requires_professional_review
// surfaces PROFESSIONAL REVIEW RECOMMENDED — that is all.
export default function ConditionsSection({ consult, saveConsult }) {
  const obs = consult.condition_observations || [];
  const [category, setCategory] = useState('');
  const [attention, setAttention] = useState('watch');
  const [location, setLocation] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [resolving, setResolving] = useState(null);
  const [resolveNote, setResolveNote] = useState('');

  const add = async () => {
    if (!category || !note.trim()) return;
    setBusy(true);
    try {
      await saveConsult({ condition_observations: [...obs, { observation_id: uid(), category, attention, location: location.trim(), note: note.trim(), resolved: false }] });
      setCategory(''); setAttention('watch'); setLocation(''); setNote('');
    } finally { setBusy(false); }
  };

  const addWithPhoto = async (file) => {
    if (!file || !category || !note.trim()) return;
    setBusy(true);
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      await saveConsult({ condition_observations: [...obs, { observation_id: uid(), category, attention, location: location.trim(), note: note.trim(), photo: file_uri, resolved: false }] });
      setCategory(''); setAttention('watch'); setLocation(''); setNote('');
    } finally { setBusy(false); }
  };

  const resolve = async (id) => {
    await saveConsult({
      condition_observations: obs.map(o => (o.observation_id === id
        ? { ...o, resolved: true, resolved_note: resolveNote.trim(), resolved_at: new Date().toISOString() }
        : o)),
    });
    setResolving(null); setResolveNote('');
  };

  const unresolved = obs.filter(o => !o.resolved);
  const profReview = unresolved.filter(o => o.attention === 'requires_professional_review');

  return (
    <div className="space-y-4">
      {profReview.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
          <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <p className="text-xs text-red-700">
            PROFESSIONAL REVIEW RECOMMENDED — {profReview.length} observation{profReview.length > 1 ? 's' : ''} flagged for professional
            evaluation before relying on that area. This is a recommendation to have it looked at — EstateSalen never certifies a property safe or unsafe.
          </p>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
        <p className="text-sm font-semibold text-slate-800">Record an observation</p>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="h-11 text-base"><SelectValue placeholder="Condition category" /></SelectTrigger>
          <SelectContent>
            {CONDITION_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <div>
          <p className="text-xs font-medium text-slate-600 mb-1">Attention level</p>
          <div className="flex gap-2">
            {ATTENTION_LEVELS.map(a => (
              <button key={a.value} onClick={() => setAttention(a.value)}
                className={`flex-1 min-h-[40px] rounded-lg border text-[10px] font-semibold leading-tight ${attention === a.value ? 'bg-cyan-600 border-cyan-600 text-white' : 'bg-white border-slate-200 text-slate-600'}`}>
                {a.label}
              </button>
            ))}
          </div>
        </div>
        <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="Where? (room / area)" className="h-11 text-base" />
        <VoiceNoteInput value={note} onChange={setNote} placeholder="Describe what you observed — in your words (never a diagnosis)" rows={2} />
        <div className="flex gap-2">
          <Button onClick={add} disabled={!category || !note.trim() || busy} className="flex-1 h-11 bg-cyan-600 hover:bg-cyan-700">
            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />} Add Observation
          </Button>
          <label className={`h-11 px-4 rounded-lg border-2 border-dashed flex items-center ${(!category || !note.trim()) ? 'border-slate-200 text-slate-300' : 'border-slate-300 text-slate-500 cursor-pointer'}`}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            <input type="file" accept="image/*" capture="environment" className="hidden" disabled={!category || !note.trim()} onChange={e => addWithPhoto(e.target.files?.[0])} />
          </label>
        </div>
      </div>

      {obs.map(o => (
        <div key={o.observation_id} className={`bg-white border rounded-lg p-3 space-y-2 ${o.resolved ? 'border-slate-100 opacity-70' : 'border-slate-200'}`}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="bg-slate-50 border-slate-200 text-[10px]">{CONDITION_LABEL(o.category).toUpperCase()}</Badge>
              {o.attention === 'requires_professional_review' && <Badge className="bg-red-100 text-red-700 border-red-300 text-[10px]">PROFESSIONAL REVIEW RECOMMENDED</Badge>}
              {o.location && <span className="text-xs text-slate-500">{o.location}</span>}
            </div>
            {o.resolved && <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 text-[10px]">REVIEWED</Badge>}
          </div>
          <p className="text-xs text-slate-700">{o.note}</p>
          {o.photo && <PhotoThumb fileUri={o.photo} className="w-20 h-20" />}
          {o.resolved ? (
            o.resolved_note && <p className="text-[10px] text-slate-400">Resolution: {o.resolved_note} (operational review — never a safety certification)</p>
          ) : resolving === o.observation_id ? (
            <div className="space-y-2">
              <Input value={resolveNote} onChange={e => setResolveNote(e.target.value)} placeholder="How was it resolved / reviewed?" className="h-10" />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => resolve(o.observation_id)} className="bg-green-600 hover:bg-green-700">Mark Reviewed</Button>
                <Button size="sm" variant="outline" onClick={() => { setResolving(null); setResolveNote(''); }}>Cancel</Button>
              </div>
            </div>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setResolving(o.observation_id)}>Resolve / Review</Button>
          )}
        </div>
      ))}
    </div>
  );
}