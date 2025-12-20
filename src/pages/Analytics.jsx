import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { BarChart3, TrendingUp, Users, DollarSign, Mail, MousePointer } from 'lucide-react';

export default function Analytics() {
  const [campaigns, setCampaigns] = useState([]);
  const [interactions, setInteractions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const user = await base44.auth.me();
      const campaignData = await base44.entities.Campaign.filter({ creator_id: user.id });
      setCampaigns(campaignData);

      const interactionData = await base44.entities.MarketingInteraction.list();
      setInteractions(interactionData);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    totalSent: campaigns.reduce((sum, c) => sum + (c.metrics?.sent || 0), 0),
    totalOpened: campaigns.reduce((sum, c) => sum + (c.metrics?.opened || 0), 0),
    totalClicked: campaigns.reduce((sum, c) => sum + (c.metrics?.clicked || 0), 0),
    totalRevenue: campaigns.reduce((sum, c) => sum + (c.metrics?.revenue || 0), 0),
    openRate: 0,
    clickRate: 0
  };

  if (stats.totalSent > 0) {
    stats.openRate = Math.round((stats.totalOpened / stats.totalSent) * 100);
    stats.clickRate = Math.round((stats.totalClicked / stats.totalSent) * 100);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cream-50 to-sage-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-serif font-bold text-navy-900 mb-2">
            Marketing Analytics
          </h1>
          <p className="text-slate-600">Track performance and optimize your campaigns</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total Sent</CardTitle>
              <Mail className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-navy-900">{stats.totalSent.toLocaleString()}</div>
              <p className="text-xs text-slate-500 mt-1">Across all campaigns</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Open Rate</CardTitle>
              <TrendingUp className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-navy-900">{stats.openRate}%</div>
              <p className="text-xs text-slate-500 mt-1">{stats.totalOpened.toLocaleString()} opens</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Click Rate</CardTitle>
              <MousePointer className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-navy-900">{stats.clickRate}%</div>
              <p className="text-xs text-slate-500 mt-1">{stats.totalClicked.toLocaleString()} clicks</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Conversions</CardTitle>
              <Users className="h-5 w-5 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-navy-900">
                {campaigns.reduce((sum, c) => sum + (c.metrics?.converted || 0), 0)}
              </div>
              <p className="text-xs text-slate-500 mt-1">Total conversions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Revenue</CardTitle>
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-navy-900">${stats.totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-slate-500 mt-1">From campaigns</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Avg. ROI</CardTitle>
              <BarChart3 className="h-5 w-5 text-indigo-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-navy-900">
                {campaigns.length > 0 ? Math.round((stats.totalRevenue / campaigns.reduce((sum, c) => sum + (c.spent || 0), 0) - 1) * 100) : 0}%
              </div>
              <p className="text-xs text-slate-500 mt-1">Return on investment</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="channels">Channels</TabsTrigger>
            <TabsTrigger value="attribution">Attribution</TabsTrigger>
            <TabsTrigger value="ltv">Lifetime Value</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-serif text-navy-900">Campaign Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {campaigns.map(campaign => (
                    <div key={campaign.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-semibold text-navy-900">{campaign.name}</h3>
                        <p className="text-sm text-slate-500 capitalize">{campaign.campaign_type}</p>
                      </div>
                      <div className="grid grid-cols-4 gap-8 text-center">
                        <div>
                          <p className="text-sm text-slate-500">Sent</p>
                          <p className="text-lg font-bold text-navy-900">{campaign.metrics?.sent || 0}</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-500">Opened</p>
                          <p className="text-lg font-bold text-navy-900">{campaign.metrics?.opened || 0}</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-500">Clicked</p>
                          <p className="text-lg font-bold text-navy-900">{campaign.metrics?.clicked || 0}</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-500">Revenue</p>
                          <p className="text-lg font-bold text-navy-900">${campaign.metrics?.revenue || 0}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="channels" className="mt-6">
            <Card>
              <CardContent className="p-12 text-center">
                <BarChart3 className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                <h3 className="text-xl font-semibold text-slate-700 mb-2">
                  Channel Analytics Coming Soon
                </h3>
                <p className="text-slate-500">
                  Compare performance across email, SMS, postcards, and social
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="attribution" className="mt-6">
            <Card>
              <CardContent className="p-12 text-center">
                <TrendingUp className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                <h3 className="text-xl font-semibold text-slate-700 mb-2">
                  Attribution Tracking
                </h3>
                <p className="text-slate-500">
                  Multi-touch attribution and conversion path analysis
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ltv" className="mt-6">
            <Card>
              <CardContent className="p-12 text-center">
                <DollarSign className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                <h3 className="text-xl font-semibold text-slate-700 mb-2">
                  Lifetime Value Scoring
                </h3>
                <p className="text-slate-500">
                  Predictive LTV and customer segmentation insights
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}