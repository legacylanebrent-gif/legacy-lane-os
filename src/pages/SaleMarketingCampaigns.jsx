import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft, Plus, Mail, MessageSquare, Share2, TrendingUp,
  Eye, MousePointer, DollarSign, Calendar, Edit, Trash2, Sparkles
} from 'lucide-react';
import AISaleMarketingPackage from '@/components/marketing/AISaleMarketingPackage';

export default function SaleMarketingCampaigns() {
  const navigate = useNavigate();
  const [sale, setSale] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAIPackage, setShowAIPackage] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'email',
    description: '',
    target_audience: '',
    message: '',
    scheduled_date: '',
    budget: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const saleId = params.get('saleId');

      if (!saleId) {
        navigate(createPageUrl('MySales'));
        return;
      }

      const saleData = await base44.entities.EstateSale.filter({ id: saleId });
      if (saleData.length === 0) {
        navigate(createPageUrl('MySales'));
        return;
      }

      setSale(saleData[0]);

      // Load campaigns for this sale
      const campaignsData = await base44.entities.MarketingTask.filter({
        sale_id: saleId,
        task_type: 'estate_sale'
      }, '-created_date');
      setCampaigns(campaignsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingCampaign(null);
    setFormData({
      name: '',
      type: 'email',
      description: '',
      target_audience: '',
      message: '',
      scheduled_date: '',
      budget: 0
    });
    setShowCreateModal(true);
  };

  const handleEdit = (campaign) => {
    setEditingCampaign(campaign);
    setFormData({
      name: campaign.title || '',
      type: campaign.category || 'email',
      description: campaign.description || '',
      target_audience: campaign.notes || '',
      message: campaign.description || '',
      scheduled_date: campaign.due_date || '',
      budget: 0
    });
    setShowCreateModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const campaignData = {
        task_type: 'estate_sale',
        sale_id: sale.id,
        sale_title: sale.title,
        title: formData.name,
        description: formData.description,
        category: formData.type,
        due_date: formData.scheduled_date,
        status: 'pending',
        notes: formData.target_audience
      };

      if (editingCampaign) {
        await base44.entities.MarketingTask.update(editingCampaign.id, campaignData);
      } else {
        await base44.entities.MarketingTask.create(campaignData);
      }

      setShowCreateModal(false);
      loadData();
    } catch (error) {
      console.error('Error saving campaign:', error);
      alert('Failed to save campaign');
    }
  };

  const handleDelete = async (campaignId) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;
    try {
      await base44.entities.MarketingTask.delete(campaignId);
      loadData();
    } catch (error) {
      console.error('Error deleting campaign:', error);
      alert('Failed to delete campaign');
    }
  };

  const handleStatusChange = async (campaignId, newStatus) => {
    try {
      await base44.entities.MarketingTask.update(campaignId, { status: newStatus });
      loadData();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  const getCampaignIcon = (type) => {
    switch (type) {
      case 'email': return Mail;
      case 'sms': return MessageSquare;
      case 'social_media': return Share2;
      case 'advertising': return TrendingUp;
      default: return Mail;
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-700',
      in_progress: 'bg-blue-100 text-blue-700',
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-slate-100 text-slate-700'
    };
    return colors[status] || 'bg-slate-100 text-slate-700';
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="h-96 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(createPageUrl('MySales'))}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Sales
          </Button>
          <div>
            <h1 className="text-4xl font-serif font-bold text-slate-900">Marketing Campaigns</h1>
            <p className="text-slate-600">{sale?.title}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowAIPackage(true)} className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold shadow-sm">
            <Sparkles className="w-4 h-4 mr-2" />
            AI Marketing Package
          </Button>
          <Button onClick={handleOpenCreate} variant="outline" className="border-purple-300 text-purple-700 hover:bg-purple-50">
            <Plus className="w-4 h-4 mr-2" />
            Create Campaign
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-600 mb-1">Total Campaigns</div>
            <div className="text-2xl font-bold text-slate-900">{campaigns.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-600 mb-1">Active</div>
            <div className="text-2xl font-bold text-blue-600">
              {campaigns.filter(c => c.status === 'in_progress').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-600 mb-1">Completed</div>
            <div className="text-2xl font-bold text-green-600">
              {campaigns.filter(c => c.status === 'completed').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-600 mb-1">Pending</div>
            <div className="text-2xl font-bold text-yellow-600">
              {campaigns.filter(c => c.status === 'pending').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns List */}
      {campaigns.length === 0 ? (
        <Card className="p-12 text-center">
          <TrendingUp className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 text-lg mb-4">No marketing campaigns yet</p>
          <p className="text-slate-600 mb-4">
            Create campaigns to promote your estate sale through email, SMS, social media, and more
          </p>
          <Button onClick={handleOpenCreate} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="w-4 h-4 mr-2" />
            Create First Campaign
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {campaigns.map(campaign => {
            const Icon = getCampaignIcon(campaign.category);
            return (
              <Card key={campaign.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Icon className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">{campaign.title}</CardTitle>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge className={getStatusColor(campaign.status)}>
                            {campaign.status}
                          </Badge>
                          <Badge variant="outline" className="capitalize">
                            {campaign.category?.replace('_', ' ')}
                          </Badge>
                          {campaign.due_date && (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(campaign.due_date).toLocaleDateString()}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(campaign)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(campaign.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {campaign.description && (
                    <p className="text-slate-700 mb-4">{campaign.description}</p>
                  )}
                  {campaign.notes && (
                    <div className="mb-4">
                      <div className="text-sm font-semibold text-slate-900 mb-1">Target Audience:</div>
                      <p className="text-sm text-slate-600">{campaign.notes}</p>
                    </div>
                  )}
                  <div className="flex gap-2">
                    {campaign.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => handleStatusChange(campaign.id, 'in_progress')}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Start Campaign
                      </Button>
                    )}
                    {campaign.status === 'in_progress' && (
                      <Button
                        size="sm"
                        onClick={() => handleStatusChange(campaign.id, 'completed')}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Mark Complete
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* AI Marketing Package Modal */}
      <AISaleMarketingPackage
        sale={sale}
        open={showAIPackage}
        onClose={() => setShowAIPackage(false)}
      />

      {/* Create/Edit Campaign Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCampaign ? 'Edit Campaign' : 'Create Marketing Campaign'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Campaign Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Summer Estate Sale Email Blast"
                required
              />
            </div>

            <div>
              <Label>Campaign Type *</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email Campaign</SelectItem>
                  <SelectItem value="sms">SMS Campaign</SelectItem>
                  <SelectItem value="social_media">Social Media</SelectItem>
                  <SelectItem value="advertising">Paid Advertising</SelectItem>
                  <SelectItem value="signage">Physical Signage</SelectItem>
                  <SelectItem value="networking">Networking</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the campaign goals and approach"
                rows={3}
              />
            </div>

            <div>
              <Label>Target Audience</Label>
              <Input
                value={formData.target_audience}
                onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
                placeholder="e.g., Local collectors, Previous buyers, Newsletter subscribers"
              />
            </div>

            <div>
              <Label>Scheduled Date</Label>
              <Input
                type="date"
                value={formData.scheduled_date}
                onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                {editingCampaign ? 'Update Campaign' : 'Create Campaign'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}