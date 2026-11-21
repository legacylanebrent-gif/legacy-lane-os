import React, { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Camera, ImagePlus, Loader2, Trash2, Check, MinusCircle, Ban, X } from 'lucide-react';
import PhotoThumb from '@/components/consultation/PhotoThumb';
import { ROOM_SCOPE_OPTIONS, ROOM_NAME_SUGGESTIONS, scopeOption, zoneFromRoom } from './roomModel';

const SCOPE_ICONS = { all_items: Check, some_items: MinusCircle, do_not_enter: Ban };

// Photo Taker: walk the house with the phone, photograph each room, then say
// what is for sale in it. Each saved room becomes a room profile for the team
// plus a room on the sale's room list.
export default function RoomPhotoBuilder({ sale, onChanged }) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [scope, setScope] = useState('all_items');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState([]);
  const [saving, setSaving] = useState(false);
  const [busyRoom, setBusyRoom] = useState(null);
  const [error, setError] = useState('');
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);

  useEffect(() => {
    if (!sale?.id) return;
    let live = true;
    base44.entities.RoomProfile.filter({ sale_id: sale.id }, '-created_date')
      .then(res => { if (live) setRooms(Array.isArray(res) ? res : res.items || []); })
      .catch(err => console.error('Could not load rooms', err))
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [sale?.id]);

  const addFiles = (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setPhotos(prev => [...prev, ...files.map(file => ({ file, url: URL.createObjectURL(file) }))]);
  };

  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setName('');
    setScope('all_items');
    setNotes('');
    setPhotos([]);
    setError('');
  };

  const saveRoom = async () => {
    const roomName = name.trim();
    if (!roomName) { setError('Give the room a name first.'); return; }
    if (photos.length === 0) { setError('Take at least one photo of the room.'); return; }
    setSaving(true);
    setError('');
    try {
      const uris = [];
      for (const photo of photos) {
        const up = await base44.integrations.Core.UploadPrivateFile({ file: photo.file });
        uris.push(up.file_uri);
      }
      const zone = zoneFromRoom({ name: roomName, saleScope: scope, workerNotes: notes.trim() });
      await base44.entities.EstateSale.update(sale.id, { prep_zones: [...(sale.prep_zones || []), zone] });
      const created = await base44.entities.RoomProfile.create({
        sale_id: sale.id,
        operator_id: sale.operator_id,
        sale_team_ids: sale.sale_team || [],
        zone_id: zone.zone_id,
        name: roomName,
        sale_scope: scope,
        photos: uris,
        worker_notes: notes.trim(),
      });
      setRooms(prev => [created, ...prev]);
      resetForm();
      if (onChanged) onChanged();
    } catch (e) {
      console.error(e);
      setError('Could not save this room. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const changeScope = async (room, key) => {
    setBusyRoom(room.id);
    try {
      const opt = scopeOption(key);
      await base44.entities.RoomProfile.update(room.id, { sale_scope: key });
      const zones = (sale.prep_zones || []).map(z =>
        z.zone_id === room.zone_id
          ? { ...z, access_class: opt.access_class, staging_purpose: opt.staging_purpose }
          : z
      );
      await base44.entities.EstateSale.update(sale.id, { prep_zones: zones });
      setRooms(prev => prev.map(r => (r.id === room.id ? { ...r, sale_scope: key } : r)));
      if (onChanged) onChanged();
    } catch (e) {
      console.error(e);
    } finally {
      setBusyRoom(null);
    }
  };

  const removeRoom = async (room) => {
    if (!confirm(`Remove "${room.name}"? Its photos and room profile are deleted.`)) return;
    setBusyRoom(room.id);
    try {
      await base44.entities.RoomProfile.delete(room.id);
      const zones = (sale.prep_zones || []).filter(z => z.zone_id !== room.zone_id);
      await base44.entities.EstateSale.update(sale.id, { prep_zones: zones });
      setRooms(prev => prev.filter(r => r.id !== room.id));
      if (onChanged) onChanged();
    } catch (e) {
      console.error(e);
    } finally {
      setBusyRoom(null);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Camera className="w-5 h-5 text-cyan-700" />Room Photos
        </CardTitle>
        <p className="text-xs text-slate-500">
          Walk the house and photograph each room. Then say what is for sale in it. Your team sees the room and the answer.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Add a room */}
        <div className="rounded-lg border border-slate-200 p-3 space-y-3">
          <div className="space-y-2">
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Room name (e.g. Living Room)"
              className="text-sm"
            />
            <div className="flex flex-wrap gap-1.5">
              {ROOM_NAME_SUGGESTIONS.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setName(s)}
                  className={`text-[11px] px-2 py-0.5 rounded-full border ${name === s ? 'bg-cyan-700 border-cyan-700 text-white' : 'bg-white border-slate-200 text-slate-600'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => cameraRef.current?.click()} className="sm:flex-1">
              <Camera className="w-4 h-4 mr-2" />Take Photos
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => galleryRef.current?.click()} className="sm:flex-1">
              <ImagePlus className="w-4 h-4 mr-2" />Add From Phone
            </Button>
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />
            <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />
          </div>

          {photos.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {photos.map((photo, i) => (
                <div key={`${photo.url}-${i}`} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200">
                  <img src={photo.url} alt={`Room photo ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5"
                    aria-label={`Remove photo ${i + 1}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-1.5">
            <p className="text-[11px] font-medium text-slate-600">What is for sale in this room?</p>
            {ROOM_SCOPE_OPTIONS.map(opt => {
              const Icon = SCOPE_ICONS[opt.key];
              const on = scope === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setScope(opt.key)}
                  className={`w-full text-left flex items-start gap-2 rounded-lg border p-2.5 ${on ? 'border-cyan-600 bg-cyan-50' : 'border-slate-200 bg-white'}`}
                >
                  <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${on ? 'text-cyan-700' : 'text-slate-400'}`} />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-slate-900">{opt.label}</span>
                    <span className="block text-[11px] text-slate-600">{opt.helper}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <Input
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Anything the team should know about this room (optional)"
            className="text-sm"
          />

          {error && <p className="text-xs text-red-600">{error}</p>}

          <Button onClick={saveRoom} disabled={saving} className="w-full bg-cyan-700 hover:bg-cyan-800">
            {saving ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Saving room...</> : 'Save Room'}
          </Button>
        </div>

        {/* Rooms already done */}
        {loading ? (
          <p className="text-sm text-slate-400">Loading rooms...</p>
        ) : rooms.length === 0 ? (
          <p className="text-sm text-slate-400">No rooms yet. Start with the room you are standing in.</p>
        ) : (
          <div className="space-y-3">
            {rooms.map(room => {
              const opt = scopeOption(room.sale_scope);
              return (
                <div key={room.id} className="rounded-lg border border-slate-200 p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 text-sm break-words">{room.name}</p>
                      <Badge variant="outline" className={`text-[10px] mt-1 ${opt.badge}`}>{opt.label}</Badge>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:text-red-700 h-7 px-2 flex-shrink-0"
                      disabled={busyRoom === room.id}
                      onClick={() => removeRoom(room)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  {(room.photos || []).length > 0 && (
                    <div className="flex gap-1.5 overflow-x-auto pb-1">
                      {room.photos.map((uri, i) => (
                        <PhotoThumb key={`${uri}-${i}`} fileUri={uri} name={`${room.name} photo ${i + 1}`} className="w-16 h-16 flex-shrink-0" />
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1.5">
                    {ROOM_SCOPE_OPTIONS.map(o => (
                      <button
                        key={o.key}
                        type="button"
                        disabled={busyRoom === room.id}
                        onClick={() => changeScope(room, o.key)}
                        className={`text-[10px] px-2 py-0.5 rounded-full border ${room.sale_scope === o.key ? o.badge : 'bg-white border-slate-200 text-slate-500'}`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>

                  {room.worker_notes && <p className="text-xs text-slate-600">{room.worker_notes}</p>}
                </div>
              );
            })}
          </div>
        )}

        <p className="text-[10px] text-slate-400">Room photos are private (stored privately) and never appear in the public sale gallery or marketing.</p>
      </CardContent>
    </Card>
  );
}