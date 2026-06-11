import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Package, MapPin, Calendar, Users, Eye, Lock, ChevronRight } from 'lucide-react';

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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const u = await base44.auth.me();
    setUser(u);

    const role = u?.primary_account_type || u?.role;
    const isReseller = role === 'reseller';
    const isOperator = role === 'estate_sale_operator' || role === 'operator';
    const isAdmin = u?.role === 'admin';

    if (!isReseller && !isOperator && !isAdmin) {
      setLoading(false);
      return;
    }

    let eventsData = [];
    if (isAdmin) {
      eventsData = await base44.entities.ResellerPackupEvent.filter({ status: 'open' }, '-created_date', 50);
    } else if (isOperator) {
      eventsData = await base44.entities.ResellerPackupEvent.filter({ operator_id: u.id }, '-created_date', 50);
    } else {
      eventsData = await base44.entities.ResellerPackupEvent.filter({ status: 'open' }, '-created_date', 50);
    }

    setEvents(eventsData);

    // Load photos and registrations
    const photoMap = {};
    const regCountMap = {};
    const myRegMap = {};
    for (const ev of eventsData) {
      const evPhotos = await base44.entities.ResellerPackupPhoto.filter({ event_id: ev.id });
      photoMap[ev.id] = evPhotos.sort((a, b) => a.sort_order - b.sort_order);
      const regs = await base44.entities.ResellerPackupRegistration.filter({ event_id: ev.id });
      regCountMap[ev.id] = regs.length;
      const myReg = regs.find(r => r.reseller_user_id === u.id);
      if (myReg) myRegMap[ev.id] = myReg;
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
      const ev = events.find(e => e.id === eventId);
      const reg = await base44.entities.ResellerPackupRegistration.create({
        event_id: eventId,
        reseller_user_id: user.id,
        reseller_name: user.full_name,
        reseller_email: user.email,
        status: 'pending',
        registered_at: new Date().toISOString(),
      });
      setMyRegistrations(prev => ({ ...prev, [eventId]: reg }));
      alert('Registration submitted! The operator will review and approve your request.');
    } catch (err) {
      alert('Registration failed: ' + err.message);
    } finally {
      setRegistering(null);
    }
  };

  const role = user?.primary_account_type || user?.role;
  const isReseller = role === 'reseller';
  const isOperator = role === 'estate_sale_operator' || role === 'operator';
  const isAdmin = user?.role === 'admin';
  const hasAccess = isReseller || isOperator || isAdmin;

  if (loading) return <div className="p-8"><div className="animate-pulse space-y-4"><div className="h-8 bg-slate-200 rounded w-1/3" /><div className="h-48 bg-slate-200 rounded" /></div></div>;

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <Lock className="w-12 h-12 text-slate-400 mx-auto" />
          <h2 className="text-xl font-bold text-slate-900">Resellers Only</h2>
          <p className="text-slate-600">This area is available only to registered resellers. Please register or log in as a reseller to request access.</p>
          <Button onClick={() => base44.auth.redirectToLogin()} className="bg-purple-600 hover:bg-purple-700 text-white">Log In as Reseller</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="w-6 h-6 text-purple-600" />
            <div>
              <h1 className="text-xl font-bold text-slate-900">Reseller Pack-Up Events</h1>
              <p className="text-sm text-slate-500">Private post-sale inventory events for registered resellers</p>
            </div>
          </div>
          <Badge className="bg-purple-100 text-purple-700 border-0">
            <Lock className="w-3 h-3 mr-1" />
            Private
          </Badge>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
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

          return (
            <Card key={ev.id} className="overflow-hidden hover:shadow-md transition-shadow">
              {/* Photo strip */}
              {eventPhotos.length > 0 && (
                <div className="flex gap-1 h-36 overflow-hidden bg-slate-200">
                  {eventPhotos.slice(0, 4).map((p, i) => (
                    <img key={p.id} src={p.photo_url} alt="" className="h-full object-cover flex-1 min-w-0" style={{ maxWidth: `${100 / Math.min(eventPhotos.length, 4)}%` }} />
                  ))}
                  {eventPhotos.length > 4 && (
                    <div className="h-full flex-1 bg-slate-700 flex items-center justify-center min-w-0" style={{ maxWidth: '25%' }}>
                      <span className="text-white font-bold text-sm">+{eventPhotos.length - 4}</span>
                    </div>
                  )}
                </div>
              )}

              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-900">{ev.event_title}</h3>
                      <Badge className={`text-xs ${STATUS_COLORS[ev.status] || 'bg-slate-100 text-slate-600'}`}>{ev.status?.replace('_', ' ').toUpperCase()}</Badge>
                      <Badge variant="outline" className="text-xs">{EVENT_TYPE_LABELS[ev.event_type] || ev.event_type}</Badge>
                    </div>
                  </div>
                  {isOwner && (
                    <Button size="sm" variant="outline" className="flex-shrink-0 text-xs" onClick={() => navigate(`/ResellerPackupEventEditor?eventId=${ev.id}`)}>
                      Manage
                      <ChevronRight className="w-3 h-3 ml-1" />
                    </Button>
                  )}
                </div>

                <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                  {ev.event_date && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      {ev.event_date}
                      {ev.start_time && <span>· {ev.start_time}{ev.end_time ? `–${ev.end_time}` : ''}</span>}
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    {ev.address_visibility === 'full_address' && myReg?.status === 'approved'
                      ? `${ev.address}, ${ev.city}, ${ev.state}`
                      : ev.address_visibility === 'zip_only'
                        ? ev.zip
                        : `${ev.city}, ${ev.state}`}
                  </div>
                  {ev.max_reseller_spots && (
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4 text-slate-400" />
                      {regCount}/{ev.max_reseller_spots} spots
                    </div>
                  )}
                </div>

                {ev.pickup_rules && (
                  <p className="text-xs text-slate-500 bg-slate-50 rounded p-2">{ev.pickup_rules}</p>
                )}

                {ev.event_type === 'bundle_buyout' && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                    <strong>Bundle Buyout Opportunity.</strong> The operator is offering remaining inventory as a grouped pickup opportunity. No bidding.
                    {ev.bundle_buyout_amount ? ` Requested amount: $${ev.bundle_buyout_amount.toLocaleString()}` : ''}
                  </div>
                )}

                {/* Reseller action */}
                {isReseller && (
                  <div className="pt-1">
                    {myReg ? (
                      <div className="flex items-center gap-2">
                        <RegStatusBadge status={myReg.status} />
                        {myReg.status === 'approved' && (
                          <span className="text-xs text-green-700 font-medium">
                            {ev.address_visibility === 'full_address' ? `Full address: ${ev.address}` : 'Address will be shared at the event.'}
                          </span>
                        )}
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        className={`${isFull ? 'bg-slate-400' : 'bg-purple-600 hover:bg-purple-700'} text-white`}
                        disabled={isFull || registering === ev.id || ev.status !== 'open'}
                        onClick={() => handleRegister(ev.id)}
                      >
                        {registering === ev.id ? 'Registering...' : isFull ? 'Event Full' : ev.event_type === 'bundle_buyout' ? 'Request Bundle Buyout Access' : 'Register to Attend'}
                      </Button>
                    )}
                  </div>
                )}
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