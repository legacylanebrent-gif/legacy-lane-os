import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Zap, CheckCircle2, XCircle, Loader2, BarChart3, Video } from 'lucide-react';

const REPORT_TYPES = ['most_valuable_items','unusual_estate_sale_finds','vintage_items_of_the_week','furniture_value_report','collectibles_report','jewelry_and_silver_report'];
const STATUS_COLORS = { draft: 'bg-yellow-100 text-yellow-800', review: 'bg-blue-100 text-blue-800', published: 'bg-green-100 text-green-800' };

export default function SEAdminWeeklyReports({ reports, onRefresh }) {
  const [genForm, setGenForm] = useState({ week_start:'', week_end:'', report_type:'' });
  const [generating, setGenerating] = useState(false);
  const [generatingScript, setGeneratingScript] = useState({});

  const generateReport = async () => {
    if (!genForm.week_start || !genForm.report_type) return;
    setGenerating(true);
    await base44.functions.invoke('generateWeeklyMarketReport', { ...genForm, save_to_db: true });
    await onRefresh();
    setGenerating(false);
  };

  const generateScript = async (report) => {
    setGeneratingScript(p=>({...p,[report.id]:true}));
    await base44.functions.invoke('generateYoutubeRecapScript', { weekly_market_report_id: report.id });
    await onRefresh();
    setGeneratingScript(p=>({...p,[report.id]:false}));
  };

  const togglePublish = async (r) => {
    await base44.entities.WeeklyMarketReport.update(r.id, { status: r.status==='published'?'draft':'published' });
    await onRefresh();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Generate Weekly Report</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-end">
            <div><Label className="text-xs">Week Start *</Label><Input type="date" className="w-44" value={genForm.week_start} onChange={e=>setGenForm(p=>({...p,week_start:e.target.value}))} /></div>
            <div><Label className="text-xs">Week End</Label><Input type="date" className="w-44" value={genForm.week_end} onChange={e=>setGenForm(p=>({...p,week_end:e.target.value}))} /></div>
            <div><Label className="text-xs">Report Type *</Label>
              <Select value={genForm.report_type} onValueChange={v=>setGenForm(p=>({...p,report_type:v}))}>
                <SelectTrigger className="w-56"><SelectValue placeholder="Type..." /></SelectTrigger>
                <SelectContent>{REPORT_TYPES.map(t=><SelectItem key={t} value={t}>{t.replace(/_/g,' ')}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={generateReport} disabled={generating||!genForm.week_start||!genForm.report_type} className="bg-amber-600 hover:bg-amber-700 gap-2">
              {generating?<Loader2 className="w-4 h-4 animate-spin"/>:<Zap className="w-4 h-4"/>} Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {reports.map(r => (
          <Card key={r.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-900">{r.report_title}</p>
                    <Badge className={STATUS_COLORS[r.status]}>{r.status}</Badge>
                    <Badge className="bg-slate-100 text-slate-600 text-xs">{r.report_type?.replace(/_/g,' ')}</Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{r.week_start} – {r.week_end} · {r.selected_items_json?.length||0} items</p>
                  {r.video_script && <p className="text-xs text-purple-600 mt-1 flex items-center gap-1"><Video className="w-3 h-3"/> YouTube script generated</p>}
                </div>
                <div className="flex gap-2 shrink-0 flex-wrap justify-end">
                  {!r.video_script && (
                    <Button variant="outline" size="sm" onClick={()=>generateScript(r)} disabled={!!generatingScript[r.id]} className="gap-1 text-xs">
                      {generatingScript[r.id]?<Loader2 className="w-3 h-3 animate-spin"/>:<Video className="w-3 h-3"/>} YouTube Script
                    </Button>
                  )}
                  <Button size="sm" onClick={()=>togglePublish(r)} className={r.status==='published'?'bg-slate-500 hover:bg-slate-600 text-white':'bg-green-600 hover:bg-green-700 text-white'}>
                    {r.status==='published'?<><XCircle className="w-3 h-3 mr-1"/>Unpublish</>:<><CheckCircle2 className="w-3 h-3 mr-1"/>Publish</>}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {reports.length===0 && <div className="text-center py-10 text-slate-500"><BarChart3 className="w-10 h-10 mx-auto mb-3 text-slate-300"/><p>No reports yet.</p></div>}
      </div>
    </div>
  );
}