import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Copy, CheckCircle, FileText, Youtube, Share2, BookOpen, Hash } from 'lucide-react';

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs"
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
      {copied ? <><CheckCircle className="w-3 h-3 text-green-500" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
    </Button>
  );
}

function ScriptBlock({ label, icon, content, color = 'border-slate-200' }) {
  const Icon = icon;
  return (
    <div className={`border rounded-xl p-4 ${color}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1">
          <Icon className="w-3.5 h-3.5" /> {label}
        </h3>
        {content && <CopyButton text={content} />}
      </div>
      {content ? (
        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{content}</p>
      ) : (
        <p className="text-xs text-slate-400 italic">Not yet generated</p>
      )}
    </div>
  );
}

export default function BatchScriptPanel({ batch }) {
  const [activeTab, setActiveTab] = useState('script');

  const tabs = [
    { id: 'script', label: 'Script', icon: FileText },
    { id: 'youtube', label: 'YouTube', icon: Youtube },
    { id: 'social', label: 'Social', icon: Share2 },
    { id: 'blog', label: 'Blog', icon: BookOpen },
  ];

  const social = batch.generated_social_captions || {};

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-violet-600 text-white' : 'bg-white border text-slate-600 hover:border-violet-300'}`}>
              <Icon className="w-3.5 h-3.5" /> {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'script' && (
        <div className="space-y-4">
          {batch.generated_video_title && (
            <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-violet-700 uppercase tracking-wide">Video Title</span>
                <CopyButton text={batch.generated_video_title} />
              </div>
              <p className="text-slate-900 font-semibold">{batch.generated_video_title}</p>
            </div>
          )}
          {batch.generated_thumbnail_text && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">Thumbnail Text Options</span>
                <CopyButton text={batch.generated_thumbnail_text} />
              </div>
              <div className="flex flex-wrap gap-2">
                {batch.generated_thumbnail_text.split('|').map((t, i) => (
                  <Badge key={i} className="bg-amber-600 text-white font-bold">{t.trim()}</Badge>
                ))}
              </div>
            </div>
          )}
          {batch.generated_video_script ? (
            <div className="bg-white border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-bold text-slate-800 flex items-center gap-2"><FileText className="w-4 h-4 text-violet-500" /> Full Video Script</h3>
                <CopyButton text={batch.generated_video_script} />
              </div>
              <div className="p-4 max-h-96 overflow-y-auto">
                <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
                  {batch.generated_video_script}
                </pre>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400 text-sm bg-white border rounded-xl">
              Script not yet generated. Run the batch with generate_script=true.
            </div>
          )}
        </div>
      )}

      {activeTab === 'youtube' && (
        <div className="space-y-4">
          <ScriptBlock label="YouTube Description" icon={Youtube} content={batch.generated_video_description} color="border-red-200" />
          <ScriptBlock label="Chapters" icon={FileText} content={batch.generated_youtube_chapters} color="border-slate-200" />
          {batch.generated_youtube_tags?.length > 0 && (
            <div className="border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1"><Hash className="w-3.5 h-3.5" /> YouTube Tags</h3>
                <CopyButton text={batch.generated_youtube_tags.join(', ')} />
              </div>
              <div className="flex flex-wrap gap-1">
                {batch.generated_youtube_tags.map((tag, i) => (
                  <Badge key={i} variant="outline" className="text-xs">{tag}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'social' && (
        <div className="space-y-4">
          <ScriptBlock label="Instagram Caption" icon={Share2} content={social.instagram} color="border-pink-200" />
          <ScriptBlock label="TikTok Caption" icon={Share2} content={social.tiktok} color="border-slate-200" />
          <ScriptBlock label="Facebook Caption" icon={Share2} content={social.facebook} color="border-blue-200" />
        </div>
      )}

      {activeTab === 'blog' && (
        <div>
          <ScriptBlock label="Blog Post Intro" icon={BookOpen} content={batch.generated_blog_post} color="border-green-200" />
        </div>
      )}
    </div>
  );
}