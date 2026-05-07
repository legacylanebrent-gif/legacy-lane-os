import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Building2, Search, Trash2, Bell, Mail, MessageSquare, Star, Plus, MapPin, SlidersHorizontal, ChevronDown, ChevronUp
} from 'lucide-react';

// Haversine distance in miles
function haversine(lat1, lon1, lat2, lon2) {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const RADIUS_OPTIONS = [15, 25, 50, 100, 0]; // 0 = all

export default function FavoriteCompanies() {
  const [currentUser, setCurrentUser] = useState(null);
  const [follows, setFollows] = useState([]);
  const [operators, setOperators] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [showBrowse, setShowBrowse] = useState(false);
  const [browseSearch, setBrowseSearch] = useState('');
  const [browseRadius, setBrowseRadius] = useState(15);
  const [addingId, setAddingId] = useState(null);
  const [userLocation, setUserLocation] = useState(null); // {lat, lng}
  const [showFilters, setShowFilters] = useState(false);
  const [filterState, setFilterState] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterRadius, setFilterRadius] = useState(0); // 0 = all followed companies
  const [expandedIds, setExpandedIds] = useState(new Set());

  const toggleExpanded = (id) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  useEffect(() => {
    loadData();
    // Load cached user location
    const stored = localStorage.getItem('userLocation');
    if (stored) {
      try { setUserLocation(JSON.parse(stored)); } catch (e) {}
    }
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);

      const [myFollows, allUsers] = await Promise.all([
        base44.entities.CompanyFollow.filter({ consumer_user_id: user.id }),
        base44.entities.User.list()
      ]);

      setFollows(myFollows);
      const ops = allUsers.filter(u =>
        u.company_name ||
        u.primary_account_type === 'estate_sale_operator' ||
        u.role === 'operator'
      );
      setOperators(ops);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (followId, field, value) => {
    setSaving(prev => ({ ...prev, [followId]: true }));
    try {
      await base44.entities.CompanyFollow.update(followId, { [field]: value });
      setFollows(prev => prev.map(f => f.id === followId ? { ...f, [field]: value } : f));
    } catch (err) {
      console.error('Error updating follow:', err);
    } finally {
      setSaving(prev => ({ ...prev, [followId]: false }));
    }
  };

  const handleUnfollow = async (followId) => {
    if (!confirm('Stop following this company?')) return;
    try {
      await base44.entities.CompanyFollow.delete(followId);
      setFollows(prev => prev.filter(f => f.id !== followId));
    } catch (err) {
      console.error('Error unfollowing:', err);
    }
  };

  const handleFollow = async (operator) => {
    if (!currentUser) return;
    setAddingId(operator.id);
    try {
      const newFollow = await base44.entities.CompanyFollow.create({
        consumer_user_id: currentUser.id,
        operator_id: operator.id,
        operator_name: operator.company_name || operator.full_name,
        operator_city: operator.city || '',
        operator_state: operator.state || '',
        notify_email: true,
        notify_sms: false,
        notify_inapp: true,
        auto_favorite: false
      });
      setFollows(prev => [...prev, newFollow]);
      setShowBrowse(false);
      setBrowseSearch('');
    } catch (err) {
      console.error('Error following company:', err);
    } finally {
      setAddingId(null);
    }
  };

  // Estimate operator location from city/state (use their lat/lng if stored, else skip distance filter)
  const getOperatorLocation = (op) => {
    if (op.location?.lat && op.location?.lng) return op.location;
    return null;
  };

  const operatorWithinRadius = (op, radiusMiles) => {
    if (radiusMiles === 0) return true; // "All"
    if (!userLocation) return true; // Can't filter without user location
    const loc = getOperatorLocation(op);
    if (!loc) return true; // No coords for operator, include them
    return haversine(userLocation.lat, userLocation.lng, loc.lat, loc.lng) <= radiusMiles;
  };

  const followedIds = new Set(follows.map(f => f.operator_id));

  // Browse results: exclude already-followed, apply radius + search
  const browseResults = operators.filter(op => {
    if (followedIds.has(op.id)) return false;
    if (!operatorWithinRadius(op, browseRadius)) return false;
    if (!browseSearch.trim()) return true;
    const q = browseSearch.toLowerCase();
    return (
      op.company_name?.toLowerCase().includes(q) ||
      op.full_name?.toLowerCase().includes(q) ||
      op.city?.toLowerCase().includes(q) ||
      op.state?.toLowerCase().includes(q)
    );
  });

  // Followed companies filter
  const filteredFollows = follows.filter(f => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery.trim() || (
      f.operator_name?.toLowerCase().includes(q) ||
      f.operator_city?.toLowerCase().includes(q) ||
      f.operator_state?.toLowerCase().includes(q)
    );
    const matchesState = !filterState.trim() || f.operator_state?.toLowerCase().includes(filterState.toLowerCase());
    const matchesCity = !filterCity.trim() || f.operator_city?.toLowerCase().includes(filterCity.toLowerCase());
    return matchesSearch && matchesState && matchesCity;
  });

  const hasActiveFilters = filterState || filterCity;
  const uniqueStates = [...new Set(follows.map(f => f.operator_state).filter(Boolean))].sort();

  if (loading) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid md:grid-cols-2 gap-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-4xl font-serif font-bold text-slate-900 mb-1">🏢 Favorite Companies</h1>
          <p className="text-slate-600">Follow companies and get notified when they post new sales.</p>
          {userLocation && (
            <p className="text-xs text-slate-400 mt-1">📍 Showing companies near your saved location</p>
          )}
        </div>
        <Button
          onClick={() => setShowBrowse(!showBrowse)}
          className="bg-orange-600 hover:bg-orange-700 gap-2"
        >
          <Plus className="w-4 h-4" />
          Find Companies
        </Button>
      </div>

      {/* Browse / Add Companies Panel */}
      {showBrowse && (
        <Card className="border-2 border-orange-200 bg-orange-50">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h3 className="font-semibold text-slate-900 text-lg flex items-center gap-2">
                <Search className="w-5 h-5 text-orange-600" />
                Find Companies to Follow
              </h3>
              {/* Radius selector */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-slate-600 font-medium">Within:</span>
                {RADIUS_OPTIONS.map(r => (
                  <button
                    key={r}
                    onClick={() => setBrowseRadius(r)}
                    className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                      browseRadius === r
                        ? 'bg-orange-600 text-white border-orange-600'
                        : 'bg-white text-slate-600 border-slate-300 hover:border-orange-400'
                    }`}
                  >
                    {r === 0 ? 'All' : `${r} mi`}
                  </button>
                ))}
              </div>
            </div>

            {!userLocation && browseRadius !== 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm text-amber-700">
                ⚠️ No saved location found. Visit the home page and allow location access, or select "All" to see all companies.
              </div>
            )}

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search by company name, city, state..."
                value={browseSearch}
                onChange={(e) => setBrowseSearch(e.target.value)}
                className="pl-9 bg-white"
              />
            </div>

            {browseResults.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-4">
                {browseSearch
                  ? 'No companies found matching your search.'
                  : browseRadius === 0
                  ? 'All available companies are already followed.'
                  : `No companies found within ${browseRadius} miles. Try expanding the radius.`}
              </p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {browseResults.map(op => (
                  <div key={op.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-3 border border-slate-200">
                    <div>
                      <p className="font-medium text-slate-900">{op.company_name || op.full_name}</p>
                      {(op.city || op.state) && (
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" />
                          {[op.city, op.state].filter(Boolean).join(', ')}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleFollow(op)}
                      disabled={addingId === op.id}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      {addingId === op.id ? 'Following...' : '+ Follow'}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Followed Companies — Search + Filter Bar */}
      {follows.length > 0 && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search followed companies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={`gap-2 ${hasActiveFilters ? 'border-orange-500 text-orange-600' : ''}`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {hasActiveFilters && <Badge className="bg-orange-600 text-white text-xs px-1.5 py-0">{[filterState, filterCity].filter(Boolean).length}</Badge>}
              {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>

          {showFilters && (
            <Card className="border border-slate-200 bg-slate-50">
              <CardContent className="p-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Filter by State</label>
                    <select
                      value={filterState}
                      onChange={e => setFilterState(e.target.value)}
                      className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm bg-white"
                    >
                      <option value="">All States</option>
                      {uniqueStates.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Filter by City</label>
                    <Input
                      placeholder="e.g. Newark"
                      value={filterCity}
                      onChange={(e) => setFilterCity(e.target.value)}
                      className="bg-white"
                    />
                  </div>
                </div>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3 text-slate-500 hover:text-slate-700"
                    onClick={() => { setFilterState(''); setFilterCity(''); }}
                  >
                    Clear Filters
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Followed Companies List */}
      {filteredFollows.length === 0 ? (
        <Card className="p-12 text-center">
          <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">
            {follows.length === 0 ? 'No Companies Followed Yet' : 'No Results'}
          </h3>
          <p className="text-slate-500 mb-6">
            {follows.length === 0
              ? 'Follow estate sale companies to get notified when they post new sales.'
              : 'No followed companies match your current filters.'}
          </p>
          {follows.length === 0 && (
            <Button onClick={() => setShowBrowse(true)} className="bg-orange-600 hover:bg-orange-700">
              Find Companies
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">{filteredFollows.length} {filteredFollows.length === 1 ? 'company' : 'companies'} followed</p>
          {filteredFollows.map(follow => {
            const isExpanded = expandedIds.has(follow.id);
            return (
              <Card key={follow.id} className="border border-slate-200 overflow-hidden">
                {/* Collapsed header — always visible */}
                <button
                  onClick={() => toggleExpanded(follow.id)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{follow.operator_name}</p>
                    {(follow.operator_city || follow.operator_state) && (
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        {[follow.operator_city, follow.operator_state].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                  {/* Badge summary when collapsed */}
                  {!isExpanded && (
                    <div className="flex gap-1 flex-shrink-0">
                      {follow.notify_email && <span className="text-xs bg-blue-100 text-blue-600 rounded px-1.5 py-0.5">📧</span>}
                      {follow.notify_sms && <span className="text-xs bg-green-100 text-green-600 rounded px-1.5 py-0.5">💬</span>}
                      {follow.notify_inapp && <span className="text-xs bg-orange-100 text-orange-600 rounded px-1.5 py-0.5">🔔</span>}
                      {follow.auto_favorite && <span className="text-xs bg-yellow-100 text-yellow-600 rounded px-1.5 py-0.5">⭐</span>}
                    </div>
                  )}
                  <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <CardContent className="px-5 pb-5 pt-0 border-t border-slate-100">
                    {/* Notification Preferences */}
                    <div className="bg-slate-50 rounded-lg p-4 space-y-3 mt-4">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Notification Preferences</p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-blue-500" />
                          <span className="text-sm text-slate-700">Email Notifications</span>
                        </div>
                        <Switch
                          checked={!!follow.notify_email}
                          onCheckedChange={(val) => handleToggle(follow.id, 'notify_email', val)}
                          disabled={saving[follow.id]}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-slate-700">SMS Notifications</span>
                        </div>
                        <Switch
                          checked={!!follow.notify_sms}
                          onCheckedChange={(val) => handleToggle(follow.id, 'notify_sms', val)}
                          disabled={saving[follow.id]}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Bell className="w-4 h-4 text-orange-500" />
                          <span className="text-sm text-slate-700">In-App Notifications</span>
                        </div>
                        <Switch
                          checked={!!follow.notify_inapp}
                          onCheckedChange={(val) => handleToggle(follow.id, 'notify_inapp', val)}
                          disabled={saving[follow.id]}
                        />
                      </div>

                      <div className="border-t border-slate-200 pt-3 mt-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Star className="w-4 h-4 text-yellow-500" />
                            <div>
                              <span className="text-sm text-slate-700 font-medium">Auto-Favorite New Sales</span>
                              <p className="text-xs text-slate-400">Automatically add new sales to your Favorite Sales list</p>
                            </div>
                          </div>
                          <Switch
                            checked={!!follow.auto_favorite}
                            onCheckedChange={(val) => handleToggle(follow.id, 'auto_favorite', val)}
                            disabled={saving[follow.id]}
                          />
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUnfollow(follow.id)}
                      className="mt-3 text-red-500 hover:text-red-600 hover:bg-red-50 gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Unfollow
                    </Button>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}