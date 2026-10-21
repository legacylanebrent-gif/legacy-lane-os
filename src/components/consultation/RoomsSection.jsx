import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus, Trash2, Camera, Home } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import VoiceNoteInput from '@/components/consultation/VoiceNoteInput';
import PhotoThumb from '@/components/consultation/PhotoThumb';
import { PREP_LEVELS, uid } from '@/components/consultation/consultationModel';

// Chapter 12 P1 — ROOM-BY-ROOM WALKTHROUGH (P1-10/P1-11/P1-12): mobile-first capture
// of CONSULTATION OBSERVATIONS. An observation is never an inventory record, never a
// verified fact, and research_needed here only preserves context — it never writes
// Item.research_status. Photos are private (stored privately) and never marketing media.
const QUICK_ROOMS = ['Living Room', 'Kitchen', 'Dining Room', 'Primary Bedroom', 'Bedroom', 'Bathroom', 'Basement', 'Garage', 'Attic', 'Storage', 'Outbuilding', 'Exterior'];

export default function RoomsSection({ consult, saveConsult }) {
  const rooms = consult.rooms || [];
  const photos = consult.photos || [];
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);

  const upd = (roomId, patch) => saveConsult({ rooms: rooms.map(r => (r.room_id === roomId ? { ...r, ...patch } : r)) });
  const addRoom = (name) => {
    const n = (name || newName).trim();
    if (!n) return;
    saveConsult({ rooms: [...rooms, { room_id: uid(), name: n, prep_level: 'unknown', research_needed: false, photos: [] }] });
    setNewName('');
  };
  const delRoom = (roomId) => saveConsult({
    rooms: rooms.filter(r => r.room_id !== roomId),
    photos: photos.filter(p => p.room_id !== roomId),
  });

  const addPhoto = async (roomId, file) => {
    if (!file) return;
    setBusy(true);
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      await saveConsult({ photos: [...photos, { file_uri, name: file.name, room_id: roomId, taken_at: new Date().toISOString() }] });
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
        <p className="text-sm font-semibold text-slate-800">Add a room / area</p>
        <div className="flex gap-2">
          <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Room or area name" className="h-11 text-base" />
          <Button onClick={() => addRoom()} disabled={!newName.trim()} className="h-11 px-4 bg-cyan-600 hover:bg-cyan-700"><Plus className="w-4 h-4" /></Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {QUICK_ROOMS.filter(q => !rooms.some(r => r.name === q)).map(q => (
            <button key={q} onClick={() => addRoom(q)} className="min-h-[40px] px-3 rounded-full border border-slate-200 bg-slate-50 text-xs text-slate-600 flex items-center gap-1">
              <Home className="w-3 h-3" /> {q}
            </button>
          ))}
        </div>
      </div>

      {rooms.length === 0 && (
        <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3">
          No rooms captured yet. Add each area as you walk the property — observations here are NOT inventory records.
        </p>
      )}

      {rooms.map(room => {
        const roomPhotos = photos.filter(p => p.room_id === room.room_id);
        return (
          <div key={room.room_id} className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-800">{room.name}</p>
              <button onClick={() => delRoom(room.room_id)} className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-red-500" aria-label={`Remove ${room.name}`}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div>
              <p className="text-xs font-medium text-slate-600 mb-1">Preparation level</p>
              <div className="flex gap-2">
                {PREP_LEVELS.map(l => (
                  <button key={l.value} onClick={() => upd(room.room_id, { prep_level: l.value })}
                    className={`flex-1 min-h-[40px] rounded-lg border text-xs font-medium ${room.prep_level === l.value ? 'bg-cyan-600 border-cyan-600 text-white' : 'bg-white border-slate-200 text-slate-600'}`}>
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            <VoiceNoteInput label="Merchandise observation" value={room.merchandise_observation || ''} onChange={v => upd(room.room_id, { merchandise_observation: v })} placeholder="What is in this area?" rows={2} />
            <Input value={room.access_concern || ''} onChange={e => upd(room.room_id, { access_concern: e.target.value })} placeholder="Access concern (stairs, narrow hall, packed path…)" className="h-11 text-base" />

            <div className="flex items-center justify-between gap-3 bg-slate-50 rounded-lg p-2.5 border border-slate-100">
              <div className="flex-1">
                <p className="text-xs font-medium text-slate-700">Research needed</p>
                <p className="text-[10px] text-slate-400">Unfamiliar or possibly important merchandise — preserved until a formal item exists.</p>
              </div>
              <Switch checked={!!room.research_needed} onCheckedChange={v => upd(room.room_id, { research_needed: v })} />
            </div>
            {room.research_needed && (
              <Input value={room.research_note || ''} onChange={e => upd(room.room_id, { research_note: e.target.value })} placeholder="What needs research?" className="h-11 text-base" />
            )}

            <VoiceNoteInput label="Notes" value={room.notes || ''} onChange={v => upd(room.room_id, { notes: v })} placeholder="Anything else about this area" rows={2} />

            <div>
              <p className="text-xs font-medium text-slate-600 mb-1">Photos (private)</p>
              <div className="flex flex-wrap gap-2 items-center">
                {roomPhotos.map(p => <PhotoThumb key={p.file_uri} fileUri={p.file_uri} name={p.name} />)}
                <label className="w-14 h-14 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 cursor-pointer">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => addPhoto(room.room_id, e.target.files?.[0])} />
                </label>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Consultation photos stay private — they never become marketing, website, or inventory photos automatically.</p>
            </div>

            {room.prep_level === 'heavy' && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">HEAVY PREPARATION — likely labor consideration (you decide the hours)</Badge>
            )}
          </div>
        );
      })}
    </div>
  );
}