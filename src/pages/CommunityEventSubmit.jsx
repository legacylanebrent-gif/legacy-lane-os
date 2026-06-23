import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Upload, X, Loader2, CheckCircle, ArrowLeft, MapPin, Calendar, DollarSign, Globe } from 'lucide-react';
import UniversalHeader from '@/components/layout/UniversalHeader';
import SharedFooter from '@/components/layout/SharedFooter';
import { useSEO } from '@/hooks/useSEO';

const EVENT_TYPES = [
  { key: 'flea_market', label: 'Flea Market' },
  { key: 'antique_show', label: 'Antique Show' },
  { key: 'craft_show', label: 'Craft Show' },
  { key: 'collectibles_show', label: 'Collectibles Show' },
  { key: 'other', label: 'Other' },
];

export default function CommunityEventSubmit() {
  useSEO({
    title: 'Submit Your Event | Free Flea Market & Antique Show Promotion',
    description: 'Promote your flea market, antique show, or community event for free on EstateSalen.com.',
  });

  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    event_type: 'flea_market',
    organizer_name: '',
    organizer_email: '',
    organizer_phone: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    start_date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    website_url: '',
    admission_fee: '',
  });
  const [photos, setPhotos] = useState([]);

  useEffect(() => {
    base44.auth.me().then(u => {
      if (!u) {
        base44.auth.redirectToLogin(window.location.href);
        return;
      }
      setUser(u);
      setForm(f => ({
        ...f,
        organizer_name: u.company_name || u.full_name || '',
        organizer_email: u.email || '',
        organizer_phone: u.phone || '',
      }));
      setLoading(false);
    }).catch(() => {
      base44.auth.redirectToLogin(window.location.href);
    });
  }, []);

  const handlePhotoUpload = async (files) => {
    if (!files || files.length === 0) return;
    setUploadingPhotos(true);
    try {
      const uploaded = [];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploaded.push(file_url);
      }
      setPhotos(prev => [...prev, ...uploaded]);
    } catch (e) {
      console.error('Photo upload error:', e);
      alert('Error uploading photos. Please try again.');
    } finally {
      setUploadingPhotos(false);
    }
  };

  const removePhoto = (idx) => {
    setPhotos(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.organizer_name || !form.street || !form.city || !form.state || !form.start_date) {
      alert('Please fill in all required fields.');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await base44.functions.invoke('submitCommunityEvent', {
        ...form,
        property_address: {
          street: form.street,
          city: form.city,
          state: form.state,
          zip: form.zip,
        },
        photos,
      });

      if (data?.success) {
        setSubmitted(true);
      } else {
        throw new Error(data?.error || 'Submission failed');
      }
    } catch (err) {
      console.error('Submit error:', err);
      alert('Error submitting event: ' + (err.message || 'Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50 to-cyan-50 flex items-center justify-center px-4">
        <Card className="max-w-lg w-full text-center p-8">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-serif font-bold text-slate-900 mb-2">Event Submitted!</h2>
          <p className="text-slate-600 mb-6">
            Your event has been submitted as a draft. Our team will review it and publish it to the map and calendar once approved. We'll use your contact info ({form.organizer_email}) for any communication.
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => navigate('/CommunityEvents')} className="bg-teal-600 hover:bg-teal-700 text-white">
              View Events
            </Button>
            <Button variant="outline" onClick={() => { setSubmitted(false); setForm({ ...form, title: '', description: '', start_date: '', end_date: '', start_time: '', end_time: '', website_url: '', admission_fee: '', street: '', city: '', state: '', zip: '' }); setPhotos([]); }}>
              Submit Another
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50 to-cyan-50">
      <UniversalHeader user={user} isAuthenticated={!!user} />

      <div className="max-w-3xl mx-auto px-4 py-10">
        <Link to="/CommunityEvents" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-teal-600 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Events
        </Link>

        <div className="mb-8">
          <div className="inline-flex items-center gap-2 bg-teal-100 text-teal-700 text-sm font-semibold px-3 py-1 rounded-full mb-3">
            <MapPin className="w-4 h-4" /> Free Event Promotion
          </div>
          <h1 className="text-3xl font-serif font-bold text-slate-900 mb-2">Submit Your Event</h1>
          <p className="text-slate-600">
            Promote your flea market, antique show, or community event for free. Events appear on the local map and calendar after admin approval.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardContent className="p-6 space-y-4">
              <h3 className="font-semibold text-slate-800">Event Details</h3>

              <div>
                <Label>Event Name *</Label>
                <Input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Spring Antique & Collectibles Show"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Event Type *</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {EVENT_TYPES.map(t => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setForm({ ...form, event_type: t.key })}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        form.event_type === t.key
                          ? 'bg-teal-600 text-white'
                          : 'bg-white text-slate-600 border border-slate-200 hover:border-teal-300'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Tell visitors what to expect — vendors, food, parking, special items..."
                  className="mt-1 min-h-[120px]"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Start Date *</Label>
                  <Input
                    type="date"
                    required
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Daily Start Time</Label>
                  <Input
                    type="time"
                    value={form.start_time}
                    onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Daily End Time</Label>
                  <Input
                    type="time"
                    value={form.end_time}
                    onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" /> Admission Fee</Label>
                  <Input
                    value={form.admission_fee}
                    onChange={(e) => setForm({ ...form, admission_fee: e.target.value })}
                    placeholder="Free, $5, $10/person..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="flex items-center gap-1"><Globe className="w-3.5 h-3.5" /> Website URL</Label>
                  <Input
                    type="url"
                    value={form.website_url}
                    onChange={(e) => setForm({ ...form, website_url: e.target.value })}
                    placeholder="https://..."
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 space-y-4">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-teal-600" /> Event Location
              </h3>
              <p className="text-sm text-slate-500">The address will be geocoded automatically to place your event on the map.</p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Label>Street Address *</Label>
                  <Input
                    required
                    value={form.street}
                    onChange={(e) => setForm({ ...form, street: e.target.value })}
                    placeholder="123 Main Street"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>City *</Label>
                  <Input
                    required
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>State *</Label>
                  <Input
                    required
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                    placeholder="NY"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>ZIP</Label>
                  <Input
                    value={form.zip}
                    onChange={(e) => setForm({ ...form, zip: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 space-y-4">
              <h3 className="font-semibold text-slate-800">Organizer Contact</h3>
              <p className="text-sm text-slate-500">Your contact info will be used for communication about your event.</p>
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <Label>Organizer Name *</Label>
                  <Input
                    required
                    value={form.organizer_name}
                    onChange={(e) => setForm({ ...form, organizer_name: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    required
                    value={form.organizer_email}
                    onChange={(e) => setForm({ ...form, organizer_email: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={form.organizer_phone}
                    onChange={(e) => setForm({ ...form, organizer_phone: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 space-y-4">
              <h3 className="font-semibold text-slate-800">Event Photos (Optional)</h3>
              <div className="flex items-center gap-3">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handlePhotoUpload(Array.from(e.target.files))}
                  />
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium text-slate-700">
                    {uploadingPhotos ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {uploadingPhotos ? 'Uploading...' : 'Upload Photos'}
                  </span>
                </label>
              </div>
              {photos.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {photos.map((url, idx) => (
                    <div key={idx} className="relative group">
                      <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-24 object-cover rounded-lg" />
                      <button
                        type="button"
                        onClick={() => removePhoto(idx)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={submitting}
              className="bg-teal-600 hover:bg-teal-700 text-white flex-1"
              size="lg"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <MapPin className="w-4 h-4 mr-2" />}
              {submitting ? 'Submitting...' : 'Submit Event for Review'}
            </Button>
            <Link to="/CommunityEvents">
              <Button type="button" variant="outline" size="lg">Cancel</Button>
            </Link>
          </div>
        </form>
      </div>

      <SharedFooter />
    </div>
  );
}