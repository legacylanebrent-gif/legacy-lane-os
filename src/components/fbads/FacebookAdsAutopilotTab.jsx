import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Megaphone, Users, Image, BarChart2, Inbox, Lock, AlertTriangle } from 'lucide-react';
import FbAdsCampaignBuilder from './FbAdsCampaignBuilder';
import FbAdsCreativeBuilder from './FbAdsCreativeBuilder';
import FbAdsAudiencePanel from './FbAdsAudiencePanel';
import FbAdsMetaSync from './FbAdsMetaSync';
import FbAdsLeadIntake from './FbAdsLeadIntake';

export default function FacebookAdsAutopilotTab({ user }) {
  const [settings, setSettings] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [activeSubTab, setActiveSubTab] = useState('builder');

  useEffect(() => {
    loadSettings();
    loadCampaigns();
  }, []);

  const loadSettings = async () => {
    try {
      const s = await base44.entities.AdminAISettings.list('-created_date', 1);
      setSettings(s[0] || {});
    } catch (_) { setSettings({}); }
  };

  const loadCampaigns = async () => {
    try {
      const data = await base44.entities.FacebookAdCampaignDraft.list('-created_at', 50);
      setCampaigns(data);
    } catch (_) { setCampaigns([]); }
  };

  if (settings && settings.allow_facebook_ads_builder === false) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <Lock className="w-10 h-10 text-slate-300" />
        <p className="text-slate-500 text-sm">Facebook Ads Builder is disabled. Enable <code>allow_facebook_ads_builder</code> in Admin Settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center">
            <Megaphone className="w-4.5 h-4.5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800">Facebook Ads Autopilot</h2>
            <p className="text-xs text-slate-500">Build, review, and launch Meta ad campaigns targeting Future Operators</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Badge className="bg-blue-100 text-blue-700 text-xs">{campaigns.length} campaigns</Badge>
          <Badge className="bg-amber-100 text-amber-700 text-xs">{campaigns.filter(c => c.status === 'launched').length} live</Badge>
        </div>
      </div>

      {/* Safety notice */}
      <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700">
          <strong>Safety First:</strong> All campaigns are drafted and paused before any Meta API calls. Audience sync, campaign creation, and launch are each controlled by separate settings toggles. Paid ad launch always requires final admin confirmation.
        </p>
      </div>

      {/* Sub tabs */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList className="bg-white border border-slate-200 h-auto flex-wrap gap-1 p-1 shadow-sm">
          <TabsTrigger value="builder" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-500 text-xs">
            <Megaphone className="w-3.5 h-3.5 mr-1.5" />Campaign Builder
          </TabsTrigger>
          <TabsTrigger value="creatives" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-500 text-xs">
            <Image className="w-3.5 h-3.5 mr-1.5" />Creative Builder
          </TabsTrigger>
          <TabsTrigger value="audience" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-500 text-xs">
            <Users className="w-3.5 h-3.5 mr-1.5" />Future Operator Audience
          </TabsTrigger>
          <TabsTrigger value="meta" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-500 text-xs">
            <BarChart2 className="w-3.5 h-3.5 mr-1.5" />Meta Ads Manager Sync
          </TabsTrigger>
          <TabsTrigger value="leads" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-500 text-xs">
            <Inbox className="w-3.5 h-3.5 mr-1.5" />Lead Intake & AI Response
          </TabsTrigger>
        </TabsList>

        <TabsContent value="builder">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
            <p className="text-xs text-slate-500 uppercase tracking-widest mb-5 font-semibold">AI Campaign Builder</p>
            <FbAdsCampaignBuilder settings={settings} onCampaignCreated={() => { loadCampaigns(); setActiveSubTab('creatives'); }} />
          </div>
        </TabsContent>

        <TabsContent value="creatives">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
            <p className="text-xs text-slate-500 uppercase tracking-widest mb-5 font-semibold">Ad Creative Builder</p>
            <FbAdsCreativeBuilder campaigns={campaigns} />
          </div>
        </TabsContent>

        <TabsContent value="audience">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
            <p className="text-xs text-slate-500 uppercase tracking-widest mb-5 font-semibold">Future Operator Custom Audience</p>
            <FbAdsAudiencePanel settings={settings} />
          </div>
        </TabsContent>

        <TabsContent value="meta">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
            <p className="text-xs text-slate-500 uppercase tracking-widest mb-5 font-semibold">Meta Ads Manager — Approve, Push & Launch</p>
            <FbAdsMetaSync campaigns={campaigns} settings={settings} onRefreshCampaigns={loadCampaigns} />
          </div>
        </TabsContent>

        <TabsContent value="leads">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
            <p className="text-xs text-slate-500 uppercase tracking-widest mb-5 font-semibold">Facebook Lead Intake & AI Response</p>
            <FbAdsLeadIntake settings={settings} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}