import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
  ArrowLeft, Plus, TrendingUp, Calendar, Edit, Trash2, Sparkles, Mail
} from 'lucide-react';
import AISaleMarketingPackage from '@/components/marketing/AISaleMarketingPackage';
import CampaignPostCard from '@/components/marketing/CampaignPostCard';
import EmailCampaignModal from '@/components/marketing/EmailCampaignModal';

export default function SaleMarketingCampaigns() {
  const navigate = useNavigate();
  const [sale, setSale] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAIPackage, setShowAIPackage] = useState(false);
  const [showEmailCampaign, setShowEmailCampaign] = useState(false);
  const [aiModel, setAiModel] = useState('claude_sonnet_4_6');


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
      }, 'created_date');
      setCampaigns(campaignsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (campaign) => {
    // Edit handled inline on CampaignPostCard
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
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => { setAiModel('claude_sonnet_4_6'); setShowAIPackage(true); }} className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold shadow-sm">
            <Sparkles className="w-4 h-4 mr-2" />
            Long Version Posts
          </Button>
          <Button onClick={() => { setAiModel('creative_free'); setShowAIPackage(true); }} className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold shadow-sm">
            <Sparkles className="w-4 h-4 mr-2" />
            AI Creative Posts
          </Button>
          <Button onClick={() => setShowEmailCampaign(true)} className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold shadow-sm">
            <Mail className="w-4 h-4 mr-2" />
            Email Campaign
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
          <Button onClick={() => setShowEmailCampaign(true)} className="bg-blue-600 hover:bg-blue-700">
            <Mail className="w-4 h-4 mr-2" />
            Build Email Campaign
          </Button>
        </Card>
      ) : (
        <div className="grid gap-5">
          {campaigns.map(campaign => (
            <CampaignPostCard
              key={campaign.id}
              campaign={campaign}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
              onRefresh={loadData}
            />
          ))}
        </div>
      )}

      {/* Email Campaign Modal */}
      <EmailCampaignModal
        sale={sale}
        open={showEmailCampaign}
        onClose={() => setShowEmailCampaign(false)}
        onSaved={loadData}
      />

      {/* AI Marketing Package Modal */}
      <AISaleMarketingPackage
        sale={sale}
        open={showAIPackage}
        onClose={() => setShowAIPackage(false)}
        modelOverride={aiModel}
        onSaved={loadData}
      />


    </div>
  );
}