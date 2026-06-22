import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  ArrowLeft, MapPin, Calendar, Heart, CheckCircle2, XCircle,
  Clock, MessageSquare, Award, Loader2, Lock, User, Phone, Mail
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

export default function DonationDetail() {
  const navigate = useNavigate();
  const donationId = new URLSearchParams(window.location.search).get('id');

  const [user, setUser] = useState(null);
  const [donation, setDonation] = useState(null);
  const [responses, setResponses] = useState([]);
  const [vendorProfile, setVendorProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [responseForm, setResponseForm] = useState({
    interested_items: '',
    can_facilitate_pickup: false,
    available_dates: '',
    message: ''
  });
  const [submittingResponse, setSubmittingResponse] = useState(false);
  const [acceptingId, setAcceptingId] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  useEffect(() => {
    loadData();
  }, [donationId]);

  const loadData = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);

      const results = await base44.entities.Donation.filter({ id: donationId });
      if (results.length === 0) {
        setAccessDenied(true);
        setLoading(false);
        return;
      }
      const donationData = results[0];
      setDonation(donationData);

      const isOperator = donationData.operator_id === userData.id;

      if (!isOperator) {
        // Check if user has a donation_company vendor profile
        const vpResults = await base44.entities.Vendor.filter({ user_id: userData.id, vendor_type: 'donation_company' });
        if (vpResults.length === 0) {
          setAccessDenied(true);
          setLoading(false);
          return;
        }
        setVendorProfile(vpResults[0]);

        if (donationData.status === 'draft') {
          setAccessDenied(true);
          setLoading(false);
          return;
        }
      }

      const responseResults = await base44.entities.DonationResponse.filter({ donation_id: donationId });
      setResponses(responseResults);

      if (!isOperator) {
        const existingResponse = responseResults.find(r => r.vendor_id === userData.id);
        if (existingResponse) {
          setResponseForm({
            interested_items: existingResponse.interested_items || '',
            can_facilitate_pickup: existingResponse.can_facilitate_pickup || false,
            available_dates: existingResponse.available_dates || '',
            message: existingResponse.message || ''
          });
        }
      }
    } catch (err) {
      console.error('Error loading donation:', err);
    } finally {
      setLoading(false);
    }
  };

  const isOperator = donation && user && donation.operator_id === user.id;

  const handleSubmitResponse = async () => {
    if (!responseForm.interested_items) {
      alert('Please describe what items you are interested in');
      return;
    }
    setSubmittingResponse(true);
    try {
      const existingResponse = responses.find(r => r.vendor_id === user.id);
      if (existingResponse) {
        await base44.entities.DonationResponse.update(existingResponse.id, {
          interested_items: responseForm.interested_items,
          can_facilitate_pickup: responseForm.can_facilitate_pickup,
          available_dates: responseForm.available_dates,
          message: responseForm.message
        });
      } else {
        await base44.entities.DonationResponse.create({
          donation_id: donationId,
          vendor_id: user.id,
          vendor_name: vendorProfile.company_name || vendorProfile.business_name || '',
          vendor_email: vendorProfile.email || user.email,
          vendor_phone: vendorProfile.phone || '',
          interested_items: responseForm.interested_items,
          can_facilitate_pickup: responseForm.can_facilitate_pickup,
          available_dates: responseForm.available_dates,
          message: responseForm.message,
          status: 'pending'
        });
      }
      alert('Response submitted successfully!');
      loadData();
    } catch (err) {
      alert('Failed to submit response: ' + err.message);
    } finally {
      setSubmittingResponse(false);
    }
  };

  const handleAcceptResponse = async (response) => {
    if (!confirm(`Accept ${response.vendor_name} for this donation pickup?`)) return;
    setAcceptingId(response.id);
    try {
      for (const r of responses) {
        if (r.id !== response.id) {
          await base44.entities.DonationResponse.update(r.id, { status: 'declined' });
        }
      }
      await base44.entities.DonationResponse.update(response.id, { status: 'accepted' });
      await base44.entities.Donation.update(donationId, {
        status: 'awarded',
        awarded_vendor_id: response.vendor_id,
        awarded_vendor_name: response.vendor_name
      });
      alert(`Donation accepted: ${response.vendor_name}`);
      loadData();
    } catch (err) {
      alert('Failed to accept response: ' + err.message);
    } finally {
      setAcceptingId(null);
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

  if (accessDenied) {
    return (
      <div className="p-8 max-w-md mx-auto text-center mt-12">
        <Lock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Access Restricted</h2>
        <p className="text-slate-500 mb-4">This donation event is only available to verified donation companies and the operator who created it.</p>
        <Button variant="outline" onClick={() => navigate('/')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Go Home
        </Button>
      </div>
    );
  }

  if (!donation) return null;

  const sc = STATUS_CONFIG[donation.status] || STATUS_CONFIG.draft;
  const myResponse = isOperator ? null : responses.find(r => r.vendor_id === user?.id);
  const canRespond = !isOperator && donation.status === 'published';

  return (
    <div className="p-6 lg:p-8 space-y-6 mt-4">
      <div className="flex items-center gap-3 mt-4">
        {isOperator && (
          <Button variant="outline" size="sm" onClick={() => navigate('/DonationEditor')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> My Donations
          </Button>
        )}
        <h1 className="text-2xl md:text-3xl font-serif font-bold text-slate-900 flex-1">{donation.title}</h1>
        <Badge className={sc.color}>{sc.label}</Badge>
      </div>

      {/* Info Card */}
      <Card>
        <CardContent className="p-5 space-y-3">
          {donation.description && (
            <p className="text-slate-600">{donation.description}</p>
          )}
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            {donation.property_address && (
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-pink-600 mt-0.5 flex-shrink-0" />
                <span className="text-slate-600">{donation.property_address.street}<br />{donation.property_address.city}, {donation.property_address.state} {donation.property_address.zip}</span>
              </div>
            )}
            {donation.pickup_deadline && (
              <div className="flex items-start gap-2">
                <Calendar className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <span className="text-slate-600">Pickup by:<br /><strong>{format(new Date(donation.pickup_deadline + 'T00:00:00'), 'MMM d, yyyy')}</strong></span>
              </div>
            )}
          </div>
          {donation.scope_description && (
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Items Available</p>
              <p className="text-sm text-slate-700">{donation.scope_description}</p>
            </div>
          )}
          {donation.access_notes && (
            <div className="bg-amber-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-amber-600 uppercase mb-1">Access Notes</p>
              <p className="text-sm text-amber-800">{donation.access_notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Seller Contact Details — shown to donation companies unless operator is handling */}
      {!isOperator && !donation.operator_handling_donations && (
        <Card>
          <CardContent className="p-5">
            <h2 className="text-lg font-semibold text-slate-900 mb-3">Home Seller Contact Details</h2>
            <p className="text-sm text-slate-500 mb-3">Contact the seller directly to coordinate donation pickup:</p>
            <div className="grid sm:grid-cols-3 gap-3">
              {donation.seller_name && (
                <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-3">
                  <User className="w-4 h-4 text-pink-600" />
                  <div>
                    <p className="text-xs text-slate-400">Name</p>
                    <p className="text-sm font-medium text-slate-700">{donation.seller_name}</p>
                  </div>
                </div>
              )}
              {donation.seller_phone && (
                <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-3">
                  <Phone className="w-4 h-4 text-pink-600" />
                  <div>
                    <p className="text-xs text-slate-400">Phone</p>
                    <p className="text-sm font-medium text-slate-700">{donation.seller_phone}</p>
                  </div>
                </div>
              )}
              {donation.seller_email && (
                <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-3">
                  <Mail className="w-4 h-4 text-pink-600" />
                  <div>
                    <p className="text-xs text-slate-400">Email</p>
                    <p className="text-sm font-medium text-slate-700 break-all">{donation.seller_email}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Operator handling notice for vendors */}
      {!isOperator && donation.operator_handling_donations && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-center">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> The operator ({donation.operator_name || 'the estate sale company'}) is handling all donation coordination.
            Please submit your response below and the operator will coordinate with you.
          </p>
        </div>
      )}

      {/* Photos */}
      {donation.photos && donation.photos.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Photos ({donation.photos.length})</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {donation.photos.map((url, idx) => (
              <div key={idx} className="aspect-square rounded-lg overflow-hidden border border-slate-200 cursor-pointer" onClick={() => setSelectedPhoto(url)}>
                <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Awarded Banner */}
      {donation.status === 'awarded' && donation.awarded_vendor_name && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-center">
          <Award className="w-8 h-8 text-blue-600 mx-auto mb-2" />
          <h3 className="text-lg font-bold text-blue-900">Accepted: {donation.awarded_vendor_name}</h3>
        </div>
      )}

      {/* Vendor Response Form */}
      {canRespond && (
        <Card>
          <CardContent className="p-5 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">{myResponse ? 'Update Your Response' : 'Submit a Response'}</h2>
            {myResponse && (
              <Badge className="bg-amber-100 text-amber-700">You have a pending response</Badge>
            )}
            <div>
              <Label htmlFor="interested_items">What are you interested in picking up? *</Label>
              <Textarea id="interested_items" value={responseForm.interested_items} onChange={e => setResponseForm({ ...responseForm, interested_items: e.target.value })} placeholder="e.g. Furniture, clothing, kitchen appliances, books..." className="h-20" />
            </div>
            <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-3">
              <Switch
                checked={responseForm.can_facilitate_pickup}
                onCheckedChange={(checked) => setResponseForm({ ...responseForm, can_facilitate_pickup: checked })}
              />
              <Label className="cursor-pointer">I can facilitate pickups during this timeframe</Label>
            </div>
            <div>
              <Label htmlFor="available_dates">Your Availability</Label>
              <Input id="available_dates" value={responseForm.available_dates} onChange={e => setResponseForm({ ...responseForm, available_dates: e.target.value })} placeholder="e.g. Mon-Fri 9am-3pm, or specific dates" />
            </div>
            <div>
              <Label htmlFor="message">Message to Operator / Seller</Label>
              <Textarea id="message" value={responseForm.message} onChange={e => setResponseForm({ ...responseForm, message: e.target.value })} placeholder="Any additional details, questions, or constraints..." className="h-24" />
            </div>
            <Button onClick={handleSubmitResponse} disabled={submittingResponse} className="bg-pink-600 hover:bg-pink-700">
              {submittingResponse ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</> : myResponse ? 'Update Response' : 'Submit Response'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Operator: Responses List */}
      {isOperator && responses.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Donation Company Responses ({responses.length})</h2>
          <div className="space-y-3">
            {responses.map(response => (
              <Card key={response.id} className={response.status === 'accepted' ? 'border-blue-400 border-2' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-slate-900">{response.vendor_name}</h3>
                      <div className="flex flex-wrap gap-3 text-sm text-slate-500 mt-1">
                        {response.vendor_email && <span className="text-xs">{response.vendor_email}</span>}
                        {response.vendor_phone && <span className="text-xs">{response.vendor_phone}</span>}
                        {response.can_facilitate_pickup ? (
                          <span className="flex items-center gap-1 text-green-600"><CheckCircle2 className="w-3.5 h-3.5" /> Can facilitate pickup</span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-500"><XCircle className="w-3.5 h-3.5" /> Cannot facilitate pickup</span>
                        )}
                        {response.available_dates && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-cyan-600" /> {response.available_dates}</span>}
                      </div>
                    </div>
                    {response.status === 'accepted' ? (
                      <Badge className="bg-blue-100 text-blue-700">Accepted</Badge>
                    ) : response.status === 'declined' ? (
                      <Badge className="bg-slate-100 text-slate-500">Declined</Badge>
                    ) : (
                      donation.status === 'published' && (
                        <Button size="sm" onClick={() => handleAcceptResponse(response)} disabled={acceptingId !== null}>
                          {acceptingId === response.id ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
                          Accept
                        </Button>
                      )
                    )}
                  </div>
                  {response.interested_items && (
                    <div className="bg-slate-50 rounded-lg p-3 mt-2">
                      <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Interested In</p>
                      <p className="text-sm text-slate-700">{response.interested_items}</p>
                    </div>
                  )}
                  {response.message && (
                    <div className="bg-slate-50 rounded-lg p-3 mt-2">
                      <p className="text-xs font-semibold text-slate-500 uppercase mb-1 flex items-center gap-1"><MessageSquare className="w-3 h-3" /> Message</p>
                      <p className="text-sm text-slate-700">{response.message}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Operator: No responses yet */}
      {isOperator && responses.length === 0 && donation.status === 'published' && (
        <Card>
          <CardContent className="p-8 text-center">
            <Heart className="w-10 h-10 text-pink-300 mx-auto mb-3" />
            <p className="text-slate-500">No responses yet. Donation companies within 10 miles have been notified.</p>
          </CardContent>
        </Card>
      )}

      {/* Photo modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setSelectedPhoto(null)}>
          <img src={selectedPhoto} alt="Full size" className="max-w-full max-h-full rounded-lg" />
        </div>
      )}
    </div>
  );
}