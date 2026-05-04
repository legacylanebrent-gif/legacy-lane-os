import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, CheckCircle2, Image, Calendar, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

const PLATFORM_COLORS = {
  Facebook:  'bg-blue-600/20 text-blue-400 border-blue-600/30',
  Instagram: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  LinkedIn:  'bg-cyan-600/20 text-cyan-400 border-cyan-600/30',
  Twitter:   'bg-sky-500/20 text-sky-400 border-sky-500/30',
  TikTok:    'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

const APPROVAL_COLORS = {
  draft:           'bg-slate-500/20 text-slate-400 border-slate-500/30',
  needs_review:    'bg-amber-500/20 text-amber-400 border-amber-500/30',
  approved:        'bg-green-500/20 text-green-400 border-green-500/30',
  rejected:        'bg-red-500/20 text-red-400 border-red-500/30',
  revision_needed: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

const SCHEDULE_COLORS = {
  not_scheduled: 'text-slate-400',
  scheduled:     'text-green-600',
  failed:        'text-red-600',
};

export default function SocialPostCard({ post, onGenerateImage, onApprove, onSchedule, generatingImage, approving, scheduling }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(`${post.caption}\n\n${post.hashtags}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const pc = PLATFORM_COLORS[post.platform] || 'bg-slate-500/20 text-slate-400';
  const ac = APPROVAL_COLORS[post.approval_status] || APPROVAL_COLORS.draft;
  const sc = SCHEDULE_COLORS[post.scheduling_status] || 'text-slate-500';

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden hover:border-slate-300 hover:shadow-sm transition-all">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={() => setExpanded(e => !e)}>
        <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
          <Badge className={`text-xs ${pc}`}>{post.platform}</Badge>
          <Badge className={`text-xs ${ac}`}>{post.approval_status}</Badge>
          {post.scheduling_status !== 'not_scheduled' && (
            <span className={`text-xs font-medium ${sc}`}>• {post.scheduling_status}</span>
          )}
          <span className="text-xs text-slate-400">{post.post_date} {post.post_time && `@ ${post.post_time}`}</span>
          {post.topic && <span className="text-xs text-amber-600/80 truncate hidden md:block">{post.topic}</span>}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {post.image_status === 'generated' && <div className="w-2 h-2 rounded-full bg-green-500" title="Image ready" />}
          {expanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-slate-200 px-4 pb-4 pt-3 space-y-4 bg-slate-50">
          {/* Caption */}
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-1.5">Caption</p>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{post.caption}</p>
          </div>

          {/* Hashtags */}
          {post.hashtags && (
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Hashtags</p>
              <p className="text-xs text-blue-600">{post.hashtags}</p>
            </div>
          )}

          {/* CTA */}
          {post.call_to_action && (
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Call to Action</p>
              <p className="text-sm text-amber-700 font-medium">{post.call_to_action}</p>
            </div>
          )}

          {/* Image */}
          {post.image_url ? (
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Generated Image</p>
              <img src={post.image_url} alt="Social post" className="rounded-lg max-h-48 object-cover border border-slate-200" />
            </div>
          ) : post.image_prompt ? (
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Image Prompt</p>
              <p className="text-xs text-slate-500 italic">{post.image_prompt}</p>
            </div>
          ) : null}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" variant="ghost" onClick={handleCopy}
              className="text-slate-600 hover:bg-slate-200 text-xs">
              {copied ? <><CheckCircle2 className="w-3 h-3 mr-1 text-green-600" />Copied</> : <><Copy className="w-3 h-3 mr-1" />Copy Caption</>}
            </Button>

            {post.image_status !== 'generated' && post.image_prompt && (
              <Button size="sm" variant="ghost" onClick={() => onGenerateImage(post.id, post.image_prompt)}
                disabled={generatingImage === post.id}
                className="text-amber-600 hover:bg-amber-50 text-xs">
                {generatingImage === post.id
                  ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Generating...</>
                  : <><Image className="w-3 h-3 mr-1" />Generate Image</>}
              </Button>
            )}

            {post.approval_status !== 'approved' && (
              <Button size="sm" onClick={() => onApprove(post.id)} disabled={approving === post.id}
                className="bg-green-600 hover:bg-green-500 text-white text-xs font-bold">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                {approving === post.id ? 'Approving...' : 'Approve'}
              </Button>
            )}

            {post.approval_status === 'approved' && post.scheduling_status === 'not_scheduled' && (
              <Button size="sm" onClick={() => onSchedule(post)} disabled={scheduling === post.id}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold">
                <Calendar className="w-3 h-3 mr-1" />
                {scheduling === post.id ? 'Scheduling...' : 'Schedule'}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}