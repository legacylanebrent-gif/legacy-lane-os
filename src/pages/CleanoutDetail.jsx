import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, MapPin, Calendar, Building2, DollarSign,
  Clock, MessageSquare, Award, Loader2, Lock
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

export default function CleanoutDetail() {
  const navigate = useNavigate();
  const cleanoutId = new URLSearchParams(window.location.search).get('id');

  const [user, setUser] = useState(null);
  const [cleanout, setCleanout] = useState(null);
  const [bids, setBids] = useState([]);
  const [vendorProfile, setVendorProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [bidForm, setBidForm] = useState({ bid_amount: '', estimated_days: '', message: '' });
  const [submittingBid, setSubmittingBid] = useState(false);
  const [awardingId, setAwardingId] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  useEffect(() => {
    loadData();
  }, [cleanoutId]);

  const loadData = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);

      const results = await base44.entities.Cleanout.filter({ id: cleanoutId });
      if (results.length === 0) {
        setAccessDenied(true);
        setLoading(false);
        return;
      }
      const cleanoutData = results[0];
      setCleanout(cleanoutData);

      const ADMIN_ROLES = ['super_admin', 'platform_ops', 'admin', 'support_agent', 'marketing_ops', 'data_analyst'];
      const isOperator = cleanoutData.operator_id === userData.id;
      const isTeamMember = userData.operator_id && cleanoutData.operator_id === userData.operator_id;
      const isAdmin = ADMIN_ROLES.includes(userData.primary_account_type) || userData.role === 'admin';

      if (!isOperator && !isTeamMember && !isAdmin) {
        const vpResults = await base44.entities.CleanoutVendorProfile.filter({ user_id: userData.id });
        if (vpResults.length === 0) {
          setAccessDenied(true);
          setLoading(false);
          return;
        }
        setVendorProfile(vpResults[0]);

        if (cleanoutData.status === 'draft') {
          setAccessDenied(true);
          setLoading(false);
          return;
        }
      }

      const bidResults = await base44.entities.CleanoutBid.filter({ cleanout_id: cleanoutId });
      setBids(bidResults.sort((a, b) => (a.bid_amount || 0) - (b.bid_amount || 0)));

      if (!isOperator) {
        const existingBid = bidResults.find(b => b.vendor_id === userData.id);
        if (existingBid) {
          setBidForm({
            bid_amount: existingBid.bid_amount?.toString() || '',
            estimated_days: existingBid.estimated_days?.toString() || '',
            message: existingBid.message || ''
          });
        }
      }
    } catch (err) {
      console.error('Error loading cleanout:', err);
    } finally {
      setLoading(false);
    }
  };

  const ADMIN_ROLES_RENDER = ['super_admin', 'platform_ops', 'admin', 'support_agent', 'marketing_ops', 'data_analyst'];
  const isOperator = cleanout && user && (cleanout.operator_id === user.id || (user.operator_id && cleanout.operator_id === user.operator_id) || ADMIN_ROLES_RENDER.includes(user.primary_account_type) || user.role === 'admin');

  const handleSubmitBid = async () => {
    if (!bidForm.bid_amount) {
      alert('Please enter a bid amount');
      return;
    }
    setSubmittingBid(true);
    try {
      const existingBid = bids.find(b => b.vendor_id === user.id);
      if (existingBid) {
        await base44.entities.CleanoutBid.update(existingBid.id, {
          bid_amount: parseFloat(bidForm.bid_amount),
          estimated_days: bidForm.estimated_days ? parseInt(bidForm.estimated_days) : null,
          message: bidForm.message
        });
      } else {
        await base44.entities.CleanoutBid.create({
          cleanout_id: cleanoutId,
          vendor_id: user.id,
          vendor_name: vendorProfile.business_name,
          vendor_email: vendorProfile.email,
          vendor_phone: vendorProfile.phone || '',
          bid_amount: parseFloat(bidForm.bid_amount),
          estimated_days: bidForm.estimated_days ? parseInt(bidForm.estimated_days) : null,
          message: bidForm.message,
          status: 'pending'
        });
      }
      alert('Bid submitted successfully!');
      loadData();
    } catch (err) {
      alert('Failed to submit bid: ' + err.message);
    } finally {
      setSubmittingBid(false);
    }
  };

  const handleAwardBid = async (bid) => {
    if (!confirm(`Award this cleanout to ${bid.vendor_name} for $${bid.bid_amount?.toLocaleString()}?`)) return;
    setAwardingId(bid.id);
    try {
      for (const b of bids) {
        if (b.id !== bid.id) {
          await base44.entities.CleanoutBid.update(b.id, { status: 'declined' });
        }
      }
      await base44.entities.CleanoutBid.update(bid.id, { status: 'awarded' });
      await base44.entities.Cleanout.update(cleanoutId, {
        status: 'awarded',
        awarded_vendor_id: bid.vendor_id,
        awarded_vendor_name: bid.vendor_name,
        awarded_bid_amount: bid.bid_amount
      });
      alert(`Cleanout awarded to ${bid.vendor_name}`);
      loadData();
    } catch (err) {
      alert('Failed to award bid: ' + err.message);
    } finally {
      setAwardingId(null);
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
        <p className="text-slate-500 mb-4">This cleanout is only available to verified cleanout vendors and the operator who created it.</p>
        <Button variant="outline" onClick={() => navigate('/')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Go Home
        </Button>
      </div>
    );
  }

  if (!cleanout) return null;

  const sc = STATUS_CONFIG[cleanout.status] || STATUS_CONFIG.draft;
  const myBid = isOperator ? null : bids.find(b => b.vendor_id === user?.id);
  const canBid = !isOperator && cleanout.status === 'published';

  return (
    <div className="p-6 lg:p-8 space-y-6 mt-4">
      <div className="flex items-center gap-3 mt-4">
        {isOperator && (
          <Button variant="outline" size="sm" onClick={() => navigate('/CleanoutEditor')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> My Cleanouts
          </Button>
        )}
        <h1 className="text-2xl md:text-3xl font-serif font-bold text-slate-900 flex-1">{cleanout.title}</h1>
        <Badge className={sc.color}>{sc.label}</Badge>
      </div>

      {/* Info Card */}
      <Card>
        <CardContent className="p-5 space-y-3">
          {cleanout.description && (
            <p className="text-slate-600">{cleanout.description}</p>
          )}
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            {cleanout.property_address && (
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-cyan-600 mt-0.5 flex-shrink-0" />
                <span className="text-slate-600">{cleanout.property_address.street}<br />{cleanout.property_address.city}, {cleanout.property_address.state} {cleanout.property_address.zip}</span>
              </div>
            )}
            {cleanout.cleanout_deadline && (
              <div className="flex items-start gap-2">
                <Calendar className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <span className="text-slate-600">Complete by:<br /><strong>{format(new Date(cleanout.cleanout_deadline + 'T00:00:00'), 'MMM d, yyyy')}</strong></span>
              </div>
            )}
          </div>
          {cleanout.scope_description && (
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Scope of Work</p>
              <p className="text-sm text-slate-700">{cleanout.scope_description}</p>
            </div>
          )}
          {cleanout.access_notes && (
            <div className="bg-amber-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-amber-600 uppercase mb-1">Access Notes</p>
              <p className="text-sm text-amber-800">{cleanout.access_notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Photos */}
      {cleanout.photos && cleanout.photos.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Photos ({cleanout.photos.length})</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {cleanout.photos.map((url, idx) => (
              <div key={idx} className="aspect-square rounded-lg overflow-hidden border border-slate-200 cursor-pointer" onClick={() => setSelectedPhoto(url)}>
                <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Awarded Banner */}
      {cleanout.status === 'awarded' && cleanout.awarded_vendor_name && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-center">
          <Award className="w-8 h-8 text-blue-600 mx-auto mb-2" />
          <h3 className="text-lg font-bold text-blue-900">Awarded to {cleanout.awarded_vendor_name}</h3>
          <p className="text-blue-700">Awarded bid: ${cleanout.awarded_bid_amount?.toLocaleString()}</p>
        </div>
      )}

      {/* Vendor Bid Form */}
      {canBid && (
        <Card>
          <CardContent className="p-5 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">{myBid ? 'Update Your Bid' : 'Submit a Bid'}</h2>
            {myBid && (
              <Badge className="bg-amber-100 text-amber-700">You have a pending bid of ${myBid.bid_amount?.toLocaleString()}</Badge>
            )}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bid_amount">Bid Amount ($) *</Label>
                <Input id="bid_amount" type="number" value={bidForm.bid_amount} onChange={e => setBidForm({ ...bidForm, bid_amount: e.target.value })} placeholder="e.g. 1500" />
              </div>
              <div>
                <Label htmlFor="estimated_days">Estimated Days to Complete</Label>
                <Input id="estimated_days" type="number" value={bidForm.estimated_days} onChange={e => setBidForm({ ...bidForm, estimated_days: e.target.value })} placeholder="e.g. 3" />
              </div>
            </div>
            <div>
              <Label htmlFor="message">Message to Operator</Label>
              <Textarea id="message" value={bidForm.message} onChange={e => setBidForm({ ...bidForm, message: e.target.value })} placeholder="Include your availability, crew size, any questions..." className="h-24" />
            </div>
            <Button onClick={handleSubmitBid} disabled={submittingBid} className="bg-cyan-600 hover:bg-cyan-700">
              {submittingBid ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</> : myBid ? 'Update Bid' : 'Submit Bid'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Operator: Bids List */}
      {isOperator && bids.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Vendor Bids ({bids.length})</h2>
          <div className="space-y-3">
            {bids.map(bid => (
              <Card key={bid.id} className={bid.status === 'awarded' ? 'border-blue-400 border-2' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-slate-900">{bid.vendor_name}</h3>
                      <div className="flex flex-wrap gap-3 text-sm text-slate-500 mt-1">
                        <span className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5 text-green-600" /> ${bid.bid_amount?.toLocaleString()}</span>
                        {bid.estimated_days && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-cyan-600" /> {bid.estimated_days} days</span>}
                        {bid.vendor_email && <span className="text-xs">{bid.vendor_email}</span>}
                        {bid.vendor_phone && <span className="text-xs">{bid.vendor_phone}</span>}
                      </div>
                    </div>
                    {bid.status === 'awarded' ? (
                      <Badge className="bg-blue-100 text-blue-700">Awarded</Badge>
                    ) : bid.status === 'declined' ? (
                      <Badge className="bg-slate-100 text-slate-500">Declined</Badge>
                    ) : (
                      cleanout.status === 'published' && (
                        <Button size="sm" onClick={() => handleAwardBid(bid)} disabled={awardingId !== null}>
                          {awardingId === bid.id ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Award className="w-3 h-3 mr-1" />}
                          Award
                        </Button>
                      )
                    )}
                  </div>
                  {bid.message && (
                    <div className="bg-slate-50 rounded-lg p-3 mt-2">
                      <p className="text-xs font-semibold text-slate-500 uppercase mb-1 flex items-center gap-1"><MessageSquare className="w-3 h-3" /> Message</p>
                      <p className="text-sm text-slate-700">{bid.message}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Operator: No bids yet */}
      {isOperator && bids.length === 0 && cleanout.status === 'published' && (
        <Card>
          <CardContent className="p-8 text-center">
            <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No bids yet. Vendors have been notified.</p>
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