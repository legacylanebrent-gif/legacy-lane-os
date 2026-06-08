import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { isAdminUser } from '@/lib/isAdminUser';
import VideoItemCard from '@/components/video/VideoItemCard';
import BatchScriptPanel from '@/components/video/BatchScriptPanel';
import {
  Video, Plus, RefreshCw, AlertTriangle, CheckCircle2, Loader2,
  Play, ChevronRight, Sparkles, BarChart3, Film, Calendar, Star
} from 'lucide-react';
import { format } from 'date-fns';

const STATUS_COLORS = {
  draft: 'bg-slate-100 text-slate-600',
  items_selected: 'bg-blue-100 text-blue-700',
  admin_reviewed: 'bg-amber-100 text-amber-700',
  script_generated: 'bg-violet-100 text-violet-700',
  sent_to_video_provider: 'bg-orange-100 text-orange-700',
  video_rendered: 'bg-green-100 text-green-700',
  posted_to_youtube: 'bg-red-100 text-red-700',
  archived: 'bg-slate-100 text-slate-400',
};

export default function WeeklyVideoIntelligence() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [batch, setBatch] = useState(null);
  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('items');
  const [saving, setSaving] = useState(false);
  const [generatingScript, setGeneratingScript] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        setUser(me);
        if (me && isAdminUser(me)) {
          await loadBatches();
        }
      } catch (_) {}
      setLoading(false);
    })();
  }, []);

  async function loadBatches() {
    const data = await base44.entities.WeeklyVideoBatch.list('-week_start_date', 20);
    setBatches(data);
    if (data.length > 0 && !selectedBatchId) {
      setSelectedBatchId(data[0].id);
      await loadBatch(data[0].id);
    }
  }

  async function loadBatch(batchId) {
    if (!batchId) return;
    setItemsLoading(true);
    const [batchData, itemData] = await Promise.all([
      base44.entities.WeeklyVideoBatch.filter({ id: batchId }),
      base44.entities.WeeklyVideoItem.filter({ weekly_video_batch_id: batchId }, 'display_order', 50),
    ]);
    setBatch(batchData[0] || null);
    setItems(itemData.sort((a, b) => (a.display_order || 0) - (b.display_order || 0)));
    setItemsLoading(false);
  }

  async function handleSelectBatch(id) {
    setSelectedBatchId(id);
    await loadBatch(id);
  }

  async function generateNewBatch() {
    setGenerating(true);
    try {
      const res = await base44.functions.invoke('generateWeeklyVideoBatch', { generate_script: true });
      if (res.data?.batch_id) {
        await loadBatches();
        setSelectedBatchId(res.data.batch_id);
        await loadBatch(res.data.batch_id);
      }
    } catch (e) {
      alert('Error: ' + e.message);
    }
    setGenerating(false);
  }

  async function regenerateScript() {
    if (!batch) return;
    setGeneratingScript(true);
    try {
      await base44.functions.invoke('generateWeeklyVideoBatch', {
        week_start_date: batch.week_start_date,
        generate_script: true,
        force_regenerate: true,
      });
      await loadBatch(batch.id);
    } catch (e) {
      alert('Error: ' + e.message);
    }
    setGeneratingScript(false);
  }

  async function removeItem(itemId) {
    await base44.entities.WeeklyVideoItem.update(itemId, { admin_selected: false });
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, admin_selected: false } : i));
    const newCount = items.filter(i => i.admin_selected && i.id !== itemId).length;
    if (batch) await base44.entities.WeeklyVideoBatch.update(batch.id, { selected_item_count: newCount, status: 'admin_reviewed' });
  }

  async function updateNotes(itemId, notes) {
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, admin_notes: notes } : i));
  }

  async function saveNotes(itemId, notes) {
    setSaving(true);
    await base44.entities.WeeklyVideoItem.update(itemId, { admin_notes: notes });
    setSaving(false);
  }

  async function markReviewed() {
    if (!batch) return;
    await base44.entities.WeeklyVideoBatch.update(batch.id, { status: 'admin_reviewed' });
    setBatch(prev => ({ ...prev, status: 'admin_reviewed' }));
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
    </div>
  );

  if (!user || !isAdminUser(user)) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold">Admin Access Required</h2>
      </div>
    </div>
  );

  const selectedItems = items.filter(i => i.admin_selected);
  const topItem = selectedItems.sort((a, b) => (b.total_video_score || 0) - (a.total_video_score || 0))[0];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-violet-950 to-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Film className="w-5 h-5 text-violet-400" />
                <span className="text-violet-400 text-sm font-semibold uppercase tracking-widest">Weekly Content Engine</span>
              </div>
              <h1 className="text-3xl font-black tracking-tight">Weekly Video Intelligence</h1>
              <p className="text-slate-400 mt-1 text-sm">Turn estate sale inventory into YouTube videos, blog posts, and market intelligence</p>
            </div>
            <Button
              onClick={generateNewBatch}
              disabled={generating}
              className="bg-violet-600 hover:bg-violet-700 gap-2"
            >
              {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : <><Plus className="w-4 h-4" /> Generate This Week's Batch</>}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        {/* Batch selector */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-48 max-w-sm">
            <Select value={selectedBatchId} onValueChange={handleSelectBatch}>
              <SelectTrigger>
                <SelectValue placeholder="Select a weekly batch..." />
              </SelectTrigger>
              <SelectContent>
                {batches.map(b => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.title || b.week_start_date}
                    {' · '}
                    <span className="capitalize">{b.status?.replace(/_/g, ' ')}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {batch && (
            <Badge className={STATUS_COLORS[batch.status] || 'bg-slate-100 text-slate-600'}>
              {batch.status?.replace(/_/g, ' ').toUpperCase()}
            </Badge>
          )}
          {batch?.quality_flag && (
            <Badge className="bg-amber-100 text-amber-700 gap-1">
              <AlertTriangle className="w-3 h-3" /> {batch.quality_flag}
            </Badge>
          )}
        </div>

        {!batch && !generating && (
          <div className="text-center py-20 bg-white border rounded-2xl">
            <Video className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-700 mb-2">No Video Batches Yet</h3>
            <p className="text-slate-500 mb-6">Click "Generate This Week's Batch" to analyze inventory and build your first video package.</p>
            <Button onClick={generateNewBatch} disabled={generating} className="bg-violet-600 hover:bg-violet-700 gap-2">
              <Sparkles className="w-4 h-4" /> Generate Now
            </Button>
          </div>
        )}

        {generating && (
          <div className="text-center py-20 bg-white border rounded-2xl">
            <Loader2 className="w-12 h-12 text-violet-500 mx-auto mb-4 animate-spin" />
            <h3 className="text-lg font-bold text-slate-700">Analyzing inventory & generating batch...</h3>
            <p className="text-slate-400 text-sm mt-2">Scoring items, running AI research, writing scripts. This takes 1-3 minutes.</p>
          </div>
        )}

        {batch && (
          <>
            {/* Batch stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white border rounded-xl p-4 shadow-sm">
                <div className="text-2xl font-black text-slate-900">{batch.candidate_item_count || 0}</div>
                <div className="text-sm text-slate-500">Candidates Analyzed</div>
              </div>
              <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 shadow-sm">
                <div className="text-2xl font-black text-violet-700">{selectedItems.length}</div>
                <div className="text-sm text-violet-600">Items Selected</div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 shadow-sm">
                <div className="text-2xl font-black text-green-700">
                  {topItem ? `${Math.round(topItem.total_video_score)}` : '—'}
                </div>
                <div className="text-sm text-green-600">Top Item Score</div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-sm">
                <div className="text-sm font-semibold text-amber-700 truncate">{topItem?.title || '—'}</div>
                <div className="text-xs text-amber-500 mt-0.5">Best Item</div>
              </div>
            </div>

            {/* Tab nav */}
            <div className="flex gap-2 border-b border-slate-200">
              {[
                { id: 'items', label: `Items (${selectedItems.length})`, icon: Star },
                { id: 'script', label: 'Video Package', icon: Film },
              ].map(tab => {
                const Icon = tab.icon;
                return (
                  <button key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${activeTab === tab.id ? 'border-violet-600 text-violet-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                    <Icon className="w-4 h-4" /> {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Items tab */}
            {activeTab === 'items' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-slate-800">Selected Items — Drag to Reorder</h2>
                  <div className="flex gap-2">
                    {batch.status !== 'admin_reviewed' && (
                      <Button onClick={markReviewed} variant="outline" size="sm" className="gap-1 text-green-600 border-green-300 hover:bg-green-50">
                        <CheckCircle2 className="w-4 h-4" /> Mark Reviewed
                      </Button>
                    )}
                  </div>
                </div>

                {itemsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
                  </div>
                ) : selectedItems.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 bg-white border rounded-2xl">
                    No items selected yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedItems.map((item, idx) => (
                      <VideoItemCard
                        key={item.id}
                        item={item}
                        index={idx + 1}
                        onRemove={removeItem}
                        onNotesChange={(id, notes) => {
                          updateNotes(id, notes);
                          clearTimeout(window._noteTimer);
                          window._noteTimer = setTimeout(() => saveNotes(id, notes), 800);
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Removed items */}
                {items.filter(i => !i.admin_selected).length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-sm font-bold text-slate-500 mb-2 uppercase tracking-wide">Removed from Video</h3>
                    <div className="space-y-2">
                      {items.filter(i => !i.admin_selected).map(item => (
                        <div key={item.id} className="flex items-center justify-between bg-white border rounded-lg p-3 opacity-50">
                          <div className="flex items-center gap-3">
                            {item.image_url && <img src={item.image_url} alt={item.title} className="w-10 h-10 object-cover rounded" loading="lazy" />}
                            <span className="text-sm text-slate-600">{item.title}</span>
                            <span className="text-xs text-slate-400">Score: {Math.round(item.total_video_score)}</span>
                          </div>
                          <Button variant="outline" size="sm" className="text-xs"
                            onClick={async () => {
                              await base44.entities.WeeklyVideoItem.update(item.id, { admin_selected: true });
                              await loadBatch(batch.id);
                            }}>
                            Restore
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Script tab */}
            {activeTab === 'script' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-slate-800">Video Package</h2>
                  <Button
                    onClick={regenerateScript}
                    disabled={generatingScript}
                    variant="outline"
                    size="sm"
                    className="gap-1"
                  >
                    {generatingScript ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    Regenerate Script
                  </Button>
                </div>
                {generatingScript ? (
                  <div className="text-center py-12 bg-white border rounded-2xl">
                    <Loader2 className="w-8 h-8 text-violet-500 mx-auto mb-3 animate-spin" />
                    <p className="text-slate-500">Regenerating video script & YouTube package...</p>
                  </div>
                ) : (
                  <BatchScriptPanel batch={batch} />
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}