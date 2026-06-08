import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Zap, Eye, CheckCircle2, XCircle, RefreshCw, Loader2, FileText } from 'lucide-react';

const EVENT_TYPES = ['probate','downsizing','divorce','relocation','senior_transition','inherited_home','estate_settlement','bankruptcy','foreclosure','other'];
const STATUS_COLORS = { draft: 'bg-yellow-100 text-yellow-800', review: 'bg-blue-100 text-blue-800', published: 'bg-green-100 text-green-800' };

export default function SEAdminContentHubs({ hubs, onRefresh }) {
  const [generating, setGenerating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [genForm, setGenForm] = useState({ event_type: '', target_keyword: '' });

  const generateHub = async () => {
    if (!genForm.event_type || !genForm.target_keyword) return;
    setGenerating(true);
    await base44.functions.invoke('generateLifeEventHub', { ...genForm, save_to_db: true });
    await onRefresh();
    setGenForm({ event_type: '', target_keyword: '' });
    setGenerating(false);
  };

  const togglePublish = async (hub) => {
    const newStatus = hub.status === 'published' ? 'draft' : 'published';
    await base44.entities.LifeEventHub.update(hub.id, { status: newStatus });
    await onRefresh();
  };

  const saveEdit = async () => {
    await base44.entities.LifeEventHub.update(editingId, editForm);
    setEditingId(null);
    await onRefresh();
  };

  return (
    <div className="space-y-4">
      {/* Generate Form */}
      <Card>
        <CardHeader><CardTitle className="text-base">Generate New Hub</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <Label className="text-xs">Event Type</Label>
              <Select value={genForm.event_type} onValueChange={v => setGenForm(p => ({ ...p, event_type: v }))}>
                <SelectTrigger className="w-52"><SelectValue placeholder="Select event type..." /></SelectTrigger>
                <SelectContent>{EVENT_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-48">
              <Label className="text-xs">Target Keyword</Label>
              <Input placeholder="e.g. probate estate sale guide" value={genForm.target_keyword} onChange={e => setGenForm(p => ({ ...p, target_keyword: e.target.value }))} />
            </div>
            <Button onClick={generateHub} disabled={generating || !genForm.event_type || !genForm.target_keyword} className="bg-amber-600 hover:bg-amber-700 gap-2">
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />} Generate Hub
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Hub List */}
      <div className="space-y-3">
        {hubs.map(hub => (
          <Card key={hub.id}>
            <CardContent className="p-4">
              {editingId === hub.id ? (
                <div className="space-y-3">
                  <Input value={editForm.title || ''} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} placeholder="Title" />
                  <Input value={editForm.seo_title || ''} onChange={e => setEditForm(p => ({ ...p, seo_title: e.target.value }))} placeholder="SEO Title" />
                  <Input value={editForm.seo_description || ''} onChange={e => setEditForm(p => ({ ...p, seo_description: e.target.value }))} placeholder="SEO Description" />
                  <Textarea value={editForm.intro_content || ''} onChange={e => setEditForm(p => ({ ...p, intro_content: e.target.value }))} rows={3} placeholder="Intro content" />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveEdit} className="bg-green-600 hover:bg-green-700">Save</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-900">{hub.title}</p>
                      <Badge className={STATUS_COLORS[hub.status]}>{hub.status}</Badge>
                      <Badge className="bg-slate-100 text-slate-600 text-xs">{hub.event_type?.replace(/_/g, ' ')}</Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">/{hub.slug} · {hub.seo_title}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {hub.slug && (
                      <a href={`/${hub.slug}`} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm"><Eye className="w-3 h-3" /></Button>
                      </a>
                    )}
                    <Button variant="outline" size="sm" onClick={() => { setEditingId(hub.id); setEditForm({ title: hub.title, seo_title: hub.seo_title, seo_description: hub.seo_description, intro_content: hub.intro_content }); }}>
                      Edit
                    </Button>
                    <Button size="sm" onClick={() => togglePublish(hub)}
                      className={hub.status === 'published' ? 'bg-slate-500 hover:bg-slate-600 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}>
                      {hub.status === 'published' ? <><XCircle className="w-3 h-3 mr-1" />Unpublish</> : <><CheckCircle2 className="w-3 h-3 mr-1" />Publish</>}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {hubs.length === 0 && (
          <div className="text-center py-12 text-slate-500"><FileText className="w-10 h-10 mx-auto mb-3 text-slate-300" /><p>No hubs yet. Generate your first one above.</p></div>
        )}
      </div>
    </div>
  );
}