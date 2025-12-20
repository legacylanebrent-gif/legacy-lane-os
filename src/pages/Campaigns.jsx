import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, Megaphone, TrendingUp, Users, DollarSign, Play, Pause, Trash2 } from 'lucide-react';

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const userData = await base44.auth.me();
      setUser(userData);

      const campaignData = await base44.entities.Campaign.filter({ creator_id: userData.id });
      setCampaigns(campaignData);
    } catch (error) {
      console.error('Error loading campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCampaigns = campaigns.filter(c => {
    if (filter === 'all') return true;
    return c.status === filter;
  });

  const stats = {
    total: campaigns.length,
    active: campaigns.filter(c => c.status === 'active').length,
    totalSent: campaigns.reduce((sum, c) => sum + (c.metrics?.sent || 0), 0),
    totalRevenue: campaigns.reduce((sum, c) => sum + (c.metrics?.revenue || 0), 0)
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cream-50 to-sage-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-serif font-bold text-navy-900 mb-2">
              Marketing Campaigns
            </h1>
            <p className="text-slate-600">Create and manage automated marketing campaigns</p>
          </div>
          <Link to={createPageUrl('CampaignBuilder')}>
            <Button className="bg-gold-600 hover:bg-gold-700">
              <Plus className="w-4 h-4 mr-2" />
              New Campaign
            </Button>
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total Campaigns</CardTitle>
              <Megaphone className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-navy-900">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Active</CardTitle>
              <TrendingUp className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-navy-900">{stats.active}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total Sent</CardTitle>
              <Users className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-navy-900">{stats.totalSent.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Revenue</CardTitle>
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-navy-900">${stats.totalRevenue.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="draft">Draft</TabsTrigger>
            <TabsTrigger value="paused">Paused</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>

          <TabsContent value={filter} className="mt-6">
            {filteredCampaigns.length === 0 ? (
              <Card className="p-12 text-center">
                <Megaphone className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                <h3 className="text-xl font-semibold text-slate-700 mb-2">
                  No campaigns yet
                </h3>
                <p className="text-slate-500 mb-6">
                  Create your first marketing campaign to get started
                </p>
                <Link to={createPageUrl('CampaignBuilder')}>
                  <Button className="bg-gold-600 hover:bg-gold-700">
                    Create Campaign
                  </Button>
                </Link>
              </Card>
            ) : (
              <div className="grid gap-6">
                {filteredCampaigns.map(campaign => (
                  <Card key={campaign.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-serif font-bold text-navy-900">
                              {campaign.name}
                            </h3>
                            <Badge className={
                              campaign.status === 'active' ? 'bg-green-100 text-green-800' :
                              campaign.status === 'draft' ? 'bg-slate-100 text-slate-800' :
                              campaign.status === 'paused' ? 'bg-amber-100 text-amber-800' :
                              'bg-blue-100 text-blue-800'
                            }>
                              {campaign.status}
                            </Badge>
                            <Badge variant="outline" className="capitalize">
                              {campaign.campaign_type?.replace(/_/g, ' ')}
                            </Badge>
                          </div>

                          <p className="text-slate-600 mb-4">
                            {campaign.description}
                          </p>

                          <div className="grid grid-cols-4 gap-6">
                            <div>
                              <p className="text-sm text-slate-500">Sent</p>
                              <p className="text-2xl font-bold text-navy-900">{campaign.metrics?.sent || 0}</p>
                            </div>
                            <div>
                              <p className="text-sm text-slate-500">Opened</p>
                              <p className="text-2xl font-bold text-navy-900">{campaign.metrics?.opened || 0}</p>
                            </div>
                            <div>
                              <p className="text-sm text-slate-500">Converted</p>
                              <p className="text-2xl font-bold text-navy-900">{campaign.metrics?.converted || 0}</p>
                            </div>
                            <div>
                              <p className="text-sm text-slate-500">Revenue</p>
                              <p className="text-2xl font-bold text-navy-900">${campaign.metrics?.revenue || 0}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          {campaign.status === 'active' ? (
                            <Button variant="outline" size="icon">
                              <Pause className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button variant="outline" size="icon">
                              <Play className="w-4 h-4" />
                            </Button>
                          )}
                          <Button variant="outline" size="icon">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}