import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users, DollarSign, Clock, CheckCircle, Gift, TrendingUp, Mail, Link2, Upload
} from 'lucide-react';
import { Link } from 'react-router-dom';
import ReferralLinkCard from '@/components/referrals/ReferralLinkCard';
import ReferralList from '@/components/referrals/ReferralList';

const STATUS_COLORS = {
  pending:    'bg-yellow-100 text-yellow-700',
  signed_up:  'bg-blue-100 text-blue-700',
  subscribed: 'bg-cyan-100 text-cyan-700',
  converted:  'bg-green-100 text-green-700',
  paid:       'bg-emerald-100 text-emerald-700',
};

export default function ReferralDashboard() {
  const [user, setUser] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    const me = await base44.auth.me();
    setUser(me);

    const [refs, rews] = await Promise.all([
      base44.entities.Referral.filter({ referrer_id: me.id }, '-created_date'),
      base44.entities.UserReward.filter({ user_id: me.id }, '-created_date', 50),
    ]);
    setReferrals(refs);
    setRewards(rews);
    setLoading(false);
  };

  const totalEarned = rewards.reduce((sum, r) => sum + (r.points_earned || 0), 0);
  const referralRewards = rewards.filter(r => r.action_id === 'referral_signup' || r.action_id === 'referral_subscribed');
  const referralRewardTotal = referralRewards.reduce((sum, r) => sum + (r.points_earned || 0), 0);

  const pending   = referrals.filter(r => r.status === 'pending').length;
  const converted = referrals.filter(r => ['converted','paid','subscribed'].includes(r.status)).length;
  const totalRewardDollars = referrals
    .filter(r => r.reward_status === 'sent' || r.reward_status === 'claimed')
    .reduce((sum, r) => sum + (r.reward_amount || 0), 0);

  const isOperator = ['estate_sale_operator','real_estate_agent','vendor'].includes(user?.primary_account_type);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-serif font-bold text-slate-900">Referral Dashboard</h1>
        <p className="text-slate-500 mt-1">Share your link, track invites, and earn rewards for every successful referral.</p>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Total Sent</p>
              <p className="text-3xl font-bold text-slate-900">{referrals.length}</p>
            </div>
            <Users className="w-8 h-8 text-slate-200" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Pending</p>
              <p className="text-3xl font-bold text-yellow-600">{pending}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-100" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Converted</p>
              <p className="text-3xl font-bold text-green-600">{converted}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-100" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                {isOperator ? 'Cash Earned' : 'Points Earned'}
              </p>
              <p className="text-3xl font-bold text-orange-600">
                {isOperator ? `$${totalRewardDollars}` : referralRewardTotal.toLocaleString()}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-orange-100" />
          </CardContent>
        </Card>
      </div>

      {/* Batch Invite CTA (operators) */}
      {isOperator && (
        <Link
          to="/ReferralBatchInvite"
          className="flex items-center gap-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl px-6 py-4 transition-colors"
        >
          <Upload className="w-5 h-5 text-orange-400 flex-shrink-0" />
          <div>
            <p className="font-semibold">Batch Invite via CSV</p>
            <p className="text-sm text-slate-400">Upload a contact list and send personalized emails in one click</p>
          </div>
          <span className="ml-auto text-orange-400 font-bold">→</span>
        </Link>
      )}

      {/* Referral Link Generator */}
      <ReferralLinkCard user={user} isOperator={isOperator} />

      {/* Tabs */}
      <Tabs defaultValue="referrals">
        <TabsList>
          <TabsTrigger value="referrals">
            <Users className="w-4 h-4 mr-2" /> My Referrals
          </TabsTrigger>
          <TabsTrigger value="rewards">
            <Gift className="w-4 h-4 mr-2" /> Reward History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="referrals" className="mt-4">
          <ReferralList
            referrals={referrals}
            onRefresh={loadAll}
            isOperator={isOperator}
            statusColors={STATUS_COLORS}
          />
        </TabsContent>

        <TabsContent value="rewards" className="mt-4">
          {rewards.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Gift className="w-14 h-14 mx-auto text-slate-200 mb-3" />
                <p className="text-slate-500">No rewards yet — start referring to earn!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {rewards.map(r => (
                <div key={r.id} className="flex items-center justify-between bg-white border border-slate-100 rounded-xl px-5 py-4 shadow-sm">
                  <div>
                    <p className="font-medium text-slate-800">{r.action_name || r.action_id}</p>
                    {r.description && <p className="text-sm text-slate-500">{r.description}</p>}
                    <p className="text-xs text-slate-400 mt-0.5">{new Date(r.created_date).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-green-600">+{r.points_earned?.toLocaleString()}</span>
                    <p className="text-xs text-slate-400">pts</p>
                  </div>
                </div>
              ))}
              <div className="flex justify-between items-center bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 font-bold">
                <span className="text-slate-700">Total Points</span>
                <span className="text-orange-600 text-xl">{totalEarned.toLocaleString()} pts</span>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}