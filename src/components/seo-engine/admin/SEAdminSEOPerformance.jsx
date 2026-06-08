import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, Loader2, TrendingUp, ExternalLink } from 'lucide-react';

const PAGE_TYPES = ['life_event_hub','state_guide','county_guide','item_knowledge','university_article','weekly_report','estate_sale','probate_state','probate_county','other'];
const INDEX_STATUS = ['not_submitted','submitted','indexed','not_indexed','crawl_error','unknown'];
const SITEMAP_STATUS = ['not_included','included','error'];

const indexColor = { indexed:'bg-green-100 text-green-700', not_indexed:'bg-red-100 text-red-700', submitted:'bg-blue-100 text-blue-700', crawl_error:'bg-red-100 text-red-700', not_submitted:'bg-slate-100 text-slate-500', unknown:'bg-yellow-100 text-yellow-700' };
const sitemapColor = { included:'bg-green-100 text-green-700', not_included:'bg-slate-100 text-slate-500', error:'bg-red-100 text-red-700' };

export default function SEAdminSEOPerformance({ seoLogs, onRefresh }) {
  const [form, setForm] = useState({ page_url:'', page_type:'', sitemap_status:'not_included', indexing_status:'not_submitted' });
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');
  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  const saveLog = async () => {
    if (!form.page_url || !form.page_type) return;
    setSaving(true);
    await base44.entities.SEOIndexLog.create(form);
    setForm({ page_url:'', page_type:'', sitemap_status:'not_included', indexing_status:'not_submitted' });
    await onRefresh();
    setSaving(false);
  };

  const updateStatus = async (log, field, value) => {
    const update = { [field]: value };
    if (field === 'indexing_status' && value === 'submitted') update.last_submitted_at = new Date().toISOString();
    update.last_checked_at = new Date().toISOString();
    await base44.entities.SEOIndexLog.update(log.id, update);
    await onRefresh();
  };

  const filtered = seoLogs.filter(l =>
    (filterType==='all' || l.page_type===filterType) &&
    (filterStatus==='all' || l.indexing_status===filterStatus) &&
    (!search || l.page_url?.toLowerCase().includes(search.toLowerCase()))
  );

  const stats = {
    total: seoLogs.length,
    indexed: seoLogs.filter(l=>l.indexing_status==='indexed').length,
    submitted: seoLogs.filter(l=>l.indexing_status==='submitted').length,
    not_submitted: seoLogs.filter(l=>l.indexing_status==='not_submitted').length,
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {label:'Total Pages', value:stats.total, color:'text-slate-700'},
          {label:'Indexed', value:stats.indexed, color:'text-green-600'},
          {label:'Submitted', value:stats.submitted, color:'text-blue-600'},
          {label:'Not Submitted', value:stats.not_submitted, color:'text-slate-400'},
        ].map(s=>(
          <Card key={s.label}><CardContent className="p-4"><p className={`text-2xl font-bold ${s.color}`}>{s.value}</p><p className="text-xs text-slate-500">{s.label}</p></CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Add Page to Tracker</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-52"><Label className="text-xs">Page URL *</Label><Input placeholder="/probate/new-jersey" value={form.page_url} onChange={e=>set('page_url',e.target.value)} /></div>
            <div><Label className="text-xs">Page Type *</Label>
              <Select value={form.page_type} onValueChange={v=>set('page_type',v)}>
                <SelectTrigger className="w-44"><SelectValue placeholder="Type..." /></SelectTrigger>
                <SelectContent>{PAGE_TYPES.map(t=><SelectItem key={t} value={t}>{t.replace(/_/g,' ')}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={saveLog} disabled={saving||!form.page_url||!form.page_type} className="bg-slate-800 hover:bg-slate-900 gap-2">
              {saving?<Loader2 className="w-4 h-4 animate-spin"/>:<Plus className="w-4 h-4"/>} Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3 flex-wrap">
        <Input className="w-64" placeholder="Search URL..." value={search} onChange={e=>setSearch(e.target.value)} />
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Filter type" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Types</SelectItem>{PAGE_TYPES.map(t=><SelectItem key={t} value={t}>{t.replace(/_/g,' ')}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Index status" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Status</SelectItem>{INDEX_STATUS.map(s=><SelectItem key={s} value={s}>{s.replace(/_/g,' ')}</SelectItem>)}</SelectContent>
        </Select>
        <span className="text-sm text-slate-500 self-center">{filtered.length} pages</span>
      </div>

      <div className="space-y-2">
        {filtered.map(log => (
          <div key={log.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <a href={log.page_url} target="_blank" rel="noopener noreferrer" className="font-mono text-sm text-slate-700 hover:underline flex items-center gap-1">
                  {log.page_url}<ExternalLink className="w-3 h-3"/>
                </a>
                <Badge className="bg-slate-100 text-slate-600 text-xs">{log.page_type?.replace(/_/g,' ')}</Badge>
              </div>
              <div className="flex gap-2 mt-1 flex-wrap">
                <Badge className={`text-xs ${sitemapColor[log.sitemap_status]}`}>Sitemap: {log.sitemap_status?.replace(/_/g,' ')}</Badge>
                <Badge className={`text-xs ${indexColor[log.indexing_status]}`}>{log.indexing_status?.replace(/_/g,' ')}</Badge>
                {log.last_submitted_at && <span className="text-xs text-slate-400">Submitted: {new Date(log.last_submitted_at).toLocaleDateString()}</span>}
              </div>
            </div>
            <div className="flex gap-2 flex-wrap shrink-0">
              <Select value={log.sitemap_status} onValueChange={v=>updateStatus(log,'sitemap_status',v)}>
                <SelectTrigger className="w-36 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{SITEMAP_STATUS.map(s=><SelectItem key={s} value={s}>{s.replace(/_/g,' ')}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={log.indexing_status} onValueChange={v=>updateStatus(log,'indexing_status',v)}>
                <SelectTrigger className="w-36 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{INDEX_STATUS.map(s=><SelectItem key={s} value={s}>{s.replace(/_/g,' ')}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        ))}
        {filtered.length===0 && <div className="text-center py-10 text-slate-500"><TrendingUp className="w-10 h-10 mx-auto mb-3 text-slate-300"/><p>No pages tracked yet.</p></div>}
      </div>
    </div>
  );
}