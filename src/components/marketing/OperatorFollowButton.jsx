import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Bell, BellOff, Pause, Loader2, CheckCircle2 } from 'lucide-react';

export default function OperatorFollowButton({ operatorId, operatorName, sourcePage = 'operator_page', compact = false }) {
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  useEffect(() => { loadStatus(); }, [operatorId]);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const u = await base44.auth.me();
      setUser(u);
      if (u && operatorId) {
        const subs = await base44.entities.OperatorFollowerSubscription.filter({
          consumer_email: u.email,
          operator_id: operatorId,
        });
        setSubscription(subs[0] || null);
      }
    } catch {}
    setLoading(false);
  };

  const ensureProfile = async (u) => {
    const profiles = await base44.entities.ConsumerMarketingProfile.filter({ email: u.email });
    if (profiles.length === 0) {
      await base44.entities.ConsumerMarketingProfile.create({
        user_id: u.id,
        email: u.email,
        first_name: u.full_name?.split(' ')[0] || '',
        last_name: u.full_name?.split(' ').slice(1).join(' ') || '',
        global_marketing_opt_in: true,
        estate_sale_alerts_opt_in: true,
        source: sourcePage === 'operator_page' ? 'operator_page' : 'sale_page',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  };

  const handleFollow = async () => {
    if (!user) { base44.auth.redirectToLogin(); return; }
    setActing(true);
    try {
      await ensureProfile(user);
      const now = new Date().toISOString();
      let sub;
      if (subscription) {
        await base44.entities.OperatorFollowerSubscription.update(subscription.id, {
          subscription_status: 'active',
          subscribed_at: now,
          unsubscribed_at: null,
          paused_until: null,
        });
        sub = { ...subscription, subscription_status: 'active' };
      } else {
        sub = await base44.entities.OperatorFollowerSubscription.create({
          consumer_user_id: user.id,
          consumer_email: user.email,
          operator_id: operatorId,
          operator_name: operatorName,
          subscription_status: 'active',
          alert_types: ['new_sale_alerts', 'sale_reminders'],
          source_page: sourcePage,
          subscribed_at: now,
        });
      }
      // Sync to Customer.io
      await base44.functions.invoke('customerioService', { action: 'syncOperatorSubscription', subscription: sub, eventType: 'subscribed' });
      setSubscription(sub);
    } catch (err) { console.error('Follow failed:', err); }
    setActing(false);
  };

  const handleUnfollow = async () => {
    if (!subscription) return;
    setActing(true);
    try {
      const now = new Date().toISOString();
      await base44.entities.OperatorFollowerSubscription.update(subscription.id, {
        subscription_status: 'unsubscribed',
        unsubscribed_at: now,
        unsubscribe_reason: 'user_requested',
      });
      await base44.functions.invoke('customerioService', { action: 'syncOperatorSubscription', subscription: { ...subscription, subscription_status: 'unsubscribed' }, eventType: 'unsubscribed' });
      setSubscription(prev => ({ ...prev, subscription_status: 'unsubscribed' }));
    } catch (err) { console.error('Unfollow failed:', err); }
    setActing(false);
  };

  const handlePause = async () => {
    if (!subscription) return;
    setActing(true);
    try {
      const pauseUntil = new Date();
      pauseUntil.setDate(pauseUntil.getDate() + 30);
      const updates = { subscription_status: 'paused', paused_until: pauseUntil.toISOString().split('T')[0] };
      await base44.entities.OperatorFollowerSubscription.update(subscription.id, updates);
      await base44.functions.invoke('customerioService', { action: 'syncOperatorSubscription', subscription: { ...subscription, ...updates }, eventType: 'paused' });
      setSubscription(prev => ({ ...prev, ...updates }));
    } catch (err) { console.error('Pause failed:', err); }
    setActing(false);
  };

  if (loading) return <Button variant="outline" size={compact ? 'sm' : 'default'} disabled><Loader2 className="w-3.5 h-3.5 animate-spin" /></Button>;

  const status = subscription?.subscription_status;
  const isActive = status === 'active';
  const isPaused = status === 'paused';
  const isUnfollowed = !subscription || status === 'unsubscribed';

  if (isUnfollowed) {
    return (
      <Button onClick={handleFollow} disabled={acting} size={compact ? 'sm' : 'default'} className="bg-blue-600 hover:bg-blue-700 text-white">
        {acting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Bell className="w-3.5 h-3.5 mr-1.5" />}
        Follow this company
      </Button>
    );
  }

  if (isPaused) {
    return (
      <Button onClick={handleFollow} disabled={acting} variant="outline" size={compact ? 'sm' : 'default'} className="border-amber-300 text-amber-700 hover:bg-amber-50">
        {acting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Pause className="w-3.5 h-3.5 mr-1.5" />}
        {compact ? 'Paused' : 'Alerts Paused — Click to Resume'}
      </Button>
    );
  }

  // Active
  return (
    <div className="flex gap-1.5">
      <Button variant="outline" size={compact ? 'sm' : 'default'} className="border-green-300 text-green-700 hover:bg-green-50" disabled>
        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />Following
      </Button>
      {!compact && (
        <>
          <Button onClick={handlePause} disabled={acting} variant="outline" size="sm" className="text-amber-600 border-amber-200 hover:bg-amber-50 text-xs">
            <Pause className="w-3 h-3 mr-1" />Pause
          </Button>
          <Button onClick={handleUnfollow} disabled={acting} variant="outline" size="sm" className="text-red-500 border-red-200 hover:bg-red-50 text-xs">
            <BellOff className="w-3 h-3 mr-1" />Unfollow
          </Button>
        </>
      )}
    </div>
  );
}