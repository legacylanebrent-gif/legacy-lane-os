import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Camera, Plus, X, Package, Users, Eye, EyeOff } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import PublishEventModal from '@/components/reseller/PublishEventModal';

const EVENT_TYPE_LABELS = {
  free_giveaway: 'Free Giveaway',
  low_cost_purchase: 'Low-Cost Item Purchase',
  fill_a_bag: 'Fill-A-Bag',
  fill_a_car: 'Fill-A-Car',
  fill_a_trailer: 'Fill-A-Trailer',
  bundle_buyout: 'Bundle Buyout',
};

const SELLER_GOAL_LABELS = {
  clear_as_much_as_possible: 'Clear as much as possible',
  avoid_cleanout_cost: 'Avoid cleanout cost',
  recover_small_amount: 'Recover small amount of money',
  bundle_remaining: 'Bundle remaining items',
  invite_trusted_resellers: 'Invite trusted resellers only',
};

export default function ResellerPackupEventEditor() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [event, setEvent] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [parentSale, setParentSale] = useState(null);
  const [eventId, setEventId] = useState(null);
  const [showPublishModal, setShowPublishModal] = useState(false);

  const [form, setForm] = useState({
    event_title: 'Post-Sale Reseller Pack-Up Event',
    event_type: '',
    event_date: '',
    start_time: '',
    end_time: '',
    max_reseller_spots: '',
    pickup_rules: 'Registered resellers only. Bring your own boxes, bags, labor, and vehicle. All items must be removed during the scheduled pickup window.',
    seller_goal: '',
    event_notes: '',
    bundle_buyout_amount: '',
    address_visibility: 'city_state_only',
    reseller_registration_required: true,
    invite_only: false,
    reseller_invite_radius_miles: '25',
  });

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const params = new URLSearchParams(window.location.search);
    const eid = params.get('eventId');
    const saleId = params.get('saleId');

    if (saleId) {
      const sales = await base44.entities.EstateSale.filter({ id: saleId });
      if (sales[0]) setParentSale(sales[0]);
    }

    if (eid) {
      setEventId(eid);
      const events = await base44.entities.ResellerPackupEvent.filter({ id: eid });
      if (events[0]) {
        const ev = events[0];
        setEvent(ev);
        setForm({
          event_title: ev.event_title || 'Post-Sale Reseller Pack-Up Event',
          event_type: ev.event_type || '',
          event_date: ev.event_date || '',
          start_time: ev.start_time || '',
          end_time: ev.end_time || '',
          max_reseller_spots: ev.max_reseller_spots || '',
          pickup_rules: ev.pickup_rules || '',
          seller_goal: ev.seller_goal || '',
          event_notes: ev.event_notes || '',
          bundle_buyout_amount: ev.bundle_buyout_amount || '',
          address_visibility: ev.address_visibility || 'city_state_only',
          reseller_registration_required: ev.reseller_registration_required ?? true,
          invite_only: ev.invite_only ?? false,
          reseller_invite_radius_miles: ev.reseller_invite_radius_miles ?? 25,
        });

        const eventPhotos = await base44.entities.ResellerPackupPhoto.filter({ event_id: eid });
        setPhotos(eventPhotos.sort((a, b) => a.sort_order - b.sort_order));

        const regs = await base44.entities.ResellerPackupRegistration.filter({ event_id: eid });
        setRegistrations(regs);
      }
    }

    setLoading(false);
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    if (!eventId) { alert('Save the event first before uploading photos.'); return; }

    setUploadingPhotos(true);
    setUploadProgress({ current: 0, total: files.length });
    try {
      for (let i = 0; i < files.length; i++) {
        setUploadProgress({ current: i + 1, total: files.length });
        const { file_url } = await base44.integrations.Core.UploadFile({ file: files[i] });
        const newPhoto = await base44.entities.ResellerPackupPhoto.create({
          event_id: eventId,
          original_sale_id: event?.original_sale_id || parentSale?.id,
          photo_url: file_url,
          storage_path: `reseller-packup/${eventId}`,
          sort_order: photos.length + i,
          uploaded_by: (await base44.auth.me()).id,
        });
        setPhotos(prev => [...prev, newPhoto]);
        await new Promise(r => setTimeout(r, 200));
      }
    } catch (err) {
      alert('Photo upload failed: ' + err.message);
    } finally {
      setUploadingPhotos(false);
      setUploadProgress({ current: 0, total: 0 });
      e.target.value = '';
    }
  };

  const handleDeletePhoto = async (photoId) => {
    if (!window.confirm('Delete this photo?')) return;
    await base44.entities.ResellerPackupPhoto.delete(photoId);
    setPhotos(prev => prev.filter(p => p.id !== photoId));
  };

  const handleSave = async () => {
    if (!form.event_type) { alert('Please select an event type.'); return; }
    setSaving(true);
    try {
      const user = await base44.auth.me();
      const saleId = parentSale?.id || event?.original_sale_id;
      const sale = parentSale || event;

      const payload = {
        ...form,
        max_reseller_spots: form.max_reseller_spots ? parseInt(form.max_reseller_spots) : null,
        bundle_buyout_amount: form.bundle_buyout_amount ? parseFloat(form.bundle_buyout_amount) : null,
        reseller_invite_radius_miles: form.reseller_invite_radius_miles ? parseInt(form.reseller_invite_radius_miles) : 25,
        original_sale_id: saleId,
        operator_id: sale?.operator_id || user.id,
        company_id: sale?.company_id || null,
        address: sale?.property_address?.street || '',
        city: sale?.property_address?.city || '',
        state: sale?.property_address?.state || '',
        zip: sale?.property_address?.zip || '',
        county: sale?.county || '',
        territory_id: sale?.territory_id || '',
        original_sale_title: sale?.title || '',
        original_sale_date: sale?.sale_dates?.[0]?.date || null,
      };

      if (eventId) {
        await base44.entities.ResellerPackupEvent.update(eventId, payload);
        alert('Event saved.');
      } else {
        const created = await base44.entities.ResellerPackupEvent.create(payload);
        setEventId(created.id);
        setEvent(created);
        alert('Event created. You can now upload photos.');
        window.history.replaceState({}, '', `?eventId=${created.id}&saleId=${saleId}`);
      }
    } catch (err) {
      alert('Save failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = () => {
    if (!eventId) { alert('Save the event first.'); return; }
    if (!photos.length) { alert('Please upload at least one photo before publishing.'); return; }
    if (!form.event_date) { alert('Please set an event date before publishing.'); return; }
    setShowPublishModal(true);
  };

  const handleConfirmPublish = async ({ include_sms }) => {
    setPublishing(true);
    setShowPublishModal(false);
    try {
      await base44.entities.ResellerPackupEvent.update(eventId, {
        status: 'open',
        published_to_resellers_at: new Date().toISOString(),
        photo_count: photos.length,
      });
      setEvent(prev => ({ ...prev, status: 'open', published_to_resellers_at: new Date().toISOString() }));

      // Trigger notifications (email + in-app always free; SMS if opted-in)
      const result = await base44.functions.invoke('notifyResellerEventResellers', {
        event_id: eventId,
        include_sms,
      });

      const data = result?.data || {};
      const smsNote = include_sms
        ? ` | ${data.sms_sent || 0} SMS sent ($${((data.sms_sent || 0) * 0.05).toFixed(2)})`
        : '';
      alert(`Event published! ${data.emails_sent || 0} email notifications sent${smsNote}.`);
    } catch (err) {
      alert('Publish failed: ' + err.message);
    } finally {
      setPublishing(false);
    }
  };

  const handleCloseEvent = async () => {
    if (!window.confirm('Close this event? Resellers will no longer be able to register.')) return;
    await base44.entities.ResellerPackupEvent.update(eventId, { status: 'closed' });
    setEvent(prev => ({ ...prev, status: 'closed' }));
  };

  const handleRegistrationAction = async (regId, action) => {
    const statusMap = { approve: 'approved', decline: 'declined', checkin: 'checked_in' };
    const updates = { status: statusMap[action] };
    if (action === 'approve') updates.approved_at = new Date().toISOString();
    if (action === 'checkin') updates.checked_in_at = new Date().toISOString();
    await base44.entities.ResellerPackupRegistration.update(regId, updates);
    setRegistrations(prev => prev.map(r => r.id === regId ? { ...r, ...updates } : r));
  };

  const statusBadge = (status) => {
    const colors = {
      draft: 'bg-slate-100 text-slate-600',
      open: 'bg-green-100 text-green-700',
      full: 'bg-amber-100 text-amber-700',
      closed: 'bg-red-100 text-red-700',
      cancelled: 'bg-red-100 text-red-700',
      completed: 'bg-blue-100 text-blue-700',
    };
    return <Badge className={colors[status] || 'bg-slate-100 text-slate-600'}>{status?.replace('_', ' ').toUpperCase()}</Badge>;
  };

  if (loading) return <div className="p-8"><div className="animate-pulse space-y-4"><div className="h-8 bg-slate-200 rounded w-1/3" /><div className="h-48 bg-slate-200 rounded" /></div></div>;

  const currentStatus = event?.status || 'draft';

  return (
    <div className="min-h-screen bg-slate-50">
      {showPublishModal && (
        <PublishEventModal
          event={event}
          radiusMiles={parseInt(form.reseller_invite_radius_miles) || 25}
          onConfirm={handleConfirmPublish}
          onCancel={() => setShowPublishModal(false)}
        />
      )}
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate(-1)} className="text-slate-500 hover:text-slate-800">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-purple-600" />
                <h1 className="text-lg font-bold text-slate-900 truncate">Reseller Pack-Up Event</h1>
                {statusBadge(currentStatus)}
              </div>
              {parentSale && <p className="text-xs text-slate-500">Attached to: {parentSale.title}</p>}
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
            {currentStatus === 'draft' && (
              <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white" onClick={handlePublish} disabled={publishing}>
                {publishing ? 'Publishing...' : 'Publish to Resellers'}
              </Button>
            )}
            {currentStatus === 'open' && (
              <Button size="sm" variant="outline" className="text-red-600 border-red-300" onClick={handleCloseEvent}>
                Close Event
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* Privacy Notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <EyeOff className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800 text-sm">Private Event — Not Public</p>
            <p className="text-amber-700 text-xs mt-0.5">This event will not appear on public sale pages, SEO listings, sitemaps, or any public directory. Only registered resellers can see it.</p>
          </div>
        </div>

        {/* Basic Info */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h2 className="text-base font-semibold text-slate-900">Event Details</h2>
            <div>
              <Label>Event Title</Label>
              <Input value={form.event_title} onChange={e => setForm(f => ({ ...f, event_title: e.target.value }))} placeholder="Post-Sale Reseller Pack-Up Event" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Event Type *</Label>
                <Select value={form.event_type} onValueChange={v => setForm(f => ({ ...f, event_type: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(EVENT_TYPE_LABELS).map(([val, label]) => (
                      <SelectItem key={val} value={val}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Seller Goal</Label>
                <Select value={form.seller_goal} onValueChange={v => setForm(f => ({ ...f, seller_goal: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select goal..." /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(SELLER_GOAL_LABELS).map(([val, label]) => (
                      <SelectItem key={val} value={val}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label>Event Date</Label>
                <Input type="date" value={form.event_date} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} />
              </div>
              <div>
                <Label>Start Time</Label>
                <Input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
              </div>
              <div>
                <Label>End Time</Label>
                <Input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Max Reseller Spots</Label>
                <Input type="number" min="1" value={form.max_reseller_spots} onChange={e => setForm(f => ({ ...f, max_reseller_spots: e.target.value }))} placeholder="e.g. 10" />
              </div>
              <div>
                <Label>Address Visibility</Label>
                <Select value={form.address_visibility} onValueChange={v => setForm(f => ({ ...f, address_visibility: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_address">Full Address (approved resellers only)</SelectItem>
                    <SelectItem value="city_state_only">City & State Only</SelectItem>
                    <SelectItem value="zip_only">ZIP Code Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.event_type === 'bundle_buyout' && (
              <div>
                <Label>Requested Bundle Buyout Amount (Optional)</Label>
                <Input type="number" min="0" step="0.01" value={form.bundle_buyout_amount} onChange={e => setForm(f => ({ ...f, bundle_buyout_amount: e.target.value }))} placeholder="Leave blank if flexible" />
                <p className="text-xs text-slate-500 mt-1">This is a simple buyout opportunity. No bidding. Resellers may request to inquire.</p>
              </div>
            )}
            <div>
              <Label>Pickup Rules</Label>
              <Textarea rows={3} value={form.pickup_rules} onChange={e => setForm(f => ({ ...f, pickup_rules: e.target.value }))} placeholder="Registered resellers only. Bring your own boxes, bags, labor, and vehicle..." />
            </div>
            <div>
              <Label>Additional Notes (Optional)</Label>
              <Textarea rows={2} value={form.event_notes} onChange={e => setForm(f => ({ ...f, event_notes: e.target.value }))} placeholder="Any other info for resellers..." />
            </div>
            <div className="flex flex-col gap-3 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-800">Registration Required</p>
                  <p className="text-xs text-slate-500">Resellers must register to see full details</p>
                </div>
                <Switch checked={form.reseller_registration_required} onCheckedChange={v => setForm(f => ({ ...f, reseller_registration_required: v }))} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-800">Invite Only</p>
                  <p className="text-xs text-slate-500">Only resellers you approve can register</p>
                </div>
                <Switch checked={form.invite_only} onCheckedChange={v => setForm(f => ({ ...f, invite_only: v }))} />
              </div>
              {!form.invite_only && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-slate-800">Reseller Notification Radius</p>
                      <p className="text-xs text-slate-500">Resellers within this radius of the sale address will be notified when you publish</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Input
                        type="number"
                        min="5"
                        max="150"
                        step="5"
                        value={form.reseller_invite_radius_miles}
                        onChange={e => setForm(f => ({ ...f, reseller_invite_radius_miles: e.target.value }))}
                        className="w-20 text-center"
                      />
                      <span className="text-sm text-slate-600 whitespace-nowrap">miles</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Photos */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Event Photos</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  These photos are stored separately from the original sale — no AI pricing, no titles, no Google Lens lookup.
                </p>
              </div>
              <Badge variant="outline">{photos.length} photo{photos.length !== 1 ? 's' : ''}</Badge>
            </div>

            {!eventId && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                Save the event first, then upload photos.
              </div>
            )}

            {eventId && (
              <>
                {uploadingPhotos && uploadProgress.total > 0 && (
                  <div className="space-y-1">
                    <Progress value={(uploadProgress.current / uploadProgress.total) * 100} />
                    <p className="text-xs text-slate-500 text-center">Uploading {uploadProgress.current} of {uploadProgress.total}...</p>
                  </div>
                )}

                {photos.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {photos.map(photo => (
                      <div key={photo.id} className="relative group rounded-lg overflow-hidden aspect-square bg-slate-200">
                        <img src={photo.photo_url} alt="Reseller event photo" className="w-full h-full object-cover" loading="lazy" />
                        <button
                          onClick={() => handleDeletePhoto(photo.id)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="border-2 border-dashed border-purple-300 rounded-lg p-4 text-center bg-purple-50">
                    <input type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} className="hidden" id="reseller-camera" disabled={uploadingPhotos} multiple />
                    <label htmlFor="reseller-camera" className="cursor-pointer block">
                      <Camera className="w-8 h-8 text-purple-600 mx-auto mb-1" />
                      <p className="text-sm font-medium text-purple-900">Take Photos</p>
                    </label>
                  </div>
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center bg-slate-50">
                    <input type="file" multiple accept="image/*" onChange={handlePhotoUpload} className="hidden" id="reseller-files" disabled={uploadingPhotos} />
                    <label htmlFor="reseller-files" className="cursor-pointer block">
                      <Plus className="w-8 h-8 text-slate-500 mx-auto mb-1" />
                      <p className="text-sm font-medium text-slate-700">Choose Files</p>
                    </label>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Registrations */}
        {eventId && registrations.length > 0 && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-slate-600" />
                <h2 className="text-base font-semibold text-slate-900">Reseller Registrations ({registrations.length})</h2>
              </div>
              <div className="space-y-3">
                {registrations.map(reg => (
                  <div key={reg.id} className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 text-sm">{reg.reseller_name}</p>
                      <p className="text-xs text-slate-500">{reg.reseller_company} · {reg.reseller_email}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <RegStatusBadge status={reg.status} />
                      {reg.status === 'pending' && (
                        <>
                          <Button size="sm" variant="outline" className="text-green-700 border-green-300 h-7 text-xs" onClick={() => handleRegistrationAction(reg.id, 'approve')}>Approve</Button>
                          <Button size="sm" variant="outline" className="text-red-600 border-red-300 h-7 text-xs" onClick={() => handleRegistrationAction(reg.id, 'decline')}>Decline</Button>
                        </>
                      )}
                      {reg.status === 'approved' && (
                        <Button size="sm" variant="outline" className="text-blue-700 border-blue-300 h-7 text-xs" onClick={() => handleRegistrationAction(reg.id, 'checkin')}>Check In</Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bottom actions */}
        <div className="flex gap-3 justify-end pb-8">
          <Button variant="outline" onClick={() => navigate(-1)}>Back</Button>
          <Button variant="outline" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Draft'}</Button>
          {currentStatus === 'draft' && (
            <Button className="bg-purple-600 hover:bg-purple-700 text-white" onClick={handlePublish} disabled={publishing}>
              {publishing ? 'Publishing...' : 'Publish to Resellers'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function RegStatusBadge({ status }) {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    waitlisted: 'bg-blue-100 text-blue-700',
    declined: 'bg-red-100 text-red-600',
    cancelled: 'bg-slate-100 text-slate-500',
    checked_in: 'bg-purple-100 text-purple-700',
  };
  return <Badge className={`text-xs ${colors[status] || 'bg-slate-100 text-slate-600'}`}>{status?.replace('_', ' ')}</Badge>;
}