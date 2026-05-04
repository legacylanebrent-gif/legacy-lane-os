import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Send, Play, AlertTriangle, Lock, CheckCircle2 } from 'lucide-react';

const STATUS_COLORS = {
  draft: 'bg-slate-100 text-slate-500 border-slate-300',
  awaiting_approval: 'bg-amber-100 text-amber-700 border-amber-300',
  approved: 'bg-blue-100 text-blue-700 border-blue-300',
  paused_in_meta: 'bg-cyan-100 text-cyan-700 border-cyan-300',
  scheduled: 'bg-indigo-100 text-indigo-700 border-indigo-300',
  launched: 'bg-green-100 text-green-700 border-green-300',
  completed: 'bg-slate-100 text-slate-500',
  rejected: 'bg-red-100 text-red-700 border-red-300',
};

export default function FbAdsMetaSync({ campaigns, settings, onRefreshCampaigns }) {
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [pushing, setPushing] = useState(false);
  const [confirmLaunch, setConfirmLaunch] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [feedback, setFeedback] = useState('');

  const selectedCampaign = campaigns?.find(c => c.id === selectedCampaignId);

  const handleApproveCampaign = async () => {
    if (!selectedCampaignId) return;
    await base44.entities.FacebookAdCampaignDraft.update(selectedCampaignId, { status: 'approved', updated_at: new Date().toISOString() });
    setFeedback('✓ Campaign approved. You can now push it to Meta Ads Manager.');
    onRefreshCampaigns && onRefreshCampaigns();
  };

  const handlePushToMeta = async () => {
    if (!settings?.allow_meta_campaign_creation) {
      setFeedback('Meta campaign creation is disabled. Enable allow_meta_campaign_creation in Settings.');
      return;
    }
    setPushing(true);
    setFeedback('');
    try {
      const res = await base44.functions.invoke('createMetaCampaignDraft', { campaign_draft_id: selectedCampaignId });
      setFeedback(`✓ Campaign pushed to Meta Ads Manager as PAUSED. Campaign ID: ${res.data.meta_campaign_id}. Ads created: ${res.data.ads_created}`);
      onRefreshCampaigns && onRefreshCampaigns();
    } catch (e) {
      setFeedback('Push error: ' + (e?.response?.data?.error || e.message));
    }
    setPushing(false);
  };

  const handleLaunch = async () => {
    if (!settings?.allow_meta_campaign_launch) {
      setFeedback('Campaign launch is disabled. Enable allow_meta_campaign_launch in Settings.');
      setConfirmLaunch(false);
      return;
    }
    setLaunching(true);
    setConfirmLaunch(false);
    try {
      const res = await base44.functions.invoke('launchMetaCampaign', { campaign_draft_id: selectedCampaignId, confirmed: true });
      setFeedback(`✓ Campaign LAUNCHED on Meta! Launched by ${res.data.launched_by} at ${new Date(res.data.launched_at).toLocaleString()}`);
      onRefreshCampaigns && onRefreshCampaigns();
    } catch (e) {
      setFeedback('Launch error: ' + (e?.response?.data?.error || e.message));
    }
    setLaunching(false);
  };

  return (
    <div className="space-y-5">
      {/* Settings status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { label: 'Campaign Creation', ok: settings?.allow_meta_campaign_creation, key: 'allow_meta_campaign_creation' },
          { label: 'Campaign Launch', ok: settings?.allow_meta_campaign_launch, key: 'allow_meta_campaign_launch' },
          { label: 'Approval Required', ok: settings?.require_admin_approval_before_launch, key: 'require_admin_approval_before_launch' },
        ].map((s, i) => (
          <div key={i} className={`flex items-center gap-2 p-3 rounded-lg border text-xs ${s.ok ? 'border-green-200 bg-green-50' : 'border-slate-200 bg-slate-50'}`}>
            {s.ok ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> : <Lock className="w-3.5 h-3.5 text-slate-400" />}
            <div>
              <p className={`font-semibold ${s.ok ? 'text-green-700' : 'text-slate-500'}`}>{s.label}</p>
              <p className="text-slate-400">{s.ok ? 'Enabled' : 'Disabled in Settings'}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Campaign selector */}
      {campaigns?.length > 0 ? (
        <div>
          <label className="text-xs text-slate-500 uppercase tracking-widest block mb-2">Select Campaign</label>
          <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
            <SelectTrigger className="w-full md:w-96 text-sm bg-white border-slate-300">
              <SelectValue placeholder="Choose a campaign draft..." />
            </SelectTrigger>
            <SelectContent>
              {campaigns.map(c => <SelectItem key={c.id} value={c.id}>{c.campaign_name} — <span className="text-slate-400">{c.status}</span></SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div className="text-center py-6 text-slate-400 text-sm">No campaign drafts yet. Use the Campaign Builder to create one.</div>
      )}

      {selectedCampaign && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h3 className="text-base font-bold text-slate-800">{selectedCampaign.campaign_name}</h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge className={`text-xs ${STATUS_COLORS[selectedCampaign.status] || STATUS_COLORS.draft}`}>{selectedCampaign.status}</Badge>
                <span className="text-xs text-slate-400">{selectedCampaign.objective}</span>
                {selectedCampaign.daily_budget && <span className="text-xs text-slate-400">${selectedCampaign.daily_budget}/day</span>}
              </div>
            </div>
          </div>

          {selectedCampaign.meta_campaign_id && (
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-700 space-y-1">
              <p><strong>Meta Campaign ID:</strong> {selectedCampaign.meta_campaign_id}</p>
              <p><strong>Meta Ad Set ID:</strong> {selectedCampaign.meta_ad_set_id}</p>
              {selectedCampaign.meta_ad_ids?.ids?.length > 0 && <p><strong>Ads:</strong> {selectedCampaign.meta_ad_ids.ids.length} created</p>}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {selectedCampaign.status === 'draft' && (
              <Button size="sm" onClick={handleApproveCampaign}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold">
                <CheckCircle2 className="w-3 h-3 mr-1.5" />Approve Campaign
              </Button>
            )}
            {(selectedCampaign.status === 'approved' || selectedCampaign.status === 'awaiting_approval') && !selectedCampaign.meta_campaign_id && (
              <Button size="sm" onClick={handlePushToMeta} disabled={pushing || !settings?.allow_meta_campaign_creation}
                className={`text-xs font-bold ${settings?.allow_meta_campaign_creation ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-slate-200 text-slate-400'}`}>
                {pushing ? <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />Pushing to Meta...</> : <><Send className="w-3 h-3 mr-1.5" />Push to Meta Ads Manager (Paused)</>}
              </Button>
            )}
            {selectedCampaign.meta_campaign_id && selectedCampaign.status !== 'launched' && (
              <Button size="sm" onClick={() => setConfirmLaunch(true)} disabled={!settings?.allow_meta_campaign_launch}
                className={`text-xs font-bold ${settings?.allow_meta_campaign_launch ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-slate-200 text-slate-400'}`}>
                <Play className="w-3 h-3 mr-1.5" />Launch Campaign
                {!settings?.allow_meta_campaign_launch && <Lock className="w-3 h-3 ml-1" />}
              </Button>
            )}
            {selectedCampaign.status === 'launched' && (
              <div className="flex items-center gap-2 text-green-700 text-sm font-semibold">
                <CheckCircle2 className="w-4 h-4" />Campaign is LIVE on Meta
              </div>
            )}
          </div>
        </div>
      )}

      {feedback && (
        <div className={`p-3 rounded-lg border text-sm ${feedback.startsWith('✓') ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {feedback}<button onClick={() => setFeedback('')} className="ml-2 text-xs opacity-50 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Launch Confirmation Modal */}
      {confirmLaunch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-red-300 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Launch Paid Campaign?</h3>
                <p className="text-xs text-slate-500">This will activate real spending on Meta</p>
              </div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-5">
              <p className="text-sm text-red-700">You are about to launch a <strong>paid Meta ad campaign</strong>. This will begin spending your ad budget in real money. Campaign: <strong>{selectedCampaign?.campaign_name}</strong></p>
              <p className="text-xs text-red-600 mt-1">Daily budget: ${selectedCampaign?.daily_budget || 0}/day</p>
            </div>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setConfirmLaunch(false)} className="flex-1 border border-slate-300 text-slate-500 text-sm">Cancel</Button>
              <Button onClick={handleLaunch} disabled={launching}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold text-sm">
                {launching ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Launching...</> : <><Play className="w-4 h-4 mr-1.5" />Yes, Launch Now</>}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}