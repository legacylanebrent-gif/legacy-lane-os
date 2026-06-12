import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Package, MapPin, Calendar, Users, Lock, ChevronRight, Star, Sparkles, ArrowRight } from 'lucide-react';

const EVENT_TYPE_LABELS = {
  free_giveaway: 'Free Giveaway',
  low_cost_purchase: 'Low-Cost Item Purchase',
  fill_a_bag: 'Fill-A-Bag',
  fill_a_car: 'Fill-A-Car',
  fill_a_trailer: 'Fill-A-Trailer',
  bundle_buyout: 'Bundle Buyout',
};

const STATUS_COLORS = {
  draft: 'bg-slate-100 text-slate-600',
  open: 'bg-green-100 text-green-700',
  full: 'bg-amber-100 text-amber-700',
  closed: 'bg-red-100 text-red-600',
  cancelled: 'bg-red-100 text-red-600',
  completed: 'bg-blue-100 text-blue-700',
};

export default function ResellerPackupEvents() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [photos, setPhotos] = useState({});
  const [registrations, setRegistrations] = useState({});
  const [myRegistrations, setMyRegistrations] = useState({});
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [registering, setRegistering] = useState(null);
  const [resellerProfile, setResellerProfile] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    let u = null;
    try { u = await base44.auth.me(); } catch { /* public visitor */ }
    setUser(u);

    const role = u?.primary_account_type || u?.role;
    const isOperator = role === 'estate_sale_operator' || role === 'Estate Sale Company Owner';
    const isAdmin = u?.role === 'admin';

    // Load open events — visible to everyone
    let eventsData = [];
    if (isAdmin) {
      eventsData = await base44.entities.ResellerPackupEvent.filter({ status: 'open' }, '-created_date', 50);
    } else if (isOperator) {
      eventsData = await base44.entities.ResellerPackupEvent.filter({ operator_id: u.id }, '-created_date', 50);
    } else {
      eventsData = await base44.entities.ResellerPackupEvent.filter({ status: 'open' }, '-created_date', 50);
    }
    setEvents(eventsData);

    // Check if this user has a reseller profile
    if (u?.id) {
      try {
        const profiles = await base44.entities.ResellerProfile.filter({ user_id: u.id });
        if (profiles[0]) setResellerProfile(profiles[0]);
      } catch { /* ok */ }
    }

    // Load photos + registrations for each event
    const photoMap = {};
    const regCountMap = {};
    const myRegMap = {};
    for (const ev of eventsData) {
      const evPhotos = await base44.entities.ResellerPackupPhoto.filter({ event_id: ev.id });
      photoMap[ev.id] = evPhotos.sort((a, b) => a.sort_order - b.sort_order);
      const regs = await base44.entities.ResellerPackupRegistration.filter({ event_id: ev.id });
      regCountMap[ev.id] = regs.length;
      if (u?.id) {
        const myReg = regs.find(r => r.reseller_user_id === u?.id);
        if (myReg) myRegMap[ev.id] = myReg;
      }
    }
    setPhotos(photoMap);
    setRegistrations(regCountMap);
    setMyRegistrations(myRegMap);
    setLoading(false);
  };

  const handleRegister = async (eventId) => {
    if (myRegistrations[eventId]) return;
    setRegistering(eventId);
    try {
      const reg = await base44.entities.ResellerPackupRegistration.create({
        event_id: eventId,
        reseller_user_id: user.id,
        reseller_name: user.full_name,
        reseller_email: user.email,
        status: 'pending',
        registered_at: new Date().toISOString(),
      });
      setMyRegistrations(prev => ({ ...prev, [eventId]: reg }));
      alert('Registration submitted! The Estate Sale Company Owner will review and approve your request.');
    } catch (err) {
      alert('Registration failed: ' + err.message);
    } finally {
      setRegistering(null);
    }
  };

  const role = user?.primary_account_type || user?.role;
  const isReseller = role === 'reseller';
  const isOperator = role === 'estate_sale_operator' || role === 'Estate Sale Company Owner';
  const isAdmin = user?.role === 'admin';
  const isRegisteredReseller = isReseller && resellerProfile;

  if (loading) return (
    <div className="p-8">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-slate-200 rounded w-1/3" />
        <div className="h-48 bg-slate-200 rounded" />
        <div className="h-48 bg-slate-200 rounded" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="w-6 h-6 text-purple-600" />
            <div>
              <h1 className="text-xl font-bold text-slate-900">Reseller Pack-Up Events</h1>
              <p className="text-sm text-slate-500">Private post-sale inventory events for resellers</p>
            </div>
          </div>
          <Badge className="bg-purple-100 text-purple-700 border-0">
            <Lock className="w-3 h-3 mr-1" />
            Private Network
          </Badge>
        </div>
      </div>

      {/* Non-reseller banner */}
      {!isRegisteredReseller && !isOperator && !isAdmin && (
        <div className="bg-gradient-to-r from-purple-700 to-purple-900 text-white">
          <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-purple-300" />
                <span className="text-purple-200 text-xs font-semibold uppercase tracking-wide">Reseller Network</span>
              </div>
              <p className="font-bold text-lg">Get access to exclusive post-sale inventory events</p>
              <p className="text-purple-200 text-sm mt-1">Register as a reseller to RSVP for events, get early access to discounted estate sale inventory, and connect with operators in your area.</p>
            </div>
            <div className="flex flex-col gap-2 flex-shrink-0">
              {!user
                ? <Button className="bg-white text-purple-800 hover:bg-purple-50 font-semibold" onClick={() => base44.auth.redirectToLogin('/ResellerPackupEvents')}>
                    <Star className="w-4 h-4 mr-2" />Log In to RSVP
                  </Button>
                : <Button className="bg-white text-purple-800 hover:bg-purple-50 font-semibold" onClick={() => navigate('/reseller-network')}>
                    <Star className="w-4 h-4 mr-2" />Start Free Trial
                  </Button>
              }
              <p className="text-purple-300 text-xs text-center">No credit card required</p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {events.length === 0 && (
          <div className="text-center py-16 text-slate-500">
            <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="font-medium">No pack-up events available right now</p>
            <p className="text-sm mt-1">Check back after sales complete in your territory.</p>
          </div>
        )}

        {events.map(ev => {
          const eventPhotos = photos[ev.id] || [];
          const regCount = registrations[ev.id] || 0;
          const myReg = myRegistrations[ev.id];
          const isOwner = isOperator && ev.operator_id === user?.id;
          const isFull = ev.max_reseller_spots && regCount >= ev.max_reseller_spots;
          const eventDate = ev.event_date
            ? new Date(ev.event_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
            : null;
          const saleLink = `${window.location.origin}/ResellerPackupEvents?highlight=${ev.id}`;

          return (
            <Card key={ev.id} className="overflow-hidden hover:shadow-md transition-shadow">
              {/* Photo strip */}
              {eventPhotos.length > 0 && (
                <div className="flex gap-1 h-44 overflow-hidden bg-slate-200">
                  {eventPhotos.slice(0, 4).map((p) => (
                    <img key={p.id} src={p.photo_url} alt="" className="h-full object-cover flex-1 min-w-0" style={{ maxWidth: `${100 / Math.min(eventPhotos.length, 4)}%` }} />
                  ))}
                  {eventPhotos.length > 4 && (
                    <div className="h-full flex-1 bg-slate-700 flex items-center justify-center min-w-0" style={{ maxWidth: '25%' }}>
                      <span className="text-white font-bold text-sm">+{eventPhotos.length - 4}</span>
                    </div>
                  )}
                </div>
              )}

              <CardContent className="p-5 space-y-4">
                {/* Title row */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-900 text-lg">{ev.event_title}</h3>
                      <Badge className={`text-xs ${STATUS_COLORS[ev.status] || 'bg-slate-100 text-slate-600'}`}>{ev.status?.replace('_', ' ').toUpperCase()}</Badge>
                      <Badge variant="outline" className="text-xs">{EVENT_TYPE_LABELS[ev.event_type] || ev.event_type}</Badge>
                    </div>
                    {ev.original_sale_title && (
                      <p className="text-sm text-slate-500 mt-1">From sale: <span className="font-medium text-slate-700">{ev.original_sale_title}</span></p>
                    )}
                  </div>
                  {isOwner && (
                    <Button size="sm" variant="outline" className="flex-shrink-0 text-xs" onClick={() => navigate(`/ResellerPackupEventEditor?eventId=${ev.id}`)}>
                      Manage <ChevronRight className="w-3 h-3 ml-1" />
                    </Button>
                  )}
                </div>

                {/* Details — visible to ALL */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-700">
                  {eventDate && (
                    <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                      <Calendar className="w-4 h-4 text-purple-500 flex-shrink-0" />
                      <span><strong>{eventDate}</strong>{ev.start_time && <span className="text-slate-500"> · {ev.start_time}{ev.end_time ? `–${ev.end_time}` : ''}</span>}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                    <MapPin className="w-4 h-4 text-purple-500 flex-shrink-0" />
                    <span>
                      {myReg?.status === 'approved' && ev.address_visibility === 'full_address'
                        ? `${ev.address}, ${ev.city}, ${ev.state}`
                        : ev.address_visibility === 'zip_only'
                          ? `ZIP: ${ev.zip}`
                          : `${ev.city}, ${ev.state}`}
                    </span>
                  </div>
                  {ev.max_reseller_spots && (
                    <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                      <Users className="w-4 h-4 text-purple-500 flex-shrink-0" />
                      <span><strong>{regCount}</strong>/{ev.max_reseller_spots} spots filled</span>
                    </div>
                  )}
                  {ev.seller_goal && (
                    <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 text-xs text-slate-600">
                      <Package className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span>{ev.seller_goal.replace(/_/g, ' ')}</span>
                    </div>
                  )}
                </div>

                {ev.pickup_rules && (
                  <p className="text-xs text-slate-500 bg-amber-50 border border-amber-100 rounded p-3">
                    <strong>Pickup Rules:</strong> {ev.pickup_rules}
                  </p>
                )}

                {ev.event_notes && (
                  <p className="text-sm text-slate-600 bg-slate-50 rounded p-3">{ev.event_notes}</p>
                )}

                {ev.event_type === 'bundle_buyout' && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                    <strong>Bundle Buyout Opportunity.</strong> Remaining inventory offered as a grouped pickup. No bidding.
                    {ev.bundle_buyout_amount ? ` Requested: $${ev.bundle_buyout_amount.toLocaleString()}` : ''}
                  </div>
                )}

                {/* CTA section */}
                <div className="pt-2 border-t border-slate-100">
                  {/* operator owner */}
                  {isOwner && (
                    <Button size="sm" variant="outline" className="w-full" onClick={() => navigate(`/ResellerPackupEventEditor?eventId=${ev.id}`)}>
                      Manage This Event <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  )}

                  {/* Registered reseller */}
                  {isRegisteredReseller && !isOwner && (
                    myReg ? (
                      <div className="flex items-center gap-3">
                        <RegStatusBadge status={myReg.status} />
                        {myReg.status === 'approved' && (
                          <span className="text-xs text-green-700 font-medium">You're approved — see you there!</span>
                        )}
                        {myReg.status === 'pending' && (
                          <span className="text-xs text-yellow-700">Awaiting Estate Sale Company Owner approval</span>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button
                          className={`flex-1 ${isFull ? 'bg-slate-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'} text-white`}
                          disabled={isFull || registering === ev.id || ev.status !== 'open'}
                          onClick={() => handleRegister(ev.id)}
                        >
                          {registering === ev.id ? 'Registering...' : isFull ? 'Event Full' : ev.event_type === 'bundle_buyout' ? 'Request Bundle Buyout Access' : 'RSVP — Register to Attend'}
                        </Button>
                      </div>
                    )
                  )}

                  {/* Logged in but NOT a reseller */}
                  {user && !isReseller && !isOperator && !isAdmin && (
                    <div className="space-y-2">
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm text-purple-800">
                        <strong>Reseller access required to RSVP.</strong> You're logged in but not registered as a reseller yet.
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button className="flex-1 bg-purple-600 hover:bg-purple-700 text-white" onClick={() => navigate('/reseller-network')}>
                          <Star className="w-4 h-4 mr-2" />Start Free Trial to RSVP
                        </Button>
                        <Button variant="outline" className="flex-1 text-purple-700 border-purple-300" onClick={() => navigate('/reseller-network')}>
                          Learn About Reseller Access <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                      <p className="text-xs text-slate-500 text-center">No credit card required to start your free trial</p>
                    </div>
                  )}

                  {/* Not logged in */}
                  {!user && (
                    <div className="space-y-2">
                      <div className="bg-slate-100 border border-slate-200 rounded-lg p-3 text-sm text-slate-700 flex items-center gap-2">
                        <Lock className="w-4 h-4 text-slate-500 flex-shrink-0" />
                        <span>Registration required to RSVP. <strong>Free trial available</strong> — no credit card needed.</span>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button
                          className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                          onClick={() => base44.auth.redirectToLogin('/ResellerPackupEvents')}
                        >
                          <Star className="w-4 h-4 mr-2" />Log In to RSVP
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1 text-purple-700 border-purple-300"
                          onClick={() => navigate('/reseller-network')}
                        >
                          Start Free Trial <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                      <p className="text-xs text-center text-slate-400">Already a member? <button className="text-purple-600 underline" onClick={() => base44.auth.redirectToLogin('/ResellerPackupEvents')}>Log in here</button></p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
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