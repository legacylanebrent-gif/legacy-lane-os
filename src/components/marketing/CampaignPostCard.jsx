import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Edit, Trash2, Share2, Mail, MessageSquare, TrendingUp, CheckCircle2, PlayCircle, ImageIcon, Eye, Send, Megaphone, Loader2, ExternalLink, Rocket, ClipboardList } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import PlatformPreviewModal from './PlatformPreviewModal';
import PushToSocialModal from './PushToSocialModal';
import LaunchFbAdModal from './LaunchFbAdModal';
import CampaignLaunchModal from './CampaignLaunchModal';
import CampaignStatsPanel from './CampaignStatsPanel';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
  completed: 'bg-green-100 text-green-700 border-green-200',
  cancelled: 'bg-slate-100 text-slate-500 border-slate-200',
};

const PLATFORM_COLORS = {
  Facebook: 'bg-blue-600',
  Instagram: 'bg-gradient-to-br from-purple-500 to-pink-500',
  LinkedIn: 'bg-blue-700',
  Twitter: 'bg-sky-500',
  default: 'bg-slate-700',
};

function SocialPostMockup({ campaign }) {
  const isAI = campaign.title?.startsWith('[AI-');
  const imageUrl = campaign.image_urls_by_platform?.facebook_feed || campaign.image_url;
  const platform = campaign.category === 'social_media' ? 'Facebook' : null;

  // Extract headline and caption from description if AI-generated
  let headline = campaign.title?.replace(/\[AI-[^\]]+\]\s*/, '') || campaign.title;
  let caption = campaign.description || '';

  if (isAI && campaign.description) {
    const headlineMatch = campaign.description.match(/headline[:\s*]+([^\n]+)/i);
    const captionMatch = campaign.description.match(/caption[:\s*]+([^\n]+(?:\n(?![A-Z][a-z]+:)[^\n]*)*)/i);
    if (headlineMatch) headline = headlineMatch[1].trim().replace(/^\*+|\*+$/g, '');
    if (captionMatch) {
      caption = captionMatch[1].trim()
        .replace(/\(Facebook\/Instagram\s*ready\)[:\s]*/gi, '')  // remove "(Facebook/Instagram ready):"
        .replace(/\*\*/g, '')                                      // remove bold markers
        .replace(/^>\s*/gm, '')                                    // remove blockquote markers
        .replace(/^\s*[-–—]\s*/gm, '')                            // remove leading dashes
        .trim()
        .slice(0, 280);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Platform bar */}
      <div className={`px-3 py-2 flex items-center gap-2 ${platform ? 'bg-blue-600' : 'bg-slate-700'}`}>
        <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
          <Share2 className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="text-xs text-white font-medium">{platform || campaign.category?.replace('_', ' ') || 'Post'}</span>
      </div>

      {/* Post author row */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xs font-bold">
          {(campaign.sale_title || 'S')[0]}
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-800 leading-tight">{campaign.sale_title || 'Estate Sale'}</p>
          <p className="text-[10px] text-slate-400">Sponsored · 🌐</p>
        </div>
      </div>

      {/* Caption preview */}
      <div className="px-3 py-2">
        <p className="text-xs text-slate-700 leading-relaxed line-clamp-3">{caption || headline}</p>
      </div>

      {/* Image */}
      <div className="relative">
        {imageUrl ? (
          <img src={imageUrl} alt="Post visual" className="w-full aspect-video object-cover" />
        ) : (
          <div className="w-full aspect-video bg-gradient-to-br from-slate-100 to-slate-200 flex flex-col items-center justify-center gap-2">
            <ImageIcon className="w-8 h-8 text-slate-300" />
            <p className="text-xs text-slate-400">No image yet</p>
          </div>
        )}
        {/* Headline overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
          <p className="text-white text-xs font-bold leading-tight line-clamp-2">{headline}</p>
        </div>
      </div>

      {/* CTA bar */}
      <div className="bg-slate-50 border-t border-slate-100 px-3 py-2 flex items-center justify-between">
        <span className="text-[10px] text-slate-500">Learn More ›</span>
        <div className="flex gap-3 text-[10px] text-slate-400">
          <span>👍 Like</span>
          <span>💬 Comment</span>
          <span>↗ Share</span>
        </div>
      </div>
    </div>
  );
}

function getCampaignIcon(type) {
  switch (type) {
    case 'email': return Mail;
    case 'sms': return MessageSquare;
    case 'social_media': return Share2;
    case 'advertising': return TrendingUp;
    default: return Share2;
  }
}

