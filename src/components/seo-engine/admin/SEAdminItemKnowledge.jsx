import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Zap, Eye, CheckCircle2, XCircle, Loader2, BookOpen, Edit } from 'lucide-react';

const STATUS_COLORS = { draft: 'bg-yellow-100 text-yellow-800', review: 'bg-blue-100 text-blue-800', published: 'bg-green-100 text-green-800' };

export default function SEAdminItemKnowledge({ items, onRefresh }) {
  const [genForm, setGenForm] = useState({ item_name:'', category:'', brand:'', era:'' });
  const [generating, setGenerating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  const generateItem = async () => {
    if (!genForm.item_name) return;
    setGenerating(true);
    await base44.functions.invoke('generateItemGuide', { ...genForm, save_to_db: true });
    await onRefresh();
    setGenForm({ item_name:'', category:'', brand:'', era:'' });
    setGenerating(false);
  };

  const saveEdit = async () => {
    setSaving(true);
    await base44.entities.ItemKnowledgeBase.update(editingId, editForm);
    setEditingId(null);
    await onRefresh();
    setSaving(false);
  };

  const togglePublish = async (item) => {
    const status = item.status === 'published' ? 'draft' : 'published';
    await base44.entities.ItemKnowledgeBase.update(item.id, { status });
    await onRefresh();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Generate Item Guide</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-end">
            <div><Label className="text-xs">Item Name *</Label><Input className="w-52" placeholder="e.g. Pyrex Butterprint Bowl" value={genForm.item_name} onChange={e=>setGenForm(p=>({...p,item_name:e.target.value}))} /></div>
            <div><Label className="text-xs">Category</Label><Input className="w-40" placeholder="e.g. Glassware" value={genForm.category} onChange={e=>setGenForm(p=>({...p,category:e.target.value}))} /></div>
            <div><Label className="text-xs">Brand</Label><Input className="w-36" placeholder="e.g. Pyrex" value={genForm.brand} onChange={e=>setGenForm(p=>({...p,brand:e.target.value}))} /></div>
            <div><Label className="text-xs">Era</Label><Input className="w-32" placeholder="e.g. 1960s" value={genForm.era} onChange={e=>setGenForm(p=>({...p,era:e.target.value}))} /></div>
            <Button onClick={generateItem} disabled={generating||!genForm.item_name} className="bg-amber-600 hover:bg-amber-700 gap-2">
              {generating?<Loader2 className="w-4 h-4 animate-spin"/>:<Zap className="w-4 h-4"/>} Generate Guide
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {items.map(item => (
          <Card key={item.id}>
            <CardContent className="p-4">
              {editingId === item.id ? (
                <div className="space-y-3">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div><Label className="text-xs">Item Name</Label><Input value={editForm.item_name||''} onChange={e=>setEditForm(p=>({...p,item_name:e.target.value}))} /></div>
                    <div><Label className="text-xs">SEO Title</Label><Input value={editForm.seo_title||''} onChange={e=>setEditForm(p=>({...p,seo_title:e.target.value}))} /></div>
                    <div className="sm:col-span-2"><Label className="text-xs">SEO Description</Label><Input value={editForm.seo_description||''} onChange={e=>setEditForm(p=>({...p,seo_description:e.target.value}))} /></div>
                    <div><Label className="text-xs">Pricing Notes</Label><Input value={editForm.pricing_notes||''} onChange={e=>setEditForm(p=>({...p,pricing_notes:e.target.value}))} /></div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveEdit} disabled={saving} className="bg-green-600 hover:bg-green-700">{saving?<Loader2 className="w-3 h-3 animate-spin"/>:null} Save</Button>
                    <Button size="sm" variant="outline" onClick={()=>setEditingId(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-900">{item.item_name}</p>
                      <Badge className={STATUS_COLORS[item.status]}>{item.status}</Badge>
                      {item.category && <Badge className="bg-slate-100 text-slate-600 text-xs">{item.category}</Badge>}
                      {item.era && <Badge className="bg-slate-100 text-slate-600 text-xs">{item.era}</Badge>}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">/items/{item.item_slug} {item.brand && `· ${item.brand}`}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {item.item_slug && (
                      <a href={`/items/${item.item_slug}`} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm"><Eye className="w-3 h-3"/></Button>
                      </a>
                    )}
                    <Button variant="outline" size="sm" onClick={()=>{setEditingId(item.id);setEditForm({item_name:item.item_name,seo_title:item.seo_title,seo_description:item.seo_description,pricing_notes:item.pricing_notes});}}>
                      <Edit className="w-3 h-3"/>
                    </Button>
                    <Button size="sm" onClick={()=>togglePublish(item)} className={item.status==='published'?'bg-slate-500 hover:bg-slate-600 text-white':'bg-green-600 hover:bg-green-700 text-white'}>
                      {item.status==='published'?<XCircle className="w-3 h-3"/>:<CheckCircle2 className="w-3 h-3"/>}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {items.length===0 && <div className="text-center py-10 text-slate-500"><BookOpen className="w-10 h-10 mx-auto mb-3 text-slate-300"/><p>No item guides yet.</p></div>}
      </div>
    </div>
  );
}