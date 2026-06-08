import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Zap, Eye, CheckCircle2, XCircle, Loader2, GraduationCap, Edit } from 'lucide-react';

const CATEGORIES = ['probate_101','estate_sale_process','pricing_and_value','cleanout_and_donations','inherited_home','downsizing','legal_and_tax','for_operators','for_buyers','general'];
const STATUS_COLORS = { draft: 'bg-yellow-100 text-yellow-800', review: 'bg-blue-100 text-blue-800', published: 'bg-green-100 text-green-800' };

export default function SEAdminUniversity({ articles, onRefresh }) {
  const [genForm, setGenForm] = useState({ title:'', target_keyword:'', category:'' });
  const [generating, setGenerating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [filterCat, setFilterCat] = useState('all');

  const generateArticle = async () => {
    if (!genForm.title || !genForm.target_keyword || !genForm.category) return;
    setGenerating(true);
    await base44.functions.invoke('generateEstateSaleUniversityArticle', { ...genForm, save_to_db: true });
    await onRefresh();
    setGenForm({ title:'', target_keyword:'', category:'' });
    setGenerating(false);
  };

  const saveEdit = async () => {
    setSaving(true);
    await base44.entities.EstateSaleUniversityArticle.update(editingId, editForm);
    setEditingId(null);
    await onRefresh();
    setSaving(false);
  };

  const togglePublish = async (a) => {
    await base44.entities.EstateSaleUniversityArticle.update(a.id, { status: a.status==='published'?'draft':'published' });
    await onRefresh();
  };

  const filtered = filterCat==='all' ? articles : articles.filter(a=>a.category===filterCat);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Generate Article</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-52"><Label className="text-xs">Article Title *</Label><Input placeholder="e.g. What Happens to Belongings During Probate?" value={genForm.title} onChange={e=>setGenForm(p=>({...p,title:e.target.value}))} /></div>
            <div className="flex-1 min-w-44"><Label className="text-xs">Target Keyword *</Label><Input placeholder="e.g. belongings during probate" value={genForm.target_keyword} onChange={e=>setGenForm(p=>({...p,target_keyword:e.target.value}))} /></div>
            <div><Label className="text-xs">Category *</Label>
              <Select value={genForm.category} onValueChange={v=>setGenForm(p=>({...p,category:v}))}>
                <SelectTrigger className="w-48"><SelectValue placeholder="Category..." /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c=><SelectItem key={c} value={c}>{c.replace(/_/g,' ')}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={generateArticle} disabled={generating||!genForm.title||!genForm.target_keyword||!genForm.category} className="bg-amber-600 hover:bg-amber-700 gap-2">
              {generating?<Loader2 className="w-4 h-4 animate-spin"/>:<Zap className="w-4 h-4"/>} Generate
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Filter by category" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Categories</SelectItem>{CATEGORIES.map(c=><SelectItem key={c} value={c}>{c.replace(/_/g,' ')}</SelectItem>)}</SelectContent>
        </Select>
        <span className="text-sm text-slate-500 self-center">{filtered.length} articles</span>
      </div>

      <div className="space-y-2">
        {filtered.map(a => (
          <Card key={a.id}>
            <CardContent className="p-4">
              {editingId===a.id ? (
                <div className="space-y-3">
                  <Input value={editForm.title||''} onChange={e=>setEditForm(p=>({...p,title:e.target.value}))} placeholder="Title" />
                  <Input value={editForm.seo_title||''} onChange={e=>setEditForm(p=>({...p,seo_title:e.target.value}))} placeholder="SEO Title" />
                  <Input value={editForm.seo_description||''} onChange={e=>setEditForm(p=>({...p,seo_description:e.target.value}))} placeholder="SEO Description" />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveEdit} disabled={saving} className="bg-green-600 hover:bg-green-700">Save</Button>
                    <Button size="sm" variant="outline" onClick={()=>setEditingId(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-900">{a.title}</p>
                      <Badge className={STATUS_COLORS[a.status]}>{a.status}</Badge>
                      <Badge className="bg-slate-100 text-slate-600 text-xs">{a.category?.replace(/_/g,' ')}</Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">/learn/{a.slug} · "{a.target_keyword}"</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <a href={`/learn/${a.slug}`} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm"><Eye className="w-3 h-3"/></Button>
                    </a>
                    <Button variant="outline" size="sm" onClick={()=>{setEditingId(a.id);setEditForm({title:a.title,seo_title:a.seo_title,seo_description:a.seo_description});}}>
                      <Edit className="w-3 h-3"/>
                    </Button>
                    <Button size="sm" onClick={()=>togglePublish(a)} className={a.status==='published'?'bg-slate-500 hover:bg-slate-600 text-white':'bg-green-600 hover:bg-green-700 text-white'}>
                      {a.status==='published'?<XCircle className="w-3 h-3"/>:<CheckCircle2 className="w-3 h-3"/>}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {filtered.length===0 && <div className="text-center py-10 text-slate-500"><GraduationCap className="w-10 h-10 mx-auto mb-3 text-slate-300"/><p>No articles yet.</p></div>}
      </div>
    </div>
  );
}