const PLATFORM_PREVIEW_BUTTONS = [
  { name: 'Facebook', color: 'bg-[#1877F2] text-white hover:bg-[#1565d8]' },
  { name: 'Instagram', color: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90' },
  { name: 'TikTok', color: 'bg-black text-white hover:bg-slate-800' },
  { name: 'LinkedIn', color: 'bg-[#0A66C2] text-white hover:bg-[#0958a8]' },
  { name: 'Twitter/X', color: 'bg-slate-800 text-white hover:bg-slate-700' },
];

export default function CampaignPostCard({ campaign, onEdit, onDelete, onStatusChange, onRefresh }) {
  const [expanded, setExpanded] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showPush, setShowPush] = useState(false);
  const [showFbAd, setShowFbAd] = useState(false);
  const [showLaunch, setShowLaunch] = useState(false);
  const Icon = getCampaignIcon(campaign.category);
  const isAI = campaign.title?.startsWith('[AI-');
  const checklist = campaign.launch_checklist || {};
  const checklistDone = [checklist.caption_copied, checklist.image_downloaded, checklist.posted_to_platform, checklist.boost_enabled, checklist.team_notified].filter(Boolean).length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* Card header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`p-1.5 rounded-lg ${isAI ? 'bg-purple-100' : 'bg-slate-100'}`}>
            <Icon className={`w-4 h-4 ${isAI ? 'text-purple-600' : 'text-slate-600'}`} />
          </div>
          <p className="text-sm font-semibold text-slate-800 truncate">{campaign.title}</p>
          {isAI && <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-[10px] flex-shrink-0">AI</Badge>}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Badge className={`text-[10px] border ${STATUS_COLORS[campaign.status] || STATUS_COLORS.pending}`}>
            {campaign.status?.replace('_', ' ')}
          </Badge>
          {campaign.due_date && (
            <Badge variant="outline" className="text-[10px] flex items-center gap-1">
              <Calendar className="w-2.5 h-2.5" />
              {new Date(campaign.due_date).toLocaleDateString()}
            </Badge>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(campaign)}>
            <Edit className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => onDelete(campaign.id)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* 50/50 split body */}
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
        {/* LEFT: Social post mockup */}
        <div className="p-4 flex flex-col gap-3">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Post Preview</p>
          <SocialPostMockup campaign={campaign} />

          {/* Platform preview buttons */}
          <div>
            <p className="text-[10px] text-slate-400 mb-1.5">Preview as:</p>
            <div className="flex flex-wrap gap-1.5">
              {PLATFORM_PREVIEW_BUTTONS.map(p => (
                <button
                  key={p.name}
                  onClick={() => setShowPreview(true)}
                  className={`text-[10px] px-2.5 py-1 rounded-full font-medium transition-all ${p.color}`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Push to social buttons */}
          <div>
            <p className="text-[10px] text-slate-400 mb-1.5">Push post to:</p>
            <div className="flex flex-wrap gap-1.5">
              {PLATFORM_PREVIEW_BUTTONS.map(p => (
                <button
                  key={p.name}
                  onClick={() => setShowPush(true)}
                  className={`text-[10px] px-2.5 py-1 rounded-full font-medium transition-all flex items-center gap-1 ${p.color}`}
                >
                  <Send className="w-2.5 h-2.5" />{p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Launch Facebook Ad */}
          <div>
            <p className="text-[10px] text-slate-400 mb-1.5">Paid advertising:</p>
            <button
              onClick={() => setShowFbAd(true)}
              className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-[#1877F2] hover:bg-[#1565d8] text-white font-semibold transition-all w-full justify-center shadow-sm"
            >
              <Megaphone className="w-3.5 h-3.5" />
              Launch Paid Facebook Ad Campaign
            </button>
          </div>
        </div>

        {/* RIGHT: Strategy & details */}
        <div className="p-4 flex flex-col gap-3">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Strategy & Details</p>

          {campaign.description && (
            <div className="flex-1">
              <div className={`text-xs text-slate-600 leading-relaxed ${expanded ? '' : 'line-clamp-6'}`}>
                {isAI ? (
                  <div className="prose prose-xs max-w-none prose-headings:text-slate-700 prose-headings:text-xs prose-p:text-slate-600 prose-li:text-slate-600">
                    <ReactMarkdown>{campaign.description.slice(0, expanded ? 9999 : 800)}</ReactMarkdown>
                  </div>
                ) : (
                  <p>{campaign.description}</p>
                )}
              </div>
              {campaign.description.length > 400 && (
                <button onClick={() => setExpanded(e => !e)} className="text-[10px] text-purple-600 hover:text-purple-700 mt-1">
                  {expanded ? '← Show less' : 'Read full strategy →'}
                </button>
              )}
            </div>
          )}

          {campaign.notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-widest mb-1">Boost Strategy</p>
              <p className="text-xs text-amber-800 leading-relaxed line-clamp-4">{campaign.notes.replace(/AI-generated by [^\|]+\|?\s*/i, '').trim()}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 mt-auto pt-2 flex-wrap">
            {campaign.status === 'pending' && (
              <Button size="sm" onClick={() => setShowLaunch(true)} className="bg-blue-600 hover:bg-blue-700 text-xs h-8">
                <Rocket className="w-3.5 h-3.5 mr-1.5" />Launch Campaign
              </Button>
            )}
            {campaign.status === 'in_progress' && (
              <>
                <Button size="sm" onClick={() => setShowLaunch(true)} variant="outline" className="text-xs h-8 border-blue-200 text-blue-700 hover:bg-blue-50">
                  <ClipboardList className="w-3.5 h-3.5 mr-1.5" />
                  Checklist {checklistDone > 0 && <Badge className="ml-1 bg-blue-100 text-blue-700 border-0 text-[9px] px-1 py-0">{checklistDone}/5</Badge>}
                </Button>
                <Button size="sm" onClick={() => onStatusChange(campaign.id, 'completed')} className="bg-green-600 hover:bg-green-700 text-xs h-8">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />Mark Complete
                </Button>
              </>
            )}
            {campaign.status === 'completed' && (
              <Button size="sm" onClick={() => setShowLaunch(true)} variant="outline" className="text-xs h-8 border-slate-200 text-slate-500">
                <ClipboardList className="w-3.5 h-3.5 mr-1.5" />View Launch Log
              </Button>
            )}
          </div>
        </div>
      </div>

      <CampaignStatsPanel campaign={campaign} />

      <PlatformPreviewModal campaign={campaign} open={showPreview} onClose={() => setShowPreview(false)} />
      <PushToSocialModal campaign={campaign} open={showPush} onClose={() => setShowPush(false)} />
      <LaunchFbAdModal campaign={campaign} open={showFbAd} onClose={() => setShowFbAd(false)} />
      <CampaignLaunchModal
        campaign={campaign}
        open={showLaunch}
        onClose={() => setShowLaunch(false)}
        onLaunched={onRefresh}
      />
    </div>
  );
}