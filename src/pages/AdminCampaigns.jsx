import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Megaphone, TrendingUp, Mail, MessageSquare, Users } from 'lucide-react';

export default function AdminCampaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCampaigns();
  }, []);

  useEffect(() => {
    filterCampaigns();
  }, [searchQuery, statusFilter, typeFilter, campaigns]);

  const loadCampaigns = async () => {
    try {
      const data = await base44.entities.Campaign.list();
      setCampaigns(data);
      setFilteredCampaigns(data);
    } catch (error) {
      console.error('Error loading campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterCampaigns = () => {
    let filtered = campaigns;

    if (searchQuery) {
      filtered = filtered.filter(campaign =>
        campaign.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        campaign.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(campaign => campaign.status === statusFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(campaign => campaign.campaign_type === typeFilter);
    }

    setFilteredCampaigns(filtered);
  };

  const getStatusBadge = (status) => {
    const configs = {
      draft: { label: 'Draft', className: 'bg-slate-100 text-slate-700' },
      active: { label: 'Active', className: 'bg-green-100 text-green-700' },
      paused: { label: 'Paused', className: 'bg-yellow-100 text-yellow-700' },
      completed: { label: 'Completed', className: 'bg-blue-100 text-blue-700' },
      archived: { label: 'Archived', className: 'bg-red-100 text-red-700' }
    };
    const config = configs[status] || configs.draft;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getCampaignIcon = (type) => {
    const icons = {
      email: Mail,
      sms: MessageSquare,
      postcard: Megaphone,
      social: Users,
      funnel: TrendingUp,
      multi_channel: Megaphone
    };
    return icons[type] || Megaphone;
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="h-64 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-4xl font-serif font-bold text-slate-900 mb-2">Campaign Management</h1>
        <p className="text-slate-600">{campaigns.length} total campaigns</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <Input
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg bg-white"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="draft">Draft</option>
          <option value="completed">Completed</option>
          <option value="archived">Archived</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg bg-white"
        >
          <option value="all">All Types</option>
          <option value="email">Email</option>
          <option value="sms">SMS</option>
          <option value="postcard">Postcard</option>
          <option value="social">Social</option>
          <option value="funnel">Funnel</option>
          <option value="multi_channel">Multi-Channel</option>
        </select>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {filteredCampaigns.map(campaign => {
          const Icon = getCampaignIcon(campaign.campaign_type);
          return (
            <Card key={campaign.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="w-5 h-5 text-cyan-600" />
                        <h3 className="text-xl font-semibold text-slate-900">{campaign.name}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(campaign.status)}
                        <Badge variant="outline">{campaign.campaign_type}</Badge>
                      </div>
                    </div>
                  </div>

                  {campaign.description && (
                    <p className="text-sm text-slate-600 line-clamp-2">{campaign.description}</p>
                  )}

                  {campaign.metrics && (
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                      <div>
                        <div className="text-xs text-slate-500">Sent</div>
                        <div className="text-lg font-semibold text-slate-900">
                          {campaign.metrics.sent || 0}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">Opened</div>
                        <div className="text-lg font-semibold text-slate-900">
                          {campaign.metrics.opened || 0}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">Clicked</div>
                        <div className="text-lg font-semibold text-slate-900">
                          {campaign.metrics.clicked || 0}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">Converted</div>
                        <div className="text-lg font-semibold text-slate-900">
                          {campaign.metrics.converted || 0}
                        </div>
                      </div>
                    </div>
                  )}

                  {campaign.life_event_target && (
                    <div className="text-xs text-slate-600">
                      <span className="font-medium">Target:</span> {campaign.life_event_target}
                    </div>
                  )}

                  {campaign.budget && (
                    <div className="text-sm text-slate-600">
                      <span className="font-medium">Budget:</span> ${campaign.budget.toLocaleString()} 
                      {campaign.spent && <span className="text-slate-500"> (${campaign.spent.toLocaleString()} spent)</span>}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredCampaigns.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Megaphone className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No campaigns found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}