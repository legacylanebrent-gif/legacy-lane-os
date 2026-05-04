import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, CheckCircle2, Image, Calendar, AlertTriangle, Wifi, WifiOff, Lock } from 'lucide-react';
import SocialCalendarGenerator from './SocialCalendarGenerator';
import SocialPostCard from './SocialPostCard';

export default function SocialAutopilotTab({ user }) {
  const [generating, setGenerating] = useState(false);
  const [calendars, setCalendars] = useState([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState('');
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(null);
  const [approving, setApproving] = useState(null);
  const [scheduling, setScheduling] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [settings, setSettings] = useState(null);
  const [confirmBulkSchedule, setConfirmBulkSchedule] = useState(false);
  const [bulkWorking, setBulkWorking] = useState(false);

  useEffect(() => {
    loadCalendars();
    loadSettings();
  }, []);

  useEffect(() => {
    if (selectedCalendarId) loadPosts(selectedCalendarId);
  }, [selectedCalendarId]);

  const loadSettings = async () => {
    try {
      const s = await base44.entities.AdminAISettings.list('-created_date', 1);
      setSettings(s[0] || {});
    } catch (_) {}
  };

  const loadCalendars = async () => {
    try {
      const data = await base44.entities.SocialContentCalendar.list('-created_at', 20);
      setCalendars(data);
      if (data.length > 0 && !selectedCalendarId) setSelectedCalendarId(data[0].id);
    } catch (_) {}
  };

  const loadPosts = async (calId) => {
    setLoadingPosts(true);
    try {
      const data = await base44.entities.SocialPostDraft.filter({ calendar_id: calId });
      setPosts(data.sort((a, b) => new Date(a.post_date) - new Date(b.post_date)));
    } catch (_) { setPosts([]); }
    setLoadingPosts(false);
  };

  const handleGenerate = async (payload) => {
    setGenerating(true);
    setFeedback('');
    try {
      const res = await base44.functions.invoke('generateMonthlySocialCalendar', payload);
      setFeedback(`✓ Created "${res.data.calendar_title}" with ${res.data.total_posts} posts.`);
      await loadCalendars();
      setSelectedCalendarId(res.data.calendar_id);
    } catch (err) {
      setFeedback('Error: ' + (err?.response?.data?.error || err.message));
    }
    setGenerating(false);
  };

  const handleGenerateImage = async (postId, imagePrompt) => {
    setGeneratingImage(postId);
    try {
      await base44.functions.invoke('generateSocialImage', { social_post_id: postId, image_prompt: imagePrompt });
      await loadPosts(selectedCalendarId);
    } catch (err) {
      setFeedback('Image error: ' + (err?.response?.data?.error || err.message));
    }
    setGeneratingImage(null);
  };

  const handleApprove = async (postId) => {
    setApproving(postId);
    try {
      await base44.functions.invoke('approveSocialPost', { social_post_id: postId });
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, approval_status: 'approved' } : p));
    } catch (err) {
      setFeedback('Approve error: ' + err.message);
    }
    setApproving(null);
  };

  const handleSchedule = async (post) => {
    setScheduling(post.id);
    try {
      const res = await base44.functions.invoke('scheduleSocialPost', { social_post_id: post.id, platform: post.platform, scheduled_date: post.post_date, scheduled_time: post.post_time });
      if (res.data.success) {
        setPosts(prev => prev.map(p => p.id === post.id ? { ...p, scheduling_status: 'scheduled' } : p));
        setFeedback(`✓ "${post.topic || post.platform + ' post'}" scheduled successfully.`);
      } else {
        setFeedback('Schedule failed: ' + (res.data.error || 'Unknown error'));
      }
    } catch (err) {
      setFeedback('Schedule error: ' + (err?.response?.data?.error || err.message));
    }
    setScheduling(null);
  };

  const handleBulkApprove = async () => {
    setBulkWorking(true);
    const toApprove = posts.filter(p => p.approval_status === 'draft' || p.approval_status === 'needs_review');
    let count = 0;
    for (const p of toApprove) {
      try { await base44.functions.invoke('approveSocialPost', { social_post_id: p.id }); count++; } catch (_) {}
    }
    await loadPosts(selectedCalendarId);
    setFeedback(`✓ ${count} posts approved.`);
    setBulkWorking(false);
  };

  const handleBulkGenerateImages = async () => {
    setBulkWorking(true);
    const toGenerate = posts.filter(p => p.image_status === 'not_generated' && p.image_prompt);
    let count = 0;
    for (const p of toGenerate) {
      try { await base44.functions.invoke('generateSocialImage', { social_post_id: p.id, image_prompt: p.image_prompt }); count++; } catch (_) {}
    }
    await loadPosts(selectedCalendarId);
    setFeedback(`✓ ${count} images generated.`);
    setBulkWorking(false);
  };

  const handleBulkScheduleConfirm = async () => {
    setConfirmBulkSchedule(false);
    setBulkWorking(true);
    const toSchedule = posts.filter(p => p.approval_status === 'approved' && p.scheduling_status === 'not_scheduled');
    let count = 0;
    for (const p of toSchedule) {
      try {
        const res = await base44.functions.invoke('scheduleSocialPost', { social_post_id: p.id, platform: p.platform, scheduled_date: p.post_date, scheduled_time: p.post_time });
        if (res.data.success) count++;
      } catch (_) {}
    }
    await loadPosts(selectedCalendarId);
    setFeedback(`✓ ${count} posts sent to scheduler.`);
    setBulkWorking(false);
  };

  const currentCalendar = calendars.find(c => c.id === selectedCalendarId);
  const approvedCount = posts.filter(p => p.approval_status === 'approved').length;
  const scheduledCount = posts.filter(p => p.scheduling_status === 'scheduled').length;
  const imageReadyCount = posts.filter(p => p.image_status === 'generated').length;

  return (
    <div className="space-y-6">
      {/* Integration Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { label: 'OpenAI API', ok: true, desc: 'Connected' },
          { label: 'Make Webhook', ok: !!settings?.allow_social_scheduling, desc: settings?.allow_social_scheduling ? 'Enabled in settings' : 'Disabled — enable in Settings' },
          { label: 'Direct Publishing', ok: false, desc: settings?.allow_social_publishing ? 'Enabled' : 'Disabled (default)' },
        ].map((s, i) => (
          <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border text-xs ${s.ok ? 'border-green-500/30 bg-green-500/5' : 'border-slate-700/40 bg-slate-800/20'}`}>
            {s.ok ? <Wifi className="w-3.5 h-3.5 text-green-400 flex-shrink-0" /> : <WifiOff className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />}
            <div>
              <p className={`font-semibold ${s.ok ? 'text-green-400' : 'text-slate-400'}`}>{s.label}</p>
              <p className="text-slate-500">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Generator */}
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-6">
        <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-widest mb-5 flex items-center gap-2">
          <span className="text-amber-400">✦</span> Generate Monthly Content Calendar
        </h3>
        <SocialCalendarGenerator onGenerated={handleGenerate} loading={generating} />
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`p-3 rounded-lg border text-sm ${feedback.startsWith('✓') ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
          {feedback}
          <button onClick={() => setFeedback('')} className="ml-3 text-xs opacity-50 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Calendar View */}
      {calendars.length > 0 && (
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-6 space-y-4">
          {/* Calendar selector + stats */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <Select value={selectedCalendarId} onValueChange={setSelectedCalendarId}>
                <SelectTrigger className="bg-slate-800/60 border-slate-600 text-slate-200 text-sm w-72">
                  <SelectValue placeholder="Select calendar..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  {calendars.map(c => (
                    <SelectItem key={c.id} value={c.id} className="text-slate-200 focus:bg-slate-700">
                      {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {currentCalendar && (
                <div className="flex gap-2 flex-wrap">
                  <Badge className="bg-slate-700/50 text-slate-400 text-xs">{posts.length} posts</Badge>
                  <Badge className="bg-green-500/20 text-green-400 text-xs">{approvedCount} approved</Badge>
                  <Badge className="bg-blue-500/20 text-blue-400 text-xs">{scheduledCount} scheduled</Badge>
                  <Badge className="bg-amber-500/20 text-amber-400 text-xs">{imageReadyCount} images ready</Badge>
                </div>
              )}
            </div>
            <Button size="sm" variant="ghost" onClick={() => loadPosts(selectedCalendarId)} className="text-slate-400 hover:text-white text-xs">
              <RefreshCw className="w-3.5 h-3.5 mr-1" />Refresh
            </Button>
          </div>

          {/* Bulk Actions */}
          <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-slate-700/20 border border-slate-700/40">
            <span className="text-xs text-slate-500 self-center mr-1">Bulk:</span>
            <Button size="sm" variant="ghost" onClick={handleBulkApprove} disabled={bulkWorking}
              className="text-green-400 hover:bg-green-500/10 text-xs">
              <CheckCircle2 className="w-3 h-3 mr-1" />Approve All Reviewed
            </Button>
            <Button size="sm" variant="ghost" onClick={handleBulkGenerateImages} disabled={bulkWorking}
              className="text-amber-400 hover:bg-amber-500/10 text-xs">
              <Image className="w-3 h-3 mr-1" />Generate All Missing Images
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmBulkSchedule(true)} disabled={bulkWorking || !settings?.allow_social_scheduling}
              className="text-blue-400 hover:bg-blue-500/10 text-xs">
              <Calendar className="w-3 h-3 mr-1" />Schedule All Approved
            </Button>
            {!settings?.allow_social_scheduling && (
              <span className="text-xs text-slate-500 flex items-center gap-1"><Lock className="w-3 h-3" />Scheduling disabled in settings</span>
            )}
          </div>

          {/* Posts */}
          {loadingPosts ? (
            <div className="text-center py-8 text-slate-500 text-sm">Loading posts...</div>
          ) : posts.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">No posts in this calendar.</div>
          ) : (
            <div className="space-y-2">
              {posts.map(post => (
                <SocialPostCard
                  key={post.id}
                  post={post}
                  onGenerateImage={handleGenerateImage}
                  onApprove={handleApprove}
                  onSchedule={handleSchedule}
                  generatingImage={generatingImage}
                  approving={approving}
                  scheduling={scheduling}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Compliance notice */}
      <div className="flex items-start gap-3 p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-300/80">
          <strong>Content Safety:</strong> All generated content uses cautious language around referral programs. Do not imply guaranteed referral income or that Legacy Lane/Houszu receives real estate commission. Review all posts before publishing.
        </p>
      </div>

      {/* Bulk Schedule Confirmation Modal */}
      {confirmBulkSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl w-full max-w-md p-6">
            <h3 className="text-base font-bold text-white mb-2">Bulk Schedule Confirmation</h3>
            <p className="text-sm text-slate-400 mb-5">
              You are about to schedule <strong className="text-white">{posts.filter(p => p.approval_status === 'approved' && p.scheduling_status === 'not_scheduled').length} approved posts</strong> through the connected scheduler (Make/Integromat). Continue?
            </p>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setConfirmBulkSchedule(false)} className="flex-1 border border-slate-700 text-slate-400 text-sm">Cancel</Button>
              <Button onClick={handleBulkScheduleConfirm} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm">Yes, Schedule All</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}