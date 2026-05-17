import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  CheckCircle2, XCircle, Send, Play, Loader2, AlertTriangle,
  Image, Lock, Eye, ThumbsUp, ThumbsDown
} from 'lucide-react';

const STATUS_COLORS = {
  draft: 'bg-slate-100 text-slate-500',
  awaiting_approval: 'bg-amber-100 text-amber-700',
  approved: 'bg-blue-100 text-blue-700',
  paused_in_meta: 'bg-cyan-100 text-cyan-700',
  scheduled: 'bg-indigo-100 text-indigo-700',
  launched: 'bg-green-100 text-green-700',
  completed: 'bg-slate-100 text-slate-600',
  rejected: 'bg-red-100 text-red-700',
};

export default function CampaignReviewModal({
  campaign, creatives, settings, onClose, onApprove, onReject,
  onApproveCreative, onRejectCreative, onRefresh
}) {
  const [pushing, setPushing] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [confirmLaunch, setConfirmLaunch] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [notes, setNotes] = useState('');

  const handlePushToMeta = async () => {
    if (!settings?.allow_meta_campaign_creation) {
      setFeedback('Meta campaign creation is disabled in Admin Settings.');
      return;
    }
    setPushing(true);
    setFeedback('');
    try {
      const res = await base44.functions.invoke('createMetaCampaignDraft', { campaign_draft_id: campaign.id });
      setFeedback(`✓ Pushed to Meta as PAUSED. Campaign ID: ${res.data.meta_campaign_id}`);
      onRefresh && onRefresh();
    } catch (e) {
      setFeedback('Push error: ' + (e?.response?.data?.error || e.message));
    }
    setPushing(false);
  };

  const handleLaunch = async () => {
    if (!settings?.allow_meta_campaign_launch) {
      setFeedback('Campaign launch is disabled in Admin Settings.');
      return;
    }
    setLaunching(true);
    setConfirmLaunch(false);
    try {
      const res = await base44.functions.invoke('launchMetaCampaign', { campaign_draft_id: campaign.id, confirmed: true });
      setFeedback(`✓ Campaign LAUNCHED on Meta at ${new Date(res.data.launched_at).toLocaleString()}`);
      onRefresh && onRefresh();
    } catch (e) {
      setFeedback('Launch error: ' + (e?.response?.data?.error || e.message));
    }
    setLaunching(false);
  };

  const unapprovedCreatives = creatives.filter(c => c.approval_status !== 'approved');
  const allCreativesApproved = creatives.length > 0 && unapprovedCreatives.length === 0;

  return (
    <Dialog open={true} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-blue-600" />
            Campaign Review: {campaign.campaign_name}
          </DialogTitle>
          <DialogDescription>
            Review AI-generated campaign settings and creatives before approving for launch.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Status + Meta IDs */}
          <div className="flex items-center gap-3 flex-wrap">
            <Badge className={`text-xs ${STATUS_COLORS[campaign.status] || 'bg-slate-100 text-slate-500'}`}>{campaign.status}</Badge>
            {campaign.meta_campaign_id && (
              <span className="text-xs text-blue-600 font-mono bg-blue-50 px-2 py-0.5 rounded">Meta: {campaign.meta_campaign_id}</span>
            )}
          </div>

          {/* Campaign Settings Panel */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Campaign Settings</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {[
                { label: 'Objective', value: campaign.objective },
                { label: 'Target Audience', value: campaign.target_audience },
                { label: 'Daily Budget', value: campaign.daily_budget ? `$${campaign.daily_budget}/day` : '—' },
                { label: 'Budget Type', value: campaign.budget_type },
                { label: 'Start Date', value: campaign.start_date || '—' },
                { label: 'End Date', value: campaign.end_date || '—' },
                { label: 'Landing Page', value: campaign.landing_page_url || '—' },
              ].map(f => (
                <div key={f.label} className="bg-white rounded-lg border border-slate-200 p-3">
                  <div className="text-xs text-slate-400 mb-0.5">{f.label}</div>
                  <div className="font-medium text-slate-700 text-xs break-all">{f.value || '—'}</div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Strategy */}
          {campaign.ai_strategy && (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
              <p className="text-xs font-semibold text-indigo-600 uppercase tracking-widest mb-2">AI Strategy</p>
              <p className="text-sm text-indigo-800 leading-relaxed">{campaign.ai_strategy}</p>
            </div>
          )}

          {/* Creatives Review */}
          {creatives.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Image className="w-4 h-4 text-slate-500" />
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Ad Creatives ({creatives.length})</p>
                {allCreativesApproved && (
                  <Badge className="text-xs bg-green-100 text-green-700 border-green-200">All Approved</Badge>
                )}
              </div>
              {creatives.map(creative => (
                <div key={creative.id} className={`rounded-xl border p-4 space-y-3 ${
                  creative.approval_status === 'approved' ? 'border-green-200 bg-green-50/50' :
                  creative.approval_status === 'rejected' ? 'border-red-200 bg-red-50/50' :
                  'border-slate-200 bg-white'
                }`}>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800 text-sm">{creative.headline}</span>
                        <Badge className={`text-xs ${
                          creative.approval_status === 'approved' ? 'bg-green-100 text-green-700' :
                          creative.approval_status === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-slate-100 text-slate-500'
                        }`}>{creative.approval_status || 'draft'}</Badge>
                      </div>
                      <p className="text-xs text-slate-600">{creative.primary_text}</p>
                      {creative.description && <p className="text-xs text-slate-400 italic">{creative.description}</p>}
                      {creative.call_to_action && <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">{creative.call_to_action}</span>}
                    </div>
                    {creative.image_url && (
                      <img src={creative.image_url} alt="Ad creative" className="w-20 h-20 rounded-lg object-cover border border-slate-200 shrink-0" />
                    )}
                  </div>
                  {creative.approval_status !== 'approved' && creative.approval_status !== 'rejected' && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="h-7 text-xs border-green-300 text-green-700" onClick={() => onApproveCreative(creative.id)}>
                        <ThumbsUp className="w-3 h-3 mr-1" />Approve
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs border-red-300 text-red-600" onClick={() => onRejectCreative(creative.id)}>
                        <ThumbsDown className="w-3 h-3 mr-1" />Reject
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Admin Notes */}
          <div>
            <p className="text-xs text-slate-500 mb-1">Admin Notes (optional)</p>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Internal notes on this campaign..." rows={2} className="text-sm" />
          </div>

          {/* Feedback */}
          {feedback && (
            <div className={`p-3 rounded-lg border text-sm ${feedback.startsWith('✓') ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
              {feedback}
            </div>
          )}

          {/* Action buttons */}
          <div className="border-t pt-4 flex flex-wrap gap-2 justify-between">
            <div className="flex gap-2 flex-wrap">
              {campaign.status === 'draft' || campaign.status === 'awaiting_approval' ? (
                <>
                  <Button size="sm" onClick={() => onApprove(campaign.id)} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold">
                    <CheckCircle2 className="w-3 h-3 mr-1.5" />Approve Campaign
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onReject(campaign.id)} className="border-red-300 text-red-600 text-xs">
                    <XCircle className="w-3 h-3 mr-1.5" />Reject
                  </Button>
                </>
              ) : campaign.status === 'approved' && !campaign.meta_campaign_id ? (
                <Button size="sm" onClick={handlePushToMeta} disabled={pushing || !settings?.allow_meta_campaign_creation}
                  className={`text-xs font-bold ${settings?.allow_meta_campaign_creation ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-slate-200 text-slate-400'}`}>
                  {pushing ? <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />Pushing...</> : <><Send className="w-3 h-3 mr-1.5" />Push to Meta (Paused)</>}
                  {!settings?.allow_meta_campaign_creation && <Lock className="w-3 h-3 ml-1" />}
                </Button>
              ) : campaign.meta_campaign_id && campaign.status !== 'launched' ? (
                <Button size="sm" onClick={() => setConfirmLaunch(true)} disabled={!settings?.allow_meta_campaign_launch}
                  className={`text-xs font-bold ${settings?.allow_meta_campaign_launch ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-slate-200 text-slate-400'}`}>
                  <Play className="w-3 h-3 mr-1.5" />Launch Campaign
                  {!settings?.allow_meta_campaign_launch && <Lock className="w-3 h-3 ml-1" />}
                </Button>
              ) : campaign.status === 'launched' ? (
                <div className="flex items-center gap-2 text-green-700 text-sm font-semibold">
                  <CheckCircle2 className="w-4 h-4" />Campaign is LIVE
                </div>
              ) : null}
            </div>
            <Button variant="outline" size="sm" onClick={onClose} className="text-xs">Close</Button>
          </div>
        </div>
      </DialogContent>

      {/* Launch Confirm overlay */}
      {confirmLaunch && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
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
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-5 text-sm text-red-700">
              <p>Campaign: <strong>{campaign.campaign_name}</strong></p>
              <p className="text-xs mt-1">Daily budget: ${campaign.daily_budget || 0}/day</p>
            </div>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setConfirmLaunch(false)} className="flex-1 border border-slate-300 text-slate-500 text-sm">Cancel</Button>
              <Button onClick={handleLaunch} disabled={launching} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold text-sm">
                {launching ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Launching...</> : <><Play className="w-4 h-4 mr-1.5" />Yes, Launch Now</>}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
}