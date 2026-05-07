import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Building2, Search, Trash2, Bell, Mail, MessageSquare, Star, Plus, MapPin, Check
} from 'lucide-react';

export default function FavoriteCompanies() {
  const [currentUser, setCurrentUser] = useState(null);
  const [follows, setFollows] = useState([]);
  const [operators, setOperators] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [showBrowse, setShowBrowse] = useState(false);
  const [browseSearch, setBrowseSearch] = useState('');
  const [addingId, setAddingId] = useState(null);

  useEffect(() => {
    loadData();
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
      // Filter users that are operators (have company_name or role=operator/estate_sale_operator)
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

  const followedIds = new Set(follows.map(f => f.operator_id));

  const filteredFollows = follows.filter(f => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      f.operator_name?.toLowerCase().includes(q) ||
      f.operator_city?.toLowerCase().includes(q) ||
      f.operator_state?.toLowerCase().includes(q)
    );
  });

  const browseResults = operators.filter(op => {
    if (followedIds.has(op.id)) return false;
    if (!browseSearch.trim()) return true;
    const q = browseSearch.toLowerCase();
    return (
      op.company_name?.toLowerCase().includes(q) ||
      op.full_name?.toLowerCase().includes(q) ||
      op.city?.toLowerCase().includes(q) ||
      op.state?.toLowerCase().includes(q)
    );
  });

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-serif font-bold text-slate-900 mb-1">🏢 Favorite Companies</h1>
          <p className="text-slate-600">Follow estate sale companies and get notified when they post new sales.</p>
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
            <h3 className="font-semibold text-slate-900 text-lg flex items-center gap-2">
              <Search className="w-5 h-5 text-orange-600" />
              Find Companies to Follow
            </h3>
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
                {browseSearch ? 'No companies found matching your search.' : 'All available companies are already followed.'}
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
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

      {/* Search followed companies */}
      {follows.length > 0 && (
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <Input
            placeholder="Search your followed companies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
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
              : 'No followed companies match your search.'}
          </p>
          {follows.length === 0 && (
            <Button onClick={() => setShowBrowse(true)} className="bg-orange-600 hover:bg-orange-700">
              Find Companies
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredFollows.map(follow => (
            <Card key={follow.id} className="border border-slate-200">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 text-lg">{follow.operator_name}</h3>
                      {(follow.operator_city || follow.operator_state) && (
                        <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" />
                          {[follow.operator_city, follow.operator_state].filter(Boolean).join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleUnfollow(follow.id)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                {/* Notification Preferences */}
                <div className="bg-slate-50 rounded-lg p-4 space-y-3">
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

                {/* Active preferences summary badges */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {follow.notify_email && <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">📧 Email</Badge>}
                  {follow.notify_sms && <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">💬 SMS</Badge>}
                  {follow.notify_inapp && <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs">🔔 In-App</Badge>}
                  {follow.auto_favorite && <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 text-xs">⭐ Auto-Favorite</Badge>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}