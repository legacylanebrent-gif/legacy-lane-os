import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Plus, ArrowLeft, Trash2, Upload, Eye, Heart,
  MapPin, Calendar, Image as ImageIcon, Loader2, Send, User, Phone, Mail
} from 'lucide-react';
import { format } from 'date-fns';

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'bg-slate-100 text-slate-700' },
  published: { label: 'Accepting Responses', color: 'bg-green-100 text-green-700' },
  responses_closed: { label: 'Responses Closed', color: 'bg-amber-100 text-amber-700' },
  awarded: { label: 'Awarded', color: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Completed', color: 'bg-purple-100 text-purple-700' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700' },
};

export default function DonationEditor() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id');
  const isListMode = !editId;
  const isNewMode = editId === 'new';

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [donations, setDonations] = useState([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    property_address: { street: '', city: '', state: '', zip: '' },
    pickup_deadline: '',
    scope_description: '',
    access_notes: '',
    photos: [],
    operator_handling_donations: false,
    seller_name: '',
    seller_phone: '',
    seller_email: ''
  });
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [currentDonationId, setCurrentDonationId] = useState(null);

  useEffect(() => {
    setLoading(true);
    base44.auth.me().then(u => {
      setUser(u);
      const isTeamRole = ['team_admin', 'team_member', 'team_marketer'].includes(u.primary_account_type);
      const operatorId = isTeamRole ? u.operator_id : u.id;
      if (isListMode) {
        loadDonations(operatorId);
      } else if (!isNewMode) {
        loadDonation(editId, operatorId);
      } else {
        setLoading(false);
      }
    }).catch(() => setLoading(false));
  }, [editId]);

  const loadDonations = async (userId) => {
    try {
      const list = await base44.entities.Donation.filter({ operator_id: userId }, '-created_date', 50);
      setDonations(list);
    } catch (err) {
      console.error('Error loading donations:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDonation = async (id, operatorId) => {
    try {
      const results = await base44.entities.Donation.filter({ id });
      if (results.length > 0) {
        const d = results[0];
        if (d.operator_id !== operatorId) {
          setLoading(false);
          return;
        }
        setForm({
          title: d.title || '',
          description: d.description || '',
          property_address: d.property_address || { street: '', city: '', state: '', zip: '' },
          pickup_deadline: d.pickup_deadline || '',
          scope_description: d.scope_description || '',
          access_notes: d.access_notes || '',
          photos: d.photos || [],
          operator_handling_donations: d.operator_handling_donations || false,
          seller_name: d.seller_name || '',
          seller_phone: d.seller_phone || '',
          seller_email: d.seller_email || ''
        });
        setCurrentDonationId(d.id);
      }
    } catch (err) {
      console.error('Error loading donation:', err);
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
    if (!form.title || !form.pickup_deadline) {
      alert('Title and pickup deadline are required');
      return;
    }
    setSaving(true);
    try {
      if (currentDonationId) {
        await base44.entities.Donation.update(currentDonationId, buildPayload());
      } else {
        const created = await base44.entities.Donation.create({ ...buildPayload(), status: 'draft' });
        setCurrentDonationId(created.id);
        navigate(`/DonationEditor?id=${created.id}`, { replace: true });
      }
      alert('Saved as draft');
    } catch (err) {
      alert('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!form.title || !form.pickup_deadline) {
      alert('Title and pickup deadline are required');
      return;
    }
    if (form.photos.length === 0) {
      alert('Please upload at least one photo before publishing');
      return;
    }
    if (!form.operator_handling_donations && !form.seller_name && !form.seller_phone && !form.seller_email) {
      alert('Please provide at least one seller contact detail (name, phone, or email), or enable "Operator is handling all donations"');
      return;
    }
    setPublishing(true);
    try {
      let donationId = currentDonationId;
      if (donationId) {
        await base44.entities.Donation.update(donationId, buildPayload());
      } else {
        const created = await base44.entities.Donation.create({ ...buildPayload(), status: 'draft' });
        donationId = created.id;
      }

      const res = await base44.functions.invoke('notifyDonationCompanies', { donation_id: donationId });
      if (res.data?.success) {
        alert(`Donation published! ${res.data.notified} donation companies notified.`);
        navigate(`/DonationDetail?id=${donationId}`);
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
            <h1 className="text-3xl md:text-4xl font-serif font-bold text-slate-900 mb-1 md:mb-2">My Donations</h1>
            <p className="text-sm md:text-base text-slate-600">Publish donation pickup opportunities for local donation companies</p>
          </div>
          <Button onClick={() => navigate('/DonationEditor?id=new')} className="bg-pink-600 hover:bg-pink-700">
            <Plus className="w-4 h-4 mr-2" />
            Create Donation
          </Button>
        </div>

        {donations.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Heart className="w-12 h-12 text-pink-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No donation events yet</h3>
              <p className="text-slate-500 mb-4">Create your first donation event to notify local donation companies.</p>
              <Button onClick={() => navigate('/DonationEditor?id=new')} className="bg-pink-600 hover:bg-pink-700">
                <Plus className="w-4 h-4 mr-2" />
                Create Donation
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {donations.map(donation => {
              const sc = STATUS_CONFIG[donation.status] || STATUS_CONFIG.draft;
              return (
                <Card key={donation.id} className="overflow-hidden hover:shadow-lg transition-shadow flex flex-col md:flex-row">
                  {donation.photos && donation.photos.length > 0 && (
                    <div className="md:w-48 h-40 md:h-auto overflow-hidden flex-shrink-0">
                      <img src={donation.photos[0]} alt={donation.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <CardContent className="p-4 flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-base md:text-lg font-semibold text-slate-900 flex-1">{donation.title}</h3>
                      <Badge className={`text-[10px] ${sc.color}`}>{sc.label}</Badge>
                    </div>
                    <div className="space-y-1.5 text-sm text-slate-600">
                      {donation.property_address && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-pink-600 flex-shrink-0" />
                          <span className="text-xs">{donation.property_address.street ? donation.property_address.street + ', ' : ''}{donation.property_address.city}, {donation.property_address.state} {donation.property_address.zip}</span>
                        </div>
                      )}
                      {donation.pickup_deadline && (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                          <span className="text-xs">Pickup by: {format(new Date(donation.pickup_deadline + 'T00:00:00'), 'MMM d, yyyy')}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="text-xs">{donation.photos?.length || 0} photos</span>
                      </div>
                      {donation.operator_handling_donations && (
                        <Badge className="text-[10px] bg-blue-50 text-blue-700">Operator Handling</Badge>
                      )}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button variant="outline" size="sm" onClick={() => navigate(`/DonationDetail?id=${donation.id}`)}>
                        <Eye className="w-3 h-3 mr-1" /> View
                      </Button>
                      {donation.status === 'draft' && (
                        <Button variant="outline" size="sm" onClick={() => navigate(`/DonationEditor?id=${donation.id}`)}>
                          <Heart className="w-3 h-3 mr-1" /> Edit
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
        <Button variant="outline" size="sm" onClick={() => navigate('/DonationEditor')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to List
        </Button>
        <h1 className="text-2xl md:text-3xl font-serif font-bold text-slate-900">
          {isNewMode ? 'New Donation Event' : 'Edit Donation Event'}
        </h1>
      </div>

      <Card>
        <CardContent className="p-6 space-y-5">
          <div>
            <Label htmlFor="title">Donation Title *</Label>
            <Input id="title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. 3-Bedroom House Donation Pickup — Holmdel" />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Brief description of the donation opportunity..." className="h-20" />
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
            <Label htmlFor="deadline">Pickup Deadline *</Label>
            <Input id="deadline" type="date" value={form.pickup_deadline} onChange={e => setForm({ ...form, pickup_deadline: e.target.value })} />
            <p className="text-xs text-slate-500 mt-1">Date by which donations must be picked up.</p>
          </div>

          <div>
            <Label htmlFor="scope">Items Available for Donation</Label>
            <Textarea id="scope" value={form.scope_description} onChange={e => setForm({ ...form, scope_description: e.target.value })} placeholder="What items are available? e.g. Furniture, clothing, kitchenware, books, household items, appliances..." className="h-24" />
          </div>

          <div>
            <Label htmlFor="access">Access Notes</Label>
            <Textarea id="access" value={form.access_notes} onChange={e => setForm({ ...form, access_notes: e.target.value })} placeholder="How to access the property for pickup, key pickup, etc." className="h-20" />
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

          {/* Seller Contact Details Section */}
          <div className="border border-pink-200 rounded-xl p-4 bg-pink-50/50 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Home Seller Contact Details</Label>
                <p className="text-xs text-slate-500 mt-1">These details will be shared with donation companies so they can coordinate directly with the seller.</p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.operator_handling_donations}
                  onCheckedChange={(checked) => setForm({ ...form, operator_handling_donations: checked })}
                />
                <Label className="text-sm cursor-pointer">Operator is handling all donations</Label>
              </div>
            </div>

            {!form.operator_handling_donations && (
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="seller_name" className="text-xs flex items-center gap-1"><User className="w-3 h-3" /> Seller Name</Label>
                  <Input id="seller_name" value={form.seller_name} onChange={e => setForm({ ...form, seller_name: e.target.value })} placeholder="John Smith" />
                </div>
                <div>
                  <Label htmlFor="seller_phone" className="text-xs flex items-center gap-1"><Phone className="w-3 h-3" /> Seller Phone</Label>
                  <Input id="seller_phone" value={form.seller_phone} onChange={e => setForm({ ...form, seller_phone: e.target.value })} placeholder="(555) 123-4567" />
                </div>
                <div>
                  <Label htmlFor="seller_email" className="text-xs flex items-center gap-1"><Mail className="w-3 h-3" /> Seller Email</Label>
                  <Input id="seller_email" type="email" value={form.seller_email} onChange={e => setForm({ ...form, seller_email: e.target.value })} placeholder="seller@email.com" />
                </div>
              </div>
            )}

            {form.operator_handling_donations && (
              <p className="text-sm text-blue-700 bg-blue-50 rounded-lg p-3">
                Seller contact details will <strong>not</strong> be shared with donation companies. You (the operator) will handle all coordination and responses.
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button variant="outline" onClick={handleSaveDraft} disabled={saving || publishing} className="flex-1">
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : 'Save as Draft'}
            </Button>
            <Button onClick={handlePublish} disabled={saving || publishing || uploadingPhotos} className="bg-pink-600 hover:bg-pink-700 flex-1">
              {publishing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Publishing...</> : <><Send className="w-4 h-4 mr-2" /> Publish to Donation Companies</>}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}