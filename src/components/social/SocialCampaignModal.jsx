import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sparkles, Send, Check, X, Clock, Lock, Unlock, RefreshCw,
  Calendar, ChevronDown, ChevronUp, Loader2, Globe
} from 'lucide-react';
import { format } from 'date-fns';

const POST_TYPE_LABELS = {
  tease: '👀 Tease Post',
  sneak_peek: '📸 Sneak Peek',
  early_line: '⚡ Early Line Warning',
  final_tease: '🔔 Final Tease',
  address_reveal: '📍 Address Reveal',
  sale_day: '🚀 Sale Day Open',
  day_2: '🔄 Day 2 Deals',
  final_hours: '⏰ Final Hours',
  results: '🏆 Results',
  seller_lead: '🏠 Seller Lead Gen'
};

const APPROVAL_COLORS = {
  needs_review: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  published: 'bg-blue-100 text-blue-700',
  draft: 'bg-slate-100 text-slate-700'
};

function PostCard({ post, onApprove, onReject, onEdit, onRegenerate }) {
  const [expanded, setExpanded] = useState(false);
  const [editingCaption, setEditingCaption] = useState(false);
  const [caption, setCaption] = useState(post.caption || '');

  const scheduledDate = post.scheduled_datetime ? new Date(post.scheduled_datetime) : null;

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-slate-800">{POST_TYPE_LABELS[post.post_type] || post.post_type}</span>
          {scheduledDate && (
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {format(scheduledDate, 'MMM d, h:mm a')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {post.address_allowed ? (
            <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
              <Unlock className="w-3 h-3" /> Address OK
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full">
              <Lock className="w-3 h-3" /> Address Locked
            </span>
          )}
          <Badge className={`text-xs ${APPROVAL_COLORS[post.approval_status] || 'bg-slate-100 text-slate-700'}`}>
            {post.approval_status?.replace('_', ' ')}
          </Badge>
          <button onClick={() => setExpanded(!expanded)} className="text-slate-400 hover:text-slate-600">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Headline */}
      <div className="px-4 py-3">
        <p className="text-base font-bold text-slate-900">{post.headline}</p>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Caption */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Caption</span>
              <button
                onClick={() => setEditingCaption(!editingCaption)}
                className="text-xs text-blue-600 hover:underline"
              >
                {editingCaption ? 'Done' : 'Edit'}
              </button>
            </div>
            {editingCaption ? (
              <Textarea
                value={caption}
                onChange={e => setCaption(e.target.value)}
                onBlur={() => onEdit(post.id, { caption })}
                rows={6}
                className="text-sm"
              />
            ) : (
              <p className="text-sm text-slate-700 whitespace-pre-line bg-slate-50 rounded-lg p-3">
                {caption}
              </p>
            )}
          </div>

          {/* Headline Options */}
          {post.headline_options && post.headline_options.length > 0 && (
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">Headline Options</span>
              <div className="space-y-1">
                {post.headline_options.slice(0, 5).map((h, i) => (
                  <button
                    key={i}
                    onClick={() => onEdit(post.id, { headline: h })}
                    className={`w-full text-left text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                      post.headline === h ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Image Prompt */}
          {post.image_prompt && (
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Image Prompt</span>
              <p className="text-xs text-slate-500 italic bg-slate-50 rounded-lg p-3">{post.image_prompt}</p>
            </div>
          )}

          {/* Address Lock Notice */}
          {!post.address_allowed && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-xs text-orange-700 flex items-start gap-2">
              <Lock className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Address is locked for this post. Full address will only appear in posts scheduled within 24 hours of sale start.</span>
            </div>
          )}

          {/* CTA & Channels */}
          <div className="flex flex-wrap gap-2 text-xs text-slate-500">
            {post.cta && <span className="bg-slate-100 px-2 py-1 rounded">CTA: {post.cta}</span>}
            {(post.channels || []).map(ch => (
              <span key={ch} className="bg-blue-50 text-blue-600 px-2 py-1 rounded flex items-center gap-1">
                <Globe className="w-3 h-3" />{ch}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="px-4 py-3 border-t border-slate-100 flex gap-2 flex-wrap">
        {post.approval_status !== 'approved' && post.approval_status !== 'published' && (
          <Button size="sm" onClick={() => onApprove(post.id)} className="bg-green-600 hover:bg-green-700 h-7 text-xs">
            <Check className="w-3 h-3 mr-1" /> Approve
          </Button>
        )}
        {post.approval_status === 'approved' && (
          <Button size="sm" onClick={() => onReject(post.id)} variant="outline" className="h-7 text-xs border-red-300 text-red-600 hover:bg-red-50">
            <X className="w-3 h-3 mr-1" /> Unapprove
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={() => onRegenerate(post.id)} className="h-7 text-xs">
          <RefreshCw className="w-3 h-3 mr-1" /> Regenerate
        </Button>
      </div>
    </div>
  );
}

export default function SocialCampaignModal({ open, onClose, sale, user }) {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [campaign, setCampaign] = useState(null);
  const [posts, setPosts] = useState([]);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (open && sale) loadExistingCampaign();
  }, [open, sale]);

  const loadExistingCampaign = async () => {
    setLoading(true);
    try {
      const campaigns = await base44.entities.SocialCampaign.filter({ sale_id: sale.id }, '-created_date', 1);
      if (campaigns.length > 0) {
        setCampaign(campaigns[0]);
        const postList = await base44.entities.SocialPost.filter({ campaign_id: campaigns[0].id }, 'scheduled_datetime');
        setPosts(postList);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await base44.functions.invoke('generateSocialCampaign', { sale_id: sale.id });
      if (res.data?.success) {
        await loadExistingCampaign();
      } else {
        alert('Generation failed. Please try again.');
      }
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = async (postId) => {
    await base44.entities.SocialPost.update(postId, { approval_status: 'approved' });
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, approval_status: 'approved' } : p));
  };

  const handleReject = async (postId) => {
    await base44.entities.SocialPost.update(postId, { approval_status: 'needs_review' });
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, approval_status: 'needs_review' } : p));
  };

  const handleEdit = async (postId, fields) => {
    await base44.entities.SocialPost.update(postId, fields);
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, ...fields } : p));
  };

  const handleRegenerate = async (postId) => {
    alert('Regenerate individual post: coming soon. You can edit the caption and headlines directly.');
  };

  const handleApproveAll = async () => {
    for (const post of posts) {
      await base44.entities.SocialPost.update(post.id, { approval_status: 'approved' });
    }
    setPosts(prev => prev.map(p => ({ ...p, approval_status: 'approved' })));
  };

  const approvedCount = posts.filter(p => p.approval_status === 'approved').length;
  const publishedCount = posts.filter(p => p.publish_status === 'published').length;

  const firstDate = sale?.sale_dates?.[0];
  const saleStart = firstDate ? new Date(`${firstDate.date}T${firstDate.start_time || '09:00'}:00`) : null;
  const addressReveal = saleStart ? new Date(saleStart.getTime() - 24 * 60 * 60 * 1000) : null;
  const hoursUntilReveal = addressReveal ? (addressReveal - new Date()) / 3600000 : null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Sale Social Launch Engine
          </DialogTitle>
          <p className="text-sm text-slate-500 mt-1">{sale?.title}</p>

          {/* Status bar */}
          {campaign && (
            <div className="flex flex-wrap gap-3 mt-3 text-xs">
              <span className="bg-slate-100 px-3 py-1 rounded-full text-slate-700">
                {posts.length} posts generated
              </span>
              <span className="bg-green-50 text-green-700 px-3 py-1 rounded-full">
                {approvedCount} approved
              </span>
              <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full">
                {publishedCount} published
              </span>
              {addressReveal && (
                <span className={`px-3 py-1 rounded-full flex items-center gap-1 ${hoursUntilReveal > 0 ? 'bg-orange-50 text-orange-700' : 'bg-green-50 text-green-700'}`}>
                  <Lock className="w-3 h-3" />
                  {hoursUntilReveal > 0
                    ? `Address reveals in ${Math.round(hoursUntilReveal)}h`
                    : 'Address revealed'}
                </span>
              )}
            </div>
          )}
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="py-4 space-y-4">
            {loading && (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-3" />
                <p className="text-slate-500">Loading campaign...</p>
              </div>
            )}

            {!loading && !campaign && (
              <div className="text-center py-16">
                <Sparkles className="w-12 h-12 text-purple-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-800 mb-2">No Campaign Yet</h3>
                <p className="text-slate-500 mb-6 max-w-sm mx-auto text-sm">
                  Generate a complete 10-post social media campaign with AI. Posts will follow the address lock rules automatically.
                </p>
                <Button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-8"
                >
                  {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  {generating ? 'Generating Campaign...' : 'Generate Social Campaign'}
                </Button>
                {generating && (
                  <p className="text-xs text-slate-400 mt-3">This takes about 20-30 seconds...</p>
                )}
              </div>
            )}

            {!loading && campaign && posts.length > 0 && (
              <div className="space-y-4">
                {/* Campaign summary */}
                {campaign.campaign_summary && (
                  <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 text-sm text-purple-800">
                    {campaign.campaign_summary}
                  </div>
                )}

                {/* Posts */}
                {posts.map(post => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    onEdit={handleEdit}
                    onRegenerate={handleRegenerate}
                  />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <div className="flex gap-2">
            {campaign && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerate}
                  disabled={generating}
                >
                  {generating ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                  Regenerate All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleApproveAll}
                  className="border-green-500 text-green-700 hover:bg-green-50"
                >
                  <Check className="w-3 h-3 mr-1" /> Approve All
                </Button>
              </>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
            {approvedCount > 0 && (
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => alert(`Publishing is connected to your social channels. ${approvedCount} posts are approved and ready. Connect your Facebook/Instagram in Settings to enable auto-publishing.`)}
              >
                <Send className="w-3 h-3 mr-1" />
                Publish Approved ({approvedCount})
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}