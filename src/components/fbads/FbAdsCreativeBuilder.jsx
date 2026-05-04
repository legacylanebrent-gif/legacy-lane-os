import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Image, CheckCircle2, XCircle, Loader2, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';

const APPROVAL_COLORS = {
  draft: 'bg-slate-100 text-slate-500 border-slate-300',
  approved: 'bg-green-100 text-green-700 border-green-300',
  rejected: 'bg-red-100 text-red-700 border-red-300',
  needs_revision: 'bg-amber-100 text-amber-700 border-amber-300',
};

function CreativeCard({ creative, onGenerateImage, onApprove, onReject, generatingImage }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-slate-200 rounded-xl bg-white overflow-hidden hover:border-slate-300 transition-all">
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={() => setOpen(e => !e)}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={`text-xs ${APPROVAL_COLORS[creative.approval_status] || APPROVAL_COLORS.draft}`}>{creative.approval_status}</Badge>
            {creative.image_url && <div className="w-2 h-2 rounded-full bg-green-500" title="Image ready" />}
            <span className="text-sm font-semibold text-slate-700 truncate">{creative.headline}</span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5 truncate">{creative.call_to_action} · {creative.primary_text?.slice(0, 60)}...</p>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
      </div>

      {open && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3 bg-slate-50 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-400 uppercase mb-1">Headline</p>
              <p className="text-sm font-semibold text-slate-700">{creative.headline}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase mb-1">Call to Action</p>
              <p className="text-sm text-slate-700">{creative.call_to_action}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-xs text-slate-400 uppercase mb-1">Primary Text</p>
              <p className="text-sm text-slate-600 leading-relaxed">{creative.primary_text}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-xs text-slate-400 uppercase mb-1">Description</p>
              <p className="text-sm text-slate-500">{creative.description}</p>
            </div>
            {creative.image_url ? (
              <div className="md:col-span-2">
                <p className="text-xs text-slate-400 uppercase mb-2">Ad Image</p>
                <img src={creative.image_url} alt="Ad creative" className="rounded-lg max-h-52 object-cover border border-slate-200" />
              </div>
            ) : creative.image_prompt ? (
              <div className="md:col-span-2">
                <p className="text-xs text-slate-400 uppercase mb-1">Image Prompt</p>
                <p className="text-xs text-slate-500 italic bg-white border border-slate-200 rounded p-2">{creative.image_prompt}</p>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {!creative.image_url && creative.image_prompt && (
              <Button size="sm" variant="ghost" onClick={() => onGenerateImage(creative.id, creative.image_prompt)}
                disabled={generatingImage === creative.id}
                className="text-amber-600 hover:bg-amber-50 text-xs">
                {generatingImage === creative.id ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Generating...</> : <><Image className="w-3 h-3 mr-1" />Generate Image</>}
              </Button>
            )}
            {creative.approval_status !== 'approved' && (
              <Button size="sm" onClick={() => onApprove(creative.id)}
                className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold">
                <CheckCircle2 className="w-3 h-3 mr-1" />Approve
              </Button>
            )}
            {creative.approval_status !== 'rejected' && (
              <Button size="sm" variant="ghost" onClick={() => onReject(creative.id)}
                className="text-red-600 hover:bg-red-50 text-xs">
                <XCircle className="w-3 h-3 mr-1" />Reject
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function FbAdsCreativeBuilder({ campaigns }) {
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [creatives, setCreatives] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(null);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    if (campaigns?.length > 0 && !selectedCampaignId) setSelectedCampaignId(campaigns[0].id);
  }, [campaigns]);

  useEffect(() => {
    if (selectedCampaignId) loadCreatives();
  }, [selectedCampaignId]);

  const loadCreatives = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.FacebookAdCreativeDraft.filter({ campaign_draft_id: selectedCampaignId });
      setCreatives(data);
    } catch (_) { setCreatives([]); }
    setLoading(false);
  };

  const handleGenerateImage = async (creativeId, imagePrompt) => {
    setGeneratingImage(creativeId);
    try {
      await base44.functions.invoke('generateFacebookAdImage', { creative_draft_id: creativeId, image_prompt: imagePrompt });
      setFeedback('✓ Image generated successfully.');
      await loadCreatives();
    } catch (e) {
      setFeedback('Error: ' + (e?.response?.data?.error || e.message));
    }
    setGeneratingImage(null);
  };

  const handleApprove = async (creativeId) => {
    await base44.entities.FacebookAdCreativeDraft.update(creativeId, { approval_status: 'approved', updated_at: new Date().toISOString() });
    setCreatives(prev => prev.map(c => c.id === creativeId ? { ...c, approval_status: 'approved' } : c));
    setFeedback('✓ Creative approved.');
  };

  const handleReject = async (creativeId) => {
    await base44.entities.FacebookAdCreativeDraft.update(creativeId, { approval_status: 'rejected', updated_at: new Date().toISOString() });
    setCreatives(prev => prev.map(c => c.id === creativeId ? { ...c, approval_status: 'rejected' } : c));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        {campaigns?.length > 0 && (
          <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
            <SelectTrigger className="w-72 text-sm bg-white border-slate-300">
              <SelectValue placeholder="Select campaign..." />
            </SelectTrigger>
            <SelectContent>
              {campaigns.map(c => <SelectItem key={c.id} value={c.id}>{c.campaign_name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Button size="sm" variant="ghost" onClick={loadCreatives} className="text-slate-500 text-xs">
          <RefreshCw className="w-3.5 h-3.5 mr-1" />Refresh
        </Button>
        {creatives.length > 0 && (
          <div className="flex gap-2">
            <Badge className="bg-green-100 text-green-700 text-xs">{creatives.filter(c => c.approval_status === 'approved').length} approved</Badge>
            <Badge className="bg-slate-100 text-slate-500 text-xs">{creatives.length} total</Badge>
          </div>
        )}
      </div>

      {feedback && (
        <div className={`p-3 rounded-lg border text-sm ${feedback.startsWith('✓') ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {feedback}
          <button onClick={() => setFeedback('')} className="ml-2 text-xs opacity-50 hover:opacity-100">✕</button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-10 text-slate-400 text-sm">Loading creatives...</div>
      ) : !selectedCampaignId || campaigns?.length === 0 ? (
        <div className="text-center py-10 text-slate-400 text-sm">Generate a campaign first to see its ad creatives here.</div>
      ) : creatives.length === 0 ? (
        <div className="text-center py-10 text-slate-400 text-sm">No creatives found for this campaign.</div>
      ) : (
        <div className="space-y-3">
          {creatives.map(c => (
            <CreativeCard key={c.id} creative={c} onGenerateImage={handleGenerateImage} onApprove={handleApprove} onReject={handleReject} generatingImage={generatingImage} />
          ))}
        </div>
      )}
    </div>
  );
}