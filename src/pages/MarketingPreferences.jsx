import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, Bell, BellOff, Pause, CheckCircle2, MapPin, Mail, Users, RefreshCw } from 'lucide-react';

export default function MarketingPreferences() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const u = await base44.auth.me();
      setUser(u);
      const profiles = await base44.entities.ConsumerMarketingProfile.filter({ email: u.email });
      if (profiles.length > 0) {
        setProfile(profiles[0]);
      } else {
        setProfile({
          user_id: u.id,
          email: u.email,
          first_name: u.full_name?.split(' ')[0] || '',
          last_name: u.full_name?.split(' ').slice(1).join(' ') || '',
          global_marketing_opt_in: true,
          estate_sale_alerts_opt_in: true,
          vip_alerts_opt_in: false,
          weekly_digest_opt_in: false,
          preferred_radius_miles: 25,
          zip_code: '',
          city: '',
          state: '',
        });
      }
      const subs = await base44.entities.OperatorFollowerSubscription.filter({ consumer_email: u.email });
      setSubscriptions(subs);
    } catch (err) {
      console.error('Error loading preferences:', err);
    }
    setLoading(false);
  };

  const handleSaveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const existing = await base44.entities.ConsumerMarketingProfile.filter({ email: profile.email });
      const updatedProfile = { ...profile, updated_at: new Date().toISOString() };
      if (existing.length > 0) {
        await base44.entities.ConsumerMarketingProfile.update(existing[0].id, updatedProfile);
      } else {
        await base44.entities.ConsumerMarketingProfile.create({ ...updatedProfile, created_at: new Date().toISOString() });
      }
      // Sync to Customer.io
      await base44.functions.invoke('customerioService', { action: 'identifyConsumer', profile: updatedProfile });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Save failed:', err);
    }
    setSaving(false);
  };

  const handleSubscriptionAction = async (sub, action) => {
    const updates = {};
    const now = new Date().toISOString();
    if (action === 'unsubscribe') {
      updates.subscription_status = 'unsubscribed';
      updates.unsubscribed_at = now;
      updates.unsubscribe_reason = 'user_requested';
    } else if (action === 'pause') {
      const pauseUntil = new Date();
      pauseUntil.setDate(pauseUntil.getDate() + 30);
      updates.subscription_status = 'paused';
      updates.paused_until = pauseUntil.toISOString().split('T')[0];
    } else if (action === 'resume') {
      updates.subscription_status = 'active';
      updates.paused_until = null;
    }
    await base44.entities.OperatorFollowerSubscription.update(sub.id, updates);
    // Sync event to Customer.io
    await base44.functions.invoke('customerioService', {
      action: 'syncOperatorSubscription',
      subscription: { ...sub, ...updates },
      eventType: action === 'unsubscribe' ? 'unsubscribed' : action === 'pause' ? 'paused' : 'subscribed',
    });
    loadData();
  };

  if (loading) return (
    <div className="p-8 flex justify-center">
      <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
    </div>
  );

  const isGloballyOptedOut = profile?.suppression_status !== 'active' || !profile?.global_marketing_opt_in;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Manage Your Estate Sale Alerts</h1>
        <p className="text-slate-500 mt-2">
          Choose which estate sale companies you want to hear from. You can unsubscribe from one company without turning off all Legacy Lane alerts.
        </p>
      </div>

      {/* Global Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="w-4 h-4 text-blue-600" />
            Global Email Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { key: 'global_marketing_opt_in', label: 'Turn off all Legacy Lane marketing emails', danger: true },
            { key: 'estate_sale_alerts_opt_in', label: 'Estate sale new listing alerts' },
            { key: 'vip_alerts_opt_in', label: 'VIP early access alerts' },
            { key: 'weekly_digest_opt_in', label: 'Weekly digest of sales near me' },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
              <span className={`text-sm ${item.danger ? 'text-red-700 font-medium' : 'text-slate-700'}`}>
                {item.label}
              </span>
              <button
                onClick={() => setProfile(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${profile?.[item.key] ? (item.danger ? 'bg-red-500' : 'bg-green-500') : 'bg-slate-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${profile?.[item.key] ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          ))}

          {isGloballyOptedOut && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-xs text-red-700 font-medium">You are currently opted out of all Legacy Lane marketing emails. Individual operator alerts are paused.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Location Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-4 h-4 text-amber-600" />
            Location & Radius
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 block mb-1">ZIP Code</label>
              <Input value={profile?.zip_code || ''} onChange={e => setProfile(p => ({ ...p, zip_code: e.target.value }))} placeholder="07001" className="h-8 text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">Alert Radius (miles)</label>
              <Input type="number" value={profile?.preferred_radius_miles || 25} onChange={e => setProfile(p => ({ ...p, preferred_radius_miles: parseInt(e.target.value) }))} className="h-8 text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">City</label>
              <Input value={profile?.city || ''} onChange={e => setProfile(p => ({ ...p, city: e.target.value }))} placeholder="Your city" className="h-8 text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">State</label>
              <Input value={profile?.state || ''} onChange={e => setProfile(p => ({ ...p, state: e.target.value }))} placeholder="NJ" className="h-8 text-sm" maxLength={2} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Operator Subscriptions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-600" />
            Companies You Follow
            <Badge className="bg-purple-100 text-purple-700 border-purple-200">{subscriptions.filter(s => s.subscription_status === 'active').length} active</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {subscriptions.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">You're not following any estate sale companies yet. Visit an operator's profile to follow them.</p>
          ) : (
            subscriptions.map(sub => (
              <div key={sub.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50">
                <div>
                  <p className="text-sm font-medium text-slate-800">{sub.operator_name}</p>
                  <p className="text-xs text-slate-500">
                    {sub.subscription_status === 'active' && <span className="text-green-600">● Active</span>}
                    {sub.subscription_status === 'paused' && <span className="text-amber-600">⏸ Paused until {sub.paused_until}</span>}
                    {sub.subscription_status === 'unsubscribed' && <span className="text-red-600">✕ Unsubscribed</span>}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Stop alerts from this company only</p>
                </div>
                <div className="flex gap-1.5">
                  {sub.subscription_status === 'active' && (
                    <>
                      <button onClick={() => handleSubscriptionAction(sub, 'pause')} className="text-[10px] px-2 py-1 rounded border border-amber-300 text-amber-700 hover:bg-amber-50 flex items-center gap-1">
                        <Pause className="w-2.5 h-2.5" />Pause alerts temporarily
                      </button>
                      <button onClick={() => handleSubscriptionAction(sub, 'unsubscribe')} className="text-[10px] px-2 py-1 rounded border border-red-300 text-red-600 hover:bg-red-50">
                        Unfollow
                      </button>
                    </>
                  )}
                  {sub.subscription_status === 'paused' && (
                    <button onClick={() => handleSubscriptionAction(sub, 'resume')} className="text-[10px] px-2 py-1 rounded border border-green-300 text-green-700 hover:bg-green-50 flex items-center gap-1">
                      <RefreshCw className="w-2.5 h-2.5" />Resume
                    </button>
                  )}
                  {sub.subscription_status === 'unsubscribed' && (
                    <button onClick={() => handleSubscriptionAction(sub, 'resume')} className="text-[10px] px-2 py-1 rounded border border-slate-300 text-slate-600 hover:bg-slate-100">
                      Re-follow
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button onClick={handleSaveProfile} disabled={saving} className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold">
        {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
          : saved ? <><CheckCircle2 className="w-4 h-4 mr-2" />Preferences Saved!</>
          : 'Save Preferences'}
      </Button>

      <p className="text-xs text-slate-400 text-center pb-4">
        Your consent is stored securely in Legacy Lane OS. Unsubscribing from one company never affects your other subscriptions.
      </p>
    </div>
  );
}