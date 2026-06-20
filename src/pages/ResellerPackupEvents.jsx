import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Package, MapPin, Calendar, Users, Search, Filter, X, ArrowUp, ArrowDown,
  Clock, AlertCircle, DollarSign, Star, Sparkles, Lock, ChevronRight
} from 'lucide-react';

const EVENT_TYPE_LABELS = {
  free_giveaway: 'Free Giveaway',
  low_cost_purchase: 'Low-Cost Purchase',
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

const SELLER_GOAL_LABELS = {
  clear_all: 'Clear All',
  clear_remaining: 'Clear Remaining',
  maximize_revenue: 'Max Revenue',
};

const COLUMNS = [
  { key: 'event_title', label: 'Event', sortable: true },
  { key: 'event_type', label: 'Type', sortable: true },
  { key: 'original_sale_title', label: 'From Sale', sortable: true },
  { key: 'event_date', label: 'Date', sortable: true },
  { key: 'city', label: 'Location', sortable: true },
  { key: 'seller_goal', label: 'Goal', sortable: true },
  { key: 'max_reseller_spots', label: 'Spots', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'bundle_buyout_amount', label: 'Price', sortable: true },
];

export default function ResellerPackupEvents() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [registrations, setRegistrations] = useState({});
  const [myRegistrations, setMyRegistrations] = useState({});
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [registering, setRegistering] = useState(null);
  const [resellerProfile, setResellerProfile] = useState(null);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ status: 'all', event_type: 'all', seller_goal: 'all' });
  const [sortKey, setSortKey] = useState('event_date');
  const [sortDir, setSortDir] = useState('asc');
  const [expandedEvent, setExpandedEvent] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    let u = null;
    try { u = await base44.auth.me(); } catch { /* public visitor */ }
    setUser(u);

    const role = u?.primary_account_type || u?.role;
    const isOperator = role === 'estate_sale_operator' || role === 'Estate Sale Company Owner';
    const isAdmin = u?.role === 'admin';

    let eventsData = [];
    if (isAdmin) {
      eventsData = await base44.entities.ResellerPackupEvent.filter({}, '-created_date', 50);
    } else if (isOperator) {
      eventsData = await base44.entities.ResellerPackupEvent.filter({ operator_id: u.id }, '-created_date', 50);
    } else {
      eventsData = await base44.entities.ResellerPackupEvent.filter({ status: 'open' }, '-created_date', 50);
    }
    setEvents(eventsData);

    if (u?.id) {
      try {
        const profiles = await base44.entities.ResellerProfile.filter({ user_id: u.id });
        if (profiles[0]) setResellerProfile(profiles[0]);
      } catch { /* ok */ }
    }

    const regCountMap = {};
    const myRegMap = {};
    for (const ev of eventsData) {
      const regs = await base44.entities.ResellerPackupRegistration.filter({ event_id: ev.id });
      regCountMap[ev.id] = regs.length;
      if (u?.id) {
        const myReg = regs.find(r => r.reseller_user_id === u?.id);
        if (myReg) myRegMap[ev.id] = myReg;
      }
    }
    setRegistrations(regCountMap);
    setMyRegistrations(myRegMap);
    setLoading(false);
  };

  const handleRegister = async (eventId) => {
    if (myRegistrations[eventId]) return;
    setRegistering(eventId);
    const reg = await base44.entities.ResellerPackupRegistration.create({
      event_id: eventId,
      reseller_user_id: user.id,
      reseller_name: user.full_name,
      reseller_email: user.email,
      status: 'pending',
      registered_at: new Date().toISOString(),
    });
    setMyRegistrations(prev => ({ ...prev, [eventId]: reg }));
    setRegistering(null);
  };

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const clearSearch = () => setSearch('');
  const activeFilterCount = Object.values(filters).filter(v => v !== 'all').length;

  const filteredEvents = useMemo(() => {
    let result = [...events];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(ev =>
        (ev.event_title || '').toLowerCase().includes(q) ||
        (ev.original_sale_title || '').toLowerCase().includes(q) ||
        (ev.city || '').toLowerCase().includes(q) ||
        (ev.state || '').toLowerCase().includes(q) ||
        (ev.event_notes || '').toLowerCase().includes(q)
      );
    }
    if (filters.status !== 'all') result = result.filter(e => e.status === filters.status);
    if (filters.event_type !== 'all') result = result.filter(e => e.event_type === filters.event_type);
    if (filters.seller_goal !== 'all') result = result.filter(e => e.seller_goal === filters.seller_goal);

    result.sort((a, b) => {
      const aVal = a[sortKey] ?? '';
      const bVal = b[sortKey] ?? '';
      if (typeof aVal === 'number') return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      return sortDir === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
    return result;
  }, [events, search, filters, sortKey, sortDir]);

  const role = user?.primary_account_type || user?.role;
  const isReseller = role === 'reseller';
  const isOperator = role === 'estate_sale_operator' || role === 'Estate Sale Company Owner';
  const isAdmin = user?.role === 'admin';
  const isRegisteredReseller = isReseller && resellerProfile;

  const renderCell = (ev, colKey) => {
    switch (colKey) {
      case 'event_title':
        return <span className="font-semibold text-slate-900">{ev.event_title}</span>;
      case 'event_type':
        return <Badge variant="outline" className="text-xs">{EVENT_TYPE_LABELS[ev.event_type] || ev.event_type}</Badge>;
      case 'original_sale_title':
        return <span className="text-xs text-slate-500 max-w-[160px] truncate block">{ev.original_sale_title || '—'}</span>;
      case 'event_date': {
        const d = ev.event_date ? new Date(ev.event_date + 'T12:00:00') : null;
        return (
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Calendar className="w-3 h-3 text-purple-400" />
            {d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
            {ev.start_time && <span className="text-slate-400">{ev.start_time}</span>}
          </div>
        );
      }
      case 'city':
        return (
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate max-w-[120px]">{ev.city}, {ev.state}</span>
          </div>
        );
      case 'seller_goal':
        return <span className="text-xs text-slate-600">{SELLER_GOAL_LABELS[ev.seller_goal] || ev.seller_goal}</span>;
      case 'max_reseller_spots': {
        const regCount = registrations[ev.id] || 0;
        return (
          <div className="flex items-center gap-1 text-xs">
            <Users className="w-3 h-3 text-purple-400" />
            <span className="font-medium">{regCount}/{ev.max_reseller_spots || '∞'}</span>
          </div>
        );
      }
      case 'status':
        return <Badge className={`text-xs ${STATUS_COLORS[ev.status] || 'bg-slate-100'}`}>{ev.status}</Badge>;
      case 'bundle_buyout_amount':
        return ev.bundle_buyout_amount
          ? <span className="text-xs font-semibold text-slate-900">${ev.bundle_buyout_amount.toLocaleString()}</span>
          : <span className="text-xs text-slate-400">—</span>;
      default:
        return <span className="text-xs text-slate-600">{ev[colKey]}</span>;
    }
  };

  if (loading) return (
    <div className="p-8 flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
    </div>
  );

  // ─── Non-reseller banner (only for non-operator, non-admin, non-reseller logged-in users) ───
  const showBanner = !isRegisteredReseller && !isOperator && !isAdmin;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Reseller Pack-Up Events</h1>
          <p className="text-sm text-slate-500 mt-1">
            Private post-sale inventory opportunities for resellers
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-purple-100 text-purple-700 border-0"><Lock className="w-3 h-3 mr-1" />Private Network</Badge>
          <span className="text-sm text-slate-500">{filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* ── Non-reseller banner ──────────────────────────────────────────────────── */}
      {showBanner && (
        <div className="bg-gradient-to-r from-purple-700 to-purple-900 text-white rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-purple-300" />
              <span className="text-purple-200 text-xs font-semibold uppercase tracking-wide">Reseller Network</span>
            </div>
            <p className="font-bold text-lg">Get access to exclusive post-sale inventory events</p>
            <p className="text-purple-200 text-sm mt-1">Register as a reseller to RSVP for events, get early access to discounted inventory, and connect with operators in your area.</p>
          </div>
          <div className="flex flex-col gap-2 flex-shrink-0">
            {!user ? (
              <Button className="bg-white text-purple-800 hover:bg-purple-50 font-semibold" onClick={() => base44.auth.redirectToLogin('/ResellerPackupEvents')}>
                <Star className="w-4 h-4 mr-2" />Log In to RSVP
              </Button>
            ) : (
              <Button className="bg-white text-purple-800 hover:bg-purple-50 font-semibold" onClick={() => navigate('/reseller-network')}>
                <Star className="w-4 h-4 mr-2" />Start Free Trial
              </Button>
            )}
            <p className="text-purple-300 text-xs text-center">No credit card required</p>
          </div>
        </div>
      )}

      {/* ── Quick Stats ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Open', count: events.filter(e => e.status === 'open').length, color: 'bg-green-50 text-green-700' },
          { label: 'Full', count: events.filter(e => e.status === 'full').length, color: 'bg-amber-50 text-amber-700' },
          { label: 'Completed', count: events.filter(e => e.status === 'completed').length, color: 'bg-blue-50 text-blue-700' },
          { label: 'Draft', count: events.filter(e => e.status === 'draft').length, color: 'bg-slate-50 text-slate-600' },
          { label: 'Closed', count: events.filter(e => e.status === 'closed').length, color: 'bg-red-50 text-red-600' },
          { label: 'Cancelled', count: events.filter(e => e.status === 'cancelled').length, color: 'bg-red-50 text-red-600' },
        ].map(stat => (
          <Card key={stat.label} className={`${stat.color} border-0 shadow-none`}>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{stat.count}</p>
              <p className="text-xs font-medium">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Search & Filters ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search events..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 pr-8" />
          {search && (
            <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />
            </button>
          )}
        </div>

        <Button
          variant={showFilters || activeFilterCount > 0 ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowFilters(f => !f)}
          className={`gap-2 ${showFilters || activeFilterCount > 0 ? 'bg-purple-600 hover:bg-purple-700 text-white' : ''}`}
        >
          <Filter className="w-4 h-4" />Filters
          {activeFilterCount > 0 && (
            <Badge className="bg-white text-purple-600 h-5 min-w-5 flex items-center justify-center px-1 text-xs">{activeFilterCount}</Badge>
          )}
        </Button>

        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={() => { setFilters({ status: 'all', event_type: 'all', seller_goal: 'all' }); setShowFilters(false); }} className="text-slate-500 text-xs gap-1">
            <X className="w-3 h-3" />Clear all
          </Button>
        )}
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-3 bg-slate-50 border border-slate-200 rounded-lg p-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Status</label>
            <Select value={filters.status} onValueChange={v => setFilters(f => ({ ...f, status: v }))}>
              <SelectTrigger className="w-36 h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {Object.keys(STATUS_COLORS).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Event Type</label>
            <Select value={filters.event_type} onValueChange={v => setFilters(f => ({ ...f, event_type: v }))}>
              <SelectTrigger className="w-40 h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {Object.entries(EVENT_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Goal</label>
            <Select value={filters.seller_goal} onValueChange={v => setFilters(f => ({ ...f, seller_goal: v }))}>
              <SelectTrigger className="w-36 h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {Object.entries(SELLER_GOAL_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* ── Events Table ─────────────────────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {COLUMNS.map(col => (
                    <th key={col.key}
                      className={`px-3 py-3 text-left font-semibold text-slate-600 text-xs whitespace-nowrap ${col.sortable ? 'cursor-pointer hover:text-slate-900 select-none' : ''}`}
                      onClick={() => col.sortable && handleSort(col.key)}
                    >
                      <div className="flex items-center gap-1">
                        {col.label}
                        {col.sortable && sortKey === col.key && (
                          sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="px-3 py-3 w-10" />
                  <th className="px-3 py-3 w-32">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMNS.length + 2} className="px-4 py-12 text-center text-slate-400">
                      <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      {search || activeFilterCount > 0 ? 'No events match your search or filters' : 'No pack-up events available right now'}
                    </td>
                  </tr>
                ) : (
                  filteredEvents.map(ev => {
                    const regCount = registrations[ev.id] || 0;
                    const myReg = myRegistrations[ev.id];
                    const isOwner = isOperator && ev.operator_id === user?.id;
                    const isFull = ev.max_reseller_spots && regCount >= ev.max_reseller_spots;
                    const open = ev.status === 'open';

                    return (
                      <React.Fragment key={ev.id}>
                        <tr
                          className={`border-b border-slate-100 hover:bg-slate-50/50 transition-colors cursor-pointer ${expandedEvent === ev.id ? 'bg-purple-50/50' : ''}`}
                          onClick={() => setExpandedEvent(expandedEvent === ev.id ? null : ev.id)}
                        >
                          {COLUMNS.map(col => (
                            <td key={col.key} className="px-3 py-3 whitespace-nowrap">{renderCell(ev, col.key)}</td>
                          ))}
                          <td className="px-3 py-3 text-right">
                            <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform inline-block ${expandedEvent === ev.id ? 'rotate-90' : ''}`} />
                          </td>
                          <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                            {/* Owner */}
                            {isOwner && (
                              <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => navigate(`/ResellerPackupEventEditor?eventId=${ev.id}`)}>
                                Manage
                              </Button>
                            )}
                            {/* Registered reseller */}
                            {isRegisteredReseller && !isOwner && (
                              myReg ? (
                                <RegStatusBadge status={myReg.status} />
                              ) : (
                                <Button size="sm"
                                  className={`text-xs h-8 ${isFull || !open ? 'bg-slate-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700 text-white'}`}
                                  disabled={isFull || registering === ev.id || !open}
                                  onClick={() => handleRegister(ev.id)}
                                >
                                  {registering === ev.id ? '...' : isFull ? 'Full' : 'RSVP'}
                                </Button>
                              )
                            )}
                            {/* Not logged in / not reseller */}
                            {!isRegisteredReseller && !isOperator && !isAdmin && (
                              !user ? (
                                <Button size="sm" variant="outline" className="text-xs h-8 border-purple-300 text-purple-700"
                                  onClick={() => base44.auth.redirectToLogin('/ResellerPackupEvents')}>
                                  Log In
                                </Button>
                              ) : (
                                <Button size="sm" className="text-xs h-8 bg-purple-600 hover:bg-purple-700 text-white"
                                  onClick={() => navigate('/reseller-network')}>
                                  Join
                                </Button>
                              )
                            )}
                          </td>
                        </tr>
                        {/* ── Expanded row ────────────────────────────────────── */}
                        {expandedEvent === ev.id && (
                          <tr className="bg-purple-50/30">
                            <td colSpan={COLUMNS.length + 2} className="px-6 py-4">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <div className="md:col-span-2 space-y-3">
                                  {ev.event_notes && (
                                    <div>
                                      <p className="text-xs font-semibold text-slate-500 mb-1">Notes</p>
                                      <p className="text-slate-700">{ev.event_notes}</p>
                                    </div>
                                  )}
                                  {ev.pickup_rules && (
                                    <div className="bg-amber-50 border border-amber-100 rounded p-3">
                                      <p className="text-xs font-semibold text-amber-700 mb-1">Pickup Rules</p>
                                      <p className="text-xs text-amber-800">{ev.pickup_rules}</p>
                                    </div>
                                  )}
                                  {ev.event_type === 'bundle_buyout' && (
                                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                      <p className="text-xs font-semibold text-amber-800 mb-1">Bundle Buyout</p>
                                      <p className="text-xs text-amber-700">
                                        Remaining inventory as grouped pickup. No bidding.
                                        {ev.bundle_buyout_amount ? ` $${ev.bundle_buyout_amount.toLocaleString()}` : ''}
                                      </p>
                                    </div>
                                  )}
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                                    <span className="text-xs text-slate-500">
                                      {ev.event_date ? new Date(ev.event_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : '—'}
                                      {ev.start_time ? ` · ${ev.start_time}${ev.end_time ? `–${ev.end_time}` : ''}` : ''}
                                    </span>
                                  </div>
                                  {ev.zip && (
                                    <div className="flex items-center gap-2">
                                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                      <span className="text-xs text-slate-500">ZIP: {ev.zip}</span>
                                    </div>
                                  )}
                                  {ev.max_reseller_spots && (
                                    <div className="flex items-center gap-2">
                                      <Users className="w-3.5 h-3.5 text-slate-400" />
                                      <span className="text-xs text-slate-500">{regCount}/{ev.max_reseller_spots} spots filled</span>
                                    </div>
                                  )}
                                  {myReg && (
                                    <div>
                                      <RegStatusBadge status={myReg.status} />
                                      {myReg.status === 'approved' && <p className="text-xs text-green-700 mt-1">You're approved — see you there!</p>}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
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
  return <Badge className={`text-xs h-5 ${colors[status] || 'bg-slate-100 text-slate-600'}`}>{status?.replace('_', ' ')}</Badge>;
}