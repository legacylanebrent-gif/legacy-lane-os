import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Search, Megaphone, TrendingUp, Mail, MessageSquare, Users, Plus, 
  FileText, Send, BarChart, Edit, Trash2, Copy, Play, Pause, Archive 
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminCampaigns() {
  const [user, setUser] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [activeTab, setActiveTab] = useState('campaigns');
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    description: '',
    campaign_type: 'email',
    life_event_target: 'all',
    status: 'draft'
  });
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    template_type: 'email',
    life_event: 'general',
    subject: '',
    content: '',
    category: 'introduction'
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterCampaigns();
  }, [searchQuery, statusFilter, typeFilter, campaigns]);

  const loadData = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);

      const isAdmin = ['super_admin', 'platform_ops', 'growth_team'].includes(
        userData.primary_account_type || userData.primary_role
      );

      // Load campaigns
      let campaignData;
      if (isAdmin) {
        campaignData = await base44.asServiceRole.entities.Campaign.list('-created_date');
      } else {
        campaignData = await base44.entities.Campaign.filter(
          { creator_id: userData.id },
          '-created_date'
        );
      }
      setCampaigns(campaignData);
      setFilteredCampaigns(campaignData);

      // Load templates
      const templateData = await base44.entities.MarketingTemplate.filter(
        { is_public: true },
        '-usage_count'
      );
      setTemplates(templateData);
    } catch (error) {
      console.error('Error loading data:', error);
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

  const handleCreateCampaign = async () => {
    if (!newCampaign.name) {
      toast.error('Please enter a campaign name');
      return;
    }

    try {
      await base44.entities.Campaign.create({
        ...newCampaign,
        creator_id: user.id
      });
      toast.success('Campaign created successfully');
      setShowCreateModal(false);
      setNewCampaign({
        name: '',
        description: '',
        campaign_type: 'email',
        life_event_target: 'all',
        status: 'draft'
      });
      loadData();
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast.error('Failed to create campaign');
    }
  };

  const handleCreateTemplate = async () => {
    if (!newTemplate.name || !newTemplate.content) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await base44.entities.MarketingTemplate.create({
        ...newTemplate,
        creator_id: user.id
      });
      toast.success('Template created successfully');
      setShowTemplateModal(false);
      setNewTemplate({
        name: '',
        description: '',
        template_type: 'email',
        life_event: 'general',
        subject: '',
        content: '',
        category: 'introduction'
      });
      loadData();
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error('Failed to create template');
    }
  };

  const handleUpdateStatus = async (campaignId, newStatus) => {
    try {
      await base44.entities.Campaign.update(campaignId, { status: newStatus });
      toast.success(`Campaign ${newStatus}`);
      loadData();
    } catch (error) {
      console.error('Error updating campaign:', error);
      toast.error('Failed to update campaign');
    }
  };

  const handleDeleteCampaign = async (campaignId) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;

    try {
      await base44.entities.Campaign.delete(campaignId);
      toast.success('Campaign deleted');
      loadData();
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast.error('Failed to delete campaign');
    }
  };

  const handleDuplicateCampaign = async (campaign) => {
    try {
      const { id, created_date, updated_date, created_by, ...campaignData } = campaign;
      await base44.entities.Campaign.create({
        ...campaignData,
        name: `${campaign.name} (Copy)`,
        status: 'draft',
        creator_id: user.id
      });
      toast.success('Campaign duplicated');
      loadData();
    } catch (error) {
      console.error('Error duplicating campaign:', error);
      toast.error('Failed to duplicate campaign');
    }
  };

  const getCampaignTemplates = () => {
    const accountType = user?.primary_account_type || user?.primary_role;
    
    const templatesByRole = {
      estate_sale_operator: [
        { name: 'New Sale Announcement', type: 'email', target: 'all', description: 'Notify your network about upcoming estate sales' },
        { name: 'VIP Early Access', type: 'email', target: 'all', description: 'Invite VIP customers to preview sales' },
        { name: 'Sale Reminder', type: 'sms', target: 'all', description: 'SMS reminder for sale dates' },
        { name: 'Thank You Follow-up', type: 'email', target: 'all', description: 'Thank attendees after sales' },
        { name: 'Newsletter', type: 'email', target: 'all', description: 'Monthly newsletter with upcoming sales' }
      ],
      real_estate_agent: [
        { name: 'New Listing Alert', type: 'email', target: 'standard', description: 'Notify buyers of new properties' },
        { name: 'Open House Invitation', type: 'multi_channel', target: 'standard', description: 'Email + SMS for open houses' },
        { name: 'Market Update', type: 'email', target: 'all', description: 'Share market insights with clients' },
        { name: 'Downsizing Guide', type: 'email', target: 'downsizing', description: 'Help seniors downsize' },
        { name: 'Probate Services', type: 'postcard', target: 'probate', description: 'Reach probate leads' },
        { name: 'Divorce Support', type: 'email', target: 'divorce', description: 'Assist clients in transition' }
      ],
      investor: [
        { name: 'New Deal Alert', type: 'email', target: 'investment', description: 'Share investment opportunities' },
        { name: 'Foreclosure Leads', type: 'email', target: 'foreclosure', description: 'Target foreclosure properties' },
        { name: 'Flip Update', type: 'email', target: 'all', description: 'Update on current projects' },
        { name: 'Partnership Offer', type: 'email', target: 'investment', description: 'Invite co-investment' }
      ],
      vendor: [
        { name: 'Service Promotion', type: 'email', target: 'all', description: 'Promote your services' },
        { name: 'Special Offer', type: 'multi_channel', target: 'all', description: 'Limited time discounts' },
        { name: 'Testimonial Share', type: 'social', target: 'all', description: 'Share customer reviews' },
        { name: 'Seasonal Campaign', type: 'email', target: 'all', description: 'Seasonal service packages' }
      ]
    };

    return templatesByRole[accountType] || templatesByRole.estate_sale_operator;
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

  const isAdmin = ['super_admin', 'platform_ops', 'growth_team'].includes(
    user?.primary_account_type || user?.primary_role
  );

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-serif font-bold text-slate-900 mb-2">Campaign Management</h1>
          <p className="text-slate-600">{campaigns.length} total campaigns</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={() => setShowTemplateModal(true)} variant="outline" className="whitespace-nowrap">
            <FileText className="w-4 h-4 mr-2" />
            New Template
          </Button>
          <Button onClick={() => setShowCreateModal(true)} className="bg-orange-600 hover:bg-orange-700 whitespace-nowrap">
            <Plus className="w-4 h-4 mr-2" />
            Create Campaign
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto pb-2">
          <TabsList className="w-max">
            <TabsTrigger value="campaigns" className="whitespace-nowrap">My Campaigns</TabsTrigger>
            <TabsTrigger value="templates" className="whitespace-nowrap">Campaign Templates</TabsTrigger>
            <TabsTrigger value="library" className="whitespace-nowrap">Template Library</TabsTrigger>
            {isAdmin && <TabsTrigger value="all" className="whitespace-nowrap">All Campaigns</TabsTrigger>}
          </TabsList>
        </div>

        <TabsContent value="campaigns" className="space-y-6">
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

                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
                        {campaign.status === 'draft' && (
                          <Button
                            size="sm"
                            onClick={() => handleUpdateStatus(campaign.id, 'active')}
                            className="bg-green-600 hover:bg-green-700 whitespace-nowrap"
                          >
                            <Play className="w-3 h-3 mr-1" />
                            Launch
                          </Button>
                        )}
                        {campaign.status === 'active' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateStatus(campaign.id, 'paused')}
                            className="whitespace-nowrap"
                          >
                            <Pause className="w-3 h-3 mr-1" />
                            Pause
                          </Button>
                        )}
                        {campaign.status === 'paused' && (
                          <Button
                            size="sm"
                            onClick={() => handleUpdateStatus(campaign.id, 'active')}
                            className="bg-green-600 hover:bg-green-700 whitespace-nowrap"
                          >
                            <Play className="w-3 h-3 mr-1" />
                            Resume
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => handleDuplicateCampaign(campaign)} className="whitespace-nowrap">
                          <Copy className="w-3 h-3 mr-1" />
                          Duplicate
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDeleteCampaign(campaign.id)} className="whitespace-nowrap">
                          <Trash2 className="w-3 h-3 mr-1" />
                          Delete
                        </Button>
                      </div>
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
                <p className="text-slate-500 mb-4">No campaigns found</p>
                <Button onClick={() => setShowCreateModal(true)} className="bg-orange-600 hover:bg-orange-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Campaign
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {getCampaignTemplates().map((template, idx) => {
              const Icon = getCampaignIcon(template.type);
              return (
                <Card key={idx} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => {
                  setNewCampaign({
                    ...newCampaign,
                    name: template.name,
                    description: template.description,
                    campaign_type: template.type,
                    life_event_target: template.target
                  });
                  setShowCreateModal(true);
                }}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-cyan-100 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-cyan-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900 mb-1">{template.name}</h3>
                        <p className="text-xs text-slate-600 mb-2">{template.description}</p>
                        <Badge variant="outline" className="text-xs">{template.type}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="library" className="space-y-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => {
              const Icon = getCampaignIcon(template.template_type);
              return (
                <Card key={template.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-900 mb-1">{template.name}</h3>
                          <p className="text-xs text-slate-600">{template.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{template.template_type}</Badge>
                        <Badge className="bg-indigo-100 text-indigo-700 text-xs">{template.category}</Badge>
                      </div>
                      {template.usage_count > 0 && (
                        <div className="text-xs text-slate-500">Used {template.usage_count} times</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {templates.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No templates available yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {isAdmin && (
          <TabsContent value="all" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {campaigns.map(campaign => {
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
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Create Campaign Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Create New Campaign</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto pr-2">
            <div>
              <Label>Campaign Name</Label>
              <Input
                value={newCampaign.name}
                onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                placeholder="Enter campaign name"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={newCampaign.description}
                onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
                placeholder="Describe your campaign goals"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Campaign Type</Label>
                <select
                  value={newCampaign.campaign_type}
                  onChange={(e) => setNewCampaign({ ...newCampaign, campaign_type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                  <option value="postcard">Postcard</option>
                  <option value="social">Social Media</option>
                  <option value="funnel">Funnel</option>
                  <option value="multi_channel">Multi-Channel</option>
                </select>
              </div>
              <div>
                <Label>Target Audience</Label>
                <select
                  value={newCampaign.life_event_target}
                  onChange={(e) => setNewCampaign({ ...newCampaign, life_event_target: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="all">All</option>
                  <option value="probate">Probate</option>
                  <option value="divorce">Divorce</option>
                  <option value="downsizing">Downsizing</option>
                  <option value="relocation">Relocation</option>
                  <option value="foreclosure">Foreclosure</option>
                  <option value="investment">Investment</option>
                  <option value="standard">Standard</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateCampaign} className="bg-orange-600 hover:bg-orange-700">
                Create Campaign
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Template Modal */}
      <Dialog open={showTemplateModal} onOpenChange={setShowTemplateModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Create Marketing Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto pr-2">
            <div>
              <Label>Template Name</Label>
              <Input
                value={newTemplate.name}
                onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                placeholder="Enter template name"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={newTemplate.description}
                onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                placeholder="Brief description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Template Type</Label>
                <select
                  value={newTemplate.template_type}
                  onChange={(e) => setNewTemplate({ ...newTemplate, template_type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                  <option value="postcard">Postcard</option>
                  <option value="letter">Letter</option>
                  <option value="social_post">Social Post</option>
                  <option value="landing_page">Landing Page</option>
                </select>
              </div>
              <div>
                <Label>Category</Label>
                <select
                  value={newTemplate.category}
                  onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="introduction">Introduction</option>
                  <option value="follow_up">Follow-up</option>
                  <option value="nurture">Nurture</option>
                  <option value="conversion">Conversion</option>
                  <option value="testimonial">Testimonial</option>
                  <option value="referral">Referral</option>
                </select>
              </div>
            </div>
            <div>
              <Label>Subject Line / Preview</Label>
              <Input
                value={newTemplate.subject}
                onChange={(e) => setNewTemplate({ ...newTemplate, subject: e.target.value })}
                placeholder="Email subject or SMS preview"
              />
            </div>
            <div>
              <Label>Content</Label>
              <Textarea
                value={newTemplate.content}
                onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                placeholder="Template content (use {{first_name}}, {{company_name}}, etc. for merge fields)"
                rows={8}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowTemplateModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTemplate} className="bg-orange-600 hover:bg-orange-700">
                Create Template
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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