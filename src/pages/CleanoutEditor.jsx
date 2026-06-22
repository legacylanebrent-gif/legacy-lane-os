import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Plus, ArrowLeft, Trash2, Upload, Eye, Building2,
  MapPin, Calendar, Image as ImageIcon, Loader2, Send
} from 'lucide-react';
import { format } from 'date-fns';

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'bg-slate-100 text-slate-700' },
  published: { label: 'Accepting Bids', color: 'bg-green-100 text-green-700' },
  bidding_closed: { label: 'Bidding Closed', color: 'bg-amber-100 text-amber-700' },
  awarded: { label: 'Awarded', color: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Completed', color: 'bg-purple-100 text-purple-700' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700' },
};

export default function CleanoutEditor() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id');
  const isListMode = !editId;
  const isNewMode = editId === 'new';

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cleanouts, setCleanouts] = useState([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    property_address: { street: '', city: '', state: '', zip: '' },
    cleanout_deadline: '',
    scope_description: '',
    access_notes: '',
    photos: []
  });
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [currentCleanoutId, setCurrentCleanoutId] = useState(null);

  useEffect(() => {
    setLoading(true);
    base44.auth.me().then(u => {
      setUser(u);
      if (isListMode) {
        loadCleanouts(u.id);
      } else if (!isNewMode) {
        loadCleanout(editId);
      } else {
        setLoading(false);
      }
    }).catch(() => setLoading(false));
  }, [editId]);

  const loadCleanouts = async (userId) => {
    try {
      const list = await base44.entities.Cleanout.filter({ operator_id: userId }, '-created_date', 50);
      setCleanouts(list);
    } catch (err) {
      console.error('Error loading cleanouts:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCleanout = async (id) => {
    try {
      const results = await base44.entities.Cleanout.filter({ id });
      if (results.length > 0) {
        const c = results[0];
        setForm({
          title: c.title || '',
          description: c.description || '',
          property_address: c.property_address || { street: '', city: '', state: '', zip: '' },
          cleanout_deadline: c.cleanout_deadline || '',
          scope_description: c.scope_description || '',
          access_notes: c.access_notes || '',
          photos: c.photos || []
        });
        setCurrentCleanoutId(c.id);
      }
    } catch (err) {
      console.error('Error loading cleanout:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploadingPhotos(true);
    try {
      const urls = [];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        urls.push(file_url);
      }
      setForm(prev => ({ ...prev, photos: [...prev.photos, ...urls] }));
    } catch (err) {
      alert('Failed to upload photos: ' + err.message);
    } finally {
      setUploadingPhotos(false);
      e.target.value = '';
    }
  };

  const handleRemovePhoto = (idx) => {
    setForm(prev => ({ ...prev, photos: prev.photos.filter((_, i) => i !== idx) }));
  };

  const buildPayload = () => ({
    ...form,
    operator_id: user.id,
    operator_name: user.full_name || user.company_name || ''
  });

  const handleSaveDraft = async () => {
    if (!form.title || !form.cleanout_deadline) {
      alert('Title and deadline are required');
      return;
    }
    setSaving(true);
    try {
      if (currentCleanoutId) {
        await base44.entities.Cleanout.update(currentCleanoutId, buildPayload());
      } else {
        const created = await base44.entities.Cleanout.create({ ...buildPayload(), status: 'draft' });
        setCurrentCleanoutId(created.id);
        navigate(`/CleanoutEditor?id=${created.id}`, { replace: true });
      }
      alert('Saved as draft');
    } catch (err) {
      alert('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!form.title || !form.cleanout_deadline) {
      alert('Title and deadline are required');
      return;
    }
    if (form.photos.length === 0) {
      alert('Please upload at least one photo before publishing');
      return;
    }
    setPublishing(true);
    try {
      let cleanoutId = currentCleanoutId;
      if (cleanoutId) {
        await base44.entities.Cleanout.update(cleanoutId, buildPayload());
      } else {
        const created = await base44.entities.Cleanout.create({ ...buildPayload(), status: 'draft' });
        cleanoutId = created.id;
      }

      const res = await base44.functions.invoke('notifyCleanoutVendors', { cleanout_id: cleanoutId });
      if (res.data?.success) {
        alert(`Cleanout published! ${res.data.notified} vendors notified.`);
        navigate(`/CleanoutDetail?id=${cleanoutId}`);
      } else {
        alert('Failed to publish: ' + (res.data?.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Failed to publish: ' + err.message);
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="h-64 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  // ── LIST MODE ──
  if (isListMode) {
    return (
      <div className="p-6 lg:p-8 space-y-6 mt-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mt-4 gap-3">
          <div>
            <h1 className="text-3xl md:text-4xl font-serif font-bold text-slate-900 mb-1 md:mb-2">My Cleanouts</h1>
            <p className="text-sm md:text-base text-slate-600">Publish cleanout opportunities for vendor bidding</p>
          </div>
          <Button onClick={() => navigate('/CleanoutEditor?id=new')} className="bg-cyan-600 hover:bg-cyan-700">
            <Plus className="w-4 h-4 mr-2" />
            Create Cleanout
          </Button>
        </div>

        {cleanouts.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No cleanouts yet</h3>
              <p className="text-slate-500 mb-4">Create your first cleanout to get vendor bids.</p>
              <Button onClick={() => navigate('/CleanoutEditor?id=new')} className="bg-cyan-600 hover:bg-cyan-700">
                <Plus className="w-4 h-4 mr-2" />
                Create Cleanout
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {cleanouts.map(cleanout => {
              const sc = STATUS_CONFIG[cleanout.status] || STATUS_CONFIG.draft;
              return (
                <Card key={cleanout.id} className="overflow-hidden hover:shadow-lg transition-shadow flex flex-col md:flex-row">
                  {cleanout.photos && cleanout.photos.length > 0 && (
                    <div className="md:w-48 h-40 md:h-auto overflow-hidden flex-shrink-0">
                      <img src={cleanout.photos[0]} alt={cleanout.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <CardContent className="p-4 flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-base md:text-lg font-semibold text-slate-900 flex-1">{cleanout.title}</h3>
                      <Badge className={`text-[10px] ${sc.color}`}>{sc.label}</Badge>
                    </div>
                    <div className="space-y-1.5 text-sm text-slate-600">
                      {cleanout.property_address && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-cyan-600 flex-shrink-0" />
                          <span className="text-xs">{cleanout.property_address.street ? cleanout.property_address.street + ', ' : ''}{cleanout.property_address.city}, {cleanout.property_address.state} {cleanout.property_address.zip}</span>
                        </div>
                      )}
                      {cleanout.cleanout_deadline && (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                          <span className="text-xs">Complete by: {format(new Date(cleanout.cleanout_deadline + 'T00:00:00'), 'MMM d, yyyy')}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="text-xs">{cleanout.photos?.length || 0} photos</span>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button variant="outline" size="sm" onClick={() => navigate(`/CleanoutDetail?id=${cleanout.id}`)}>
                        <Eye className="w-3 h-3 mr-1" /> View
                      </Button>
                      {cleanout.status === 'draft' && (
                        <Button variant="outline" size="sm" onClick={() => navigate(`/CleanoutEditor?id=${cleanout.id}`)}>
                          <Building2 className="w-3 h-3 mr-1" /> Edit
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── EDITOR MODE (new or existing) ──
  return (
    <div className="p-6 lg:p-8 space-y-6 mt-4">
      <div className="flex items-center gap-3 mt-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/CleanoutEditor')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to List
        </Button>
        <h1 className="text-2xl md:text-3xl font-serif font-bold text-slate-900">
          {isNewMode ? 'New Cleanout' : 'Edit Cleanout'}
        </h1>
      </div>

      <Card>
        <CardContent className="p-6 space-y-5">
          <div>
            <Label htmlFor="title">Cleanout Title *</Label>
            <Input id="title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. 3-Bedroom House Cleanout — Holmdel" />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Brief description of the cleanout..." className="h-20" />
          </div>

          <div className="space-y-3">
            <Label>Property Address</Label>
            <Input value={form.property_address.street} onChange={e => setForm({ ...form, property_address: { ...form.property_address, street: e.target.value } })} placeholder="Street Address" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Input value={form.property_address.city} onChange={e => setForm({ ...form, property_address: { ...form.property_address, city: e.target.value } })} placeholder="City" />
              <Input value={form.property_address.state} onChange={e => setForm({ ...form, property_address: { ...form.property_address, state: e.target.value } })} placeholder="State" />
              <Input value={form.property_address.zip} onChange={e => setForm({ ...form, property_address: { ...form.property_address, zip: e.target.value } })} placeholder="ZIP" className="col-span-2 md:col-span-1" />
            </div>
          </div>

          <div>
            <Label htmlFor="deadline">Cleanout Deadline *</Label>
            <Input id="deadline" type="date" value={form.cleanout_deadline} onChange={e => setForm({ ...form, cleanout_deadline: e.target.value })} />
            <p className="text-xs text-slate-500 mt-1">Date by which the cleanout must be completed.</p>
          </div>

          <div>
            <Label htmlFor="scope">Scope of Work</Label>
            <Textarea id="scope" value={form.scope_description} onChange={e => setForm({ ...form, scope_description: e.target.value })} placeholder="What needs to be cleaned out? e.g. Full house including basement and garage, furniture and household items, some yard debris..." className="h-24" />
          </div>

          <div>
            <Label htmlFor="access">Access Notes</Label>
            <Textarea id="access" value={form.access_notes} onChange={e => setForm({ ...form, access_notes: e.target.value })} placeholder="How to access the property, key pickup, etc." className="h-20" />
          </div>

          <div>
            <Label>Photos</Label>
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center">
              {uploadingPhotos ? (
                <div className="flex items-center justify-center gap-2 text-slate-500">
                  <Loader2 className="w-5 h-5 animate-spin" /> Uploading...
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-500 mb-2">Click to upload photos</p>
                  <input type="file" multiple accept="image/*" onChange={handlePhotoUpload} className="hidden" id="photo-upload" />
                  <Button variant="outline" size="sm" asChild>
                    <label htmlFor="photo-upload" className="cursor-pointer">Select Photos</label>
                  </Button>
                </>
              )}
            </div>
            {form.photos.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 mt-4">
                {form.photos.map((url, idx) => (
                  <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200">
                    <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      onClick={() => handleRemovePhoto(idx)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button variant="outline" onClick={handleSaveDraft} disabled={saving || publishing} className="flex-1">
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : 'Save as Draft'}
            </Button>
            <Button onClick={handlePublish} disabled={saving || publishing || uploadingPhotos} className="bg-cyan-600 hover:bg-cyan-700 flex-1">
              {publishing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Publishing...</> : <><Send className="w-4 h-4 mr-2" /> Publish to Vendors</>}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}