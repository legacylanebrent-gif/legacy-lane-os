import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Megaphone, BarChart3, Users, TrendingUp, Zap } from 'lucide-react';
import CampaignBuilder from '@/components/socialads/CampaignBuilder';
import CampaignTracker from '@/components/socialads/CampaignTracker';
import LeadTracker from '@/components/socialads/LeadTracker';
import SocialInsights from '@/components/socialads/SocialInsights';

export default function SocialAdsHub() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('campaigns');

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-700 rounded-full animate-spin" />
      </div>
    );
  }

  const adsCredentials = user?.social_media_credentials?.facebook_ads;
  const hasAds = adsCredentials?.ad_account_id && adsCredentials?.access_token;

  if (!hasAds) {
    return (
      <div className="p-8 max-w-xl mx-auto mt-20">
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-8 text-center">
            <div className="text-5xl mb-4">📣</div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Facebook Ads Manager Not Connected</h2>
            <p className="text-slate-600 mb-6">
              To use the Ads Hub, connect your Facebook Ads Manager credentials in your profile settings first.
            </p>
            <div className="flex items-center gap-2 bg-white border border-orange-200 rounded-lg p-4 text-left mb-6">
              <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0" />
              <p className="text-sm text-slate-600">
                Go to <strong>My Profile → Social Media</strong> tab and fill in your <strong>Facebook Ads Manager</strong> credentials (Ad Account ID, App ID, App Secret, Access Token).
              </p>
            </div>
            <Button
              onClick={() => window.location.href = '/MyProfile'}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Go to Profile Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tabs = [
    { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
    { id: 'tracker', label: 'Campaign Tracker', icon: BarChart3 },
    { id: 'leads', label: 'Lead Tracking', icon: Users },
    { id: 'insights', label: 'Social Insights', icon: TrendingUp },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-blue-800 rounded-xl flex items-center justify-center text-white text-xl">📣</div>
            <h1 className="text-3xl font-serif font-bold text-slate-900">Social Ads Hub</h1>
          </div>
          <p className="text-slate-600 ml-13">Facebook Ads Manager · Social Media Insights · Lead Tracking</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-green-100 text-green-700 border-green-300 gap-1.5 text-sm px-3 py-1">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            Connected: {adsCredentials.ad_account_id}
          </Badge>
          <Badge className="bg-blue-100 text-blue-700 border-blue-300 gap-1.5 text-sm px-3 py-1">
            <Zap className="w-3 h-3" />
            {Object.keys(user?.social_media_credentials || {}).filter(k => k !== 'facebook_ads').length} Social Platforms
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-11 gap-1 bg-slate-100 p-1">
          {tabs.map(t => (
            <TabsTrigger key={t.id} value={t.id} className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <t.icon className="w-4 h-4" />
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="campaigns" className="mt-6">
          <CampaignBuilder adsCredentials={adsCredentials} user={user} />
        </TabsContent>

        <TabsContent value="tracker" className="mt-6">
          <CampaignTracker adsCredentials={adsCredentials} />
        </TabsContent>

        <TabsContent value="leads" className="mt-6">
          <LeadTracker user={user} />
        </TabsContent>

        <TabsContent value="insights" className="mt-6">
          <SocialInsights user={user} />
        </TabsContent>
      </Tabs>
    </div>
  );
}