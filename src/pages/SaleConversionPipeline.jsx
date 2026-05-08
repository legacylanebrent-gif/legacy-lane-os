import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Plus, MapPin, Phone, Mail, Calendar, DollarSign, Sparkles,
  ChevronRight, CheckCircle2, Circle, Clock, Loader2, ArrowRight,
  User, FileText, AlertCircle, X, Edit2, CalendarDays, TrendingUp
} from 'lucide-react';
import { format, addDays, parseISO, isToday, isTomorrow, isPast } from 'date-fns';

// ─── Stage config ────────────────────────────────────────────────────────────
const STAGES = [
  { key: 'new_lead',               label: 'New Lead',            color: 'bg-slate-100 text-slate-700',   dot: 'bg-slate-400',   border: 'border-slate-200' },
  { key: 'consultation_scheduled', label: 'Consultation',        color: 'bg-blue-100 text-blue-700',     dot: 'bg-blue-500',    border: 'border-blue-200' },
  { key: 'contract_signed',        label: 'Contract Signed',     color: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500',  border: 'border-purple-200' },
  { key: 'setup_in_progress',      label: 'Setup / Staging',     color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500',  border: 'border-orange-200' },
  { key: 'sale_live',              label: 'Sale Live',           color: 'bg-green-100 text-green-700',   dot: 'bg-green-500',   border: 'border-green-200' },
  { key: 'completed',              label: 'Completed',           color: 'bg-cyan-100 text-cyan-700',     dot: 'bg-cyan-500',    border: 'border-cyan-200' },
  { key: 'lost',                   label: 'Lost / Declined',     color: 'bg-red-100 text-red-700',       dot: 'bg-red-400',     border: 'border-red-200' },
];

const STAGE_MAP = Object.fromEntries(STAGES.map(s => [s.key, s]));

const TASK_CATEGORIES = [
  { key: 'Pre-Consultation', color: 'bg-slate-100 text-slate-700' },
  { key: 'Consultation', color: 'bg-blue-100 text-blue-700' },
  { key: 'Contract', color: 'bg-purple-100 text-purple-700' },
  { key: 'Pricing & Research', color: 'bg-amber-100 text-amber-700' },
  { key: 'Marketing', color: 'bg-pink-100 text-pink-700' },
  { key: 'Logistics & Setup', color: 'bg-orange-100 text-orange-700' },
  { key: 'Sale Day', color: 'bg-green-100 text-green-700' },
  { key: 'Post-Sale', color: 'bg-cyan-100 text-cyan-700' },
];
const CAT_MAP = Object.fromEntries(TASK_CATEGORIES.map(c => [c.key, c.color]));

// ─── Helpers ─────────────────────────────────────────────────────────────────
const emptyForm = () => ({
  client_name: '', client_email: '', client_phone: '',
  property_address: '', property_city: '', property_state: '',
  situation: 'standard', estimated_value: '', commission_rate: 35,
  consultation_date: '', estimated_sale_start_date: '', estimated_sale_end_date: '',
  notes: '', stage: 'new_lead'
});

function dateLabel(dateStr) {
  if (!dateStr) return null;
  const d = parseISO(dateStr);
  if (isToday(d)) return 'Today';
  if (isTomorrow(d)) return 'Tomorrow';
  if (isPast(d)) return '⚠ Past due';
  return format(d, 'MMM d');
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SaleConversionPipeline() {
  const [user, setUser] = useState(null);
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('kanban');

  // Modals
  const [showNewDeal, setShowNewDeal] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  // Form state
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  // AI timeline
  const [generatingTimeline, setGeneratingTimeline] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const u = await base44.auth.me();
      setUser(u);
      const data = await base44.entities.SaleConversionPipeline.filter({ operator_id: u.id }, '-created_date');
      setDeals(data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  // ─── CRUD ──────────────────────────────────────────────────────────────────
  const handleCreateDeal = async () => {
    if (!form.client_name) return alert('Client name is required');
    setSaving(true);
    try {
      await base44.entities.SaleConversionPipeline.create({
        ...form,
        operator_id: user.id,
        estimated_value: form.estimated_value ? parseFloat(form.estimated_value) : null,
        commission_rate: parseFloat(form.commission_rate) || 35,
      });
      setShowNewDeal(false);
      setForm(emptyForm());
      await loadData();
    } catch (e) { alert('Failed to create deal'); }
    finally { setSaving(false); }
  };

  const handleUpdateStage = async (dealId, newStage) => {
    await base44.entities.SaleConversionPipeline.update(dealId, { stage: newStage });
    setDeals(prev => prev.map(d => d.id === dealId ? { ...d, stage: newStage } : d));
    if (selectedDeal?.id === dealId) setSelectedDeal(prev => ({ ...prev, stage: newStage }));
  };

  const handleSaveDetail = async () => {
    setSaving(true);
    try {
      await base44.entities.SaleConversionPipeline.update(selectedDeal.id, selectedDeal);
      await loadData();
    } catch (e) { alert('Failed to save'); }
    finally { setSaving(false); }
  };

  const handleUpdateTask = async (taskIdx, field, value) => {
    const updated = [...(selectedDeal.ai_timeline_tasks || [])];
    updated[taskIdx] = { ...updated[taskIdx], [field]: value };
    const newDeal = { ...selectedDeal, ai_timeline_tasks: updated };
    setSelectedDeal(newDeal);
    await base44.entities.SaleConversionPipeline.update(selectedDeal.id, { ai_timeline_tasks: updated });
    setDeals(prev => prev.map(d => d.id === selectedDeal.id ? newDeal : d));
  };

  // ─── AI Timeline ───────────────────────────────────────────────────────────
  const handleGenerateTimeline = async () => {
    if (!selectedDeal.estimated_sale_start_date) {
      return alert('Please set an estimated sale start date first.');
    }
    setGeneratingTimeline(true);
    try {
      const saleStart = selectedDeal.estimated_sale_start_date;
      const saleEnd = selectedDeal.estimated_sale_end_date || saleStart;
      const today = format(new Date(), 'yyyy-MM-dd');
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert estate sale operations manager. Generate a detailed, realistic task timeline for an estate sale with the following details:

Client: ${selectedDeal.client_name}
Property: ${selectedDeal.property_address || ''}, ${selectedDeal.property_city || ''}, ${selectedDeal.property_state || ''}
Situation: ${selectedDeal.situation || 'standard'}
Estimated Value: ${selectedDeal.estimated_value ? '$' + selectedDeal.estimated_value.toLocaleString() : 'Unknown'}
Commission Rate: ${selectedDeal.commission_rate || 35}%
Consultation Date: ${selectedDeal.consultation_date ? selectedDeal.consultation_date.split('T')[0] : 'Not yet set'}
Contract Signed: ${selectedDeal.contract_signed_date || 'Not yet signed'}
Sale Start Date: ${saleStart}
Sale End Date: ${saleEnd}
Today: ${today}

Generate a comprehensive task list covering ALL stages from initial outreach through post-sale payment. For each task include:
- task: short task name
- description: 1-2 sentence explanation
- category: one of [Pre-Consultation, Consultation, Contract, Pricing & Research, Marketing, Logistics & Setup, Sale Day, Post-Sale]
- days_before_sale: integer (negative = days AFTER sale end, 0 = sale day, positive = days before; e.g. 21 = 3 weeks before sale)
- due_date: calculated ISO date string (YYYY-MM-DD) based on sale start date of ${saleStart}
- priority: one of [high, medium, low]

Include 18-24 tasks covering every stage. Order them chronologically by due_date.`,
        response_json_schema: {
          type: 'object',
          properties: {
            tasks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  task: { type: 'string' },
                  description: { type: 'string' },
                  category: { type: 'string' },
                  days_before_sale: { type: 'number' },
                  due_date: { type: 'string' },
                  priority: { type: 'string' }
                }
              }
            }
          }
        }
      });

      const tasks = (res?.tasks || []).map(t => ({ ...t, status: 'not_started' }));
      const updated = { ...selectedDeal, ai_timeline_tasks: tasks, ai_timeline_generated: true };
      setSelectedDeal(updated);
      await base44.entities.SaleConversionPipeline.update(selectedDeal.id, {
        ai_timeline_tasks: tasks,
        ai_timeline_generated: true
      });
      setDeals(prev => prev.map(d => d.id === selectedDeal.id ? { ...d, ai_timeline_tasks: tasks, ai_timeline_generated: true } : d));
    } catch (e) {
      console.error(e);
      alert('AI generation failed. Please try again.');
    } finally {
      setGeneratingTimeline(false);
    }
  };

  // ─── Calendar data ─────────────────────────────────────────────────────────
  const calendarEvents = [];
  deals.forEach(d => {
    if (d.consultation_date) calendarEvents.push({ type: 'consultation', deal: d, date: d.consultation_date.split('T')[0], label: `📋 Consultation: ${d.client_name}`, color: 'bg-blue-100 border-blue-300 text-blue-800' });
    if (d.estimated_sale_start_date) calendarEvents.push({ type: 'sale_start', deal: d, date: d.estimated_sale_start_date, label: `🏡 Sale Start: ${d.client_name}`, color: 'bg-green-100 border-green-300 text-green-800' });
    if (d.estimated_sale_end_date && d.estimated_sale_end_date !== d.estimated_sale_start_date)
      calendarEvents.push({ type: 'sale_end', deal: d, date: d.estimated_sale_end_date, label: `🔚 Sale End: ${d.client_name}`, color: 'bg-orange-100 border-orange-300 text-orange-800' });
  });

  // Build a 6-week forward calendar
  const today = new Date();
  today.setHours(0,0,0,0);
  const calDays = Array.from({ length: 42 }, (_, i) => {
    const d = addDays(today, i - 7);
    const ds = format(d, 'yyyy-MM-dd');
    return { date: d, dateStr: ds, events: calendarEvents.filter(e => e.date === ds) };
  });

  // ─── Stage funnel counts ───────────────────────────────────────────────────
  const stageCounts = STAGES.map(s => ({ ...s, count: deals.filter(d => d.stage === s.key).length, deals: deals.filter(d => d.stage === s.key) }));
  const activeCount = deals.filter(d => !['completed','lost'].includes(d.stage)).length;

  if (loading) return <div className="p-8 animate-pulse"><div className="h-8 bg-slate-200 rounded w-1/3 mb-4"/><div className="h-64 bg-slate-200 rounded"/></div>;

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-serif font-bold text-slate-900">Sale Conversion Pipeline</h1>
          <p className="text-slate-500 text-sm mt-0.5">{activeCount} active deals · {deals.filter(d=>d.stage==='completed').length} completed</p>
        </div>
        <Button onClick={() => setShowNewDeal(true)} className="bg-orange-600 hover:bg-orange-700 gap-2 self-start sm:self-auto">
          <Plus className="w-4 h-4" /> New Deal
        </Button>
      </div>

      {/* ── Funnel Stats ── */}
      <div className="flex flex-wrap gap-2">
        {STAGES.filter(s => s.key !== 'lost').map((s, i) => {
          const cnt = stageCounts.find(sc => sc.key === s.key)?.count || 0;
          return (
            <div key={s.key} className="flex items-center gap-1">
              <div className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${s.color} ${s.border}`}>
                <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${s.dot}`}></span>
                {s.label} <span className="ml-1 font-bold">{cnt}</span>
              </div>
              {i < 5 && <ChevronRight className="w-3 h-3 text-slate-300" />}
            </div>
          );
        })}
      </div>

      {/* ── Tabs ── */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-slate-100">
          <TabsTrigger value="kanban">Pipeline Board</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="list">List View</TabsTrigger>
        </TabsList>

        {/* ── KANBAN ── */}
        <TabsContent value="kanban" className="mt-4">
          <div className="flex gap-4 overflow-x-auto pb-4">
            {STAGES.filter(s => s.key !== 'lost').map(stage => {
              const stageDeals = deals.filter(d => d.stage === stage.key);
              return (
                <div key={stage.key} className="flex-shrink-0 w-64">
                  <div className={`px-3 py-2 rounded-t-lg border-b-2 ${stage.color} ${stage.border} flex items-center justify-between`}>
                    <span className="font-semibold text-sm">{stage.label}</span>
                    <Badge variant="outline" className="text-xs">{stageDeals.length}</Badge>
                  </div>
                  <div className="bg-slate-50 rounded-b-lg border border-t-0 border-slate-200 min-h-32 p-2 space-y-2">
                    {stageDeals.map(deal => (
                      <DealCard
                        key={deal.id}
                        deal={deal}
                        onOpen={() => { setSelectedDeal({...deal}); setShowDetail(true); }}
                        onAdvance={() => {
                          const idx = STAGES.findIndex(s => s.key === deal.stage);
                          if (idx < STAGES.length - 2) handleUpdateStage(deal.id, STAGES[idx+1].key);
                        }}
                      />
                    ))}
                    {stageDeals.length === 0 && <p className="text-xs text-slate-400 text-center py-4">No deals</p>}
                  </div>
                </div>
              );
            })}
            {/* Lost column */}
            <div className="flex-shrink-0 w-48">
              <div className="px-3 py-2 rounded-t-lg bg-red-50 text-red-600 text-sm font-semibold border-b-2 border-red-200 flex items-center justify-between">
                Lost / Declined <Badge variant="outline" className="text-xs">{deals.filter(d=>d.stage==='lost').length}</Badge>
              </div>
              <div className="bg-red-50/50 rounded-b-lg border border-t-0 border-red-100 min-h-16 p-2 space-y-2">
                {deals.filter(d=>d.stage==='lost').map(deal => (
                  <button key={deal.id} onClick={() => { setSelectedDeal({...deal}); setShowDetail(true); }}
                    className="w-full text-left text-xs p-2 bg-white border border-red-100 rounded-lg text-slate-500 hover:bg-red-50">
                    {deal.client_name}<br/><span className="text-slate-400">{deal.property_city}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── CALENDAR ── */}
        <TabsContent value="calendar" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="w-4 h-4 text-orange-500" />
                Upcoming Consultations & Sale Dates
                <span className="ml-auto text-xs font-normal text-slate-400">6-week view (±1 week)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-lg overflow-hidden text-xs">
                {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                  <div key={d} className="bg-slate-50 text-center font-semibold text-slate-500 py-1.5">{d}</div>
                ))}
                {calDays.map(({ date, dateStr, events }) => {
                  const isCurrentMonth = true;
                  const todayFlag = dateStr === format(new Date(), 'yyyy-MM-dd');
                  return (
                    <div key={dateStr} className={`bg-white min-h-16 p-1.5 ${todayFlag ? 'bg-orange-50' : ''}`}>
                      <div className={`text-xs font-semibold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${todayFlag ? 'bg-orange-500 text-white' : 'text-slate-600'}`}>
                        {format(date, 'd')}
                      </div>
                      <div className="space-y-0.5">
                        {events.map((ev, i) => (
                          <button
                            key={i}
                            onClick={() => { setSelectedDeal({...ev.deal}); setShowDetail(true); }}
                            className={`w-full text-left rounded px-1 py-0.5 border text-[10px] leading-tight truncate ${ev.color}`}
                          >
                            {ev.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              {calendarEvents.length === 0 && (
                <div className="text-center text-slate-400 py-8 text-sm">
                  No calendar events yet. Add consultation or sale dates to your deals.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── LIST ── */}
        <TabsContent value="list" className="mt-4">
          <div className="space-y-2">
            {deals.map(deal => {
              const stage = STAGE_MAP[deal.stage];
              const taskDone = (deal.ai_timeline_tasks||[]).filter(t=>t.status==='completed').length;
              const taskTotal = (deal.ai_timeline_tasks||[]).length;
              return (
                <div key={deal.id} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg hover:shadow-sm cursor-pointer"
                  onClick={() => { setSelectedDeal({...deal}); setShowDetail(true); }}>
                  <div className={`w-2 h-10 rounded-full flex-shrink-0 ${stage.dot}`}></div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900 text-sm">{deal.client_name}</div>
                    <div className="text-xs text-slate-500 truncate">{deal.property_address}{deal.property_city && `, ${deal.property_city}`}</div>
                  </div>
                  <Badge className={`${stage.color} text-xs hidden sm:flex`}>{stage.label}</Badge>
                  {deal.consultation_date && (
                    <div className="text-xs text-blue-600 hidden md:block flex-shrink-0">
                      <Calendar className="w-3 h-3 inline mr-0.5"/>
                      {format(parseISO(deal.consultation_date), 'MMM d')}
                    </div>
                  )}
                  {deal.estimated_value && (
                    <div className="text-xs text-green-600 font-semibold flex-shrink-0">
                      ${Number(deal.estimated_value).toLocaleString()}
                    </div>
                  )}
                  {taskTotal > 0 && (
                    <div className="text-xs text-slate-400 flex-shrink-0">{taskDone}/{taskTotal} tasks</div>
                  )}
                </div>
              );
            })}
            {deals.length === 0 && (
              <div className="text-center py-16 text-slate-400">
                <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30"/>
                No deals yet. Click "New Deal" to get started.
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ── NEW DEAL MODAL ── */}
      <Dialog open={showNewDeal} onOpenChange={setShowNewDeal}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add New Deal</DialogTitle></DialogHeader>
          <NewDealForm form={form} setForm={setForm} onSave={handleCreateDeal} onCancel={() => setShowNewDeal(false)} saving={saving} />
        </DialogContent>
      </Dialog>

      {/* ── DEAL DETAIL MODAL ── */}
      {selectedDeal && (
        <Dialog open={showDetail} onOpenChange={setShowDetail}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DealDetail
              deal={selectedDeal}
              setDeal={setSelectedDeal}
              onSave={handleSaveDetail}
              saving={saving}
              onStageChange={(s) => handleUpdateStage(selectedDeal.id, s)}
              onGenerateTimeline={handleGenerateTimeline}
              generatingTimeline={generatingTimeline}
              onUpdateTask={handleUpdateTask}
              editingTaskId={editingTaskId}
              setEditingTaskId={setEditingTaskId}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ─── Deal Card (Kanban) ───────────────────────────────────────────────────────
function DealCard({ deal, onOpen, onAdvance }) {
  const taskDone = (deal.ai_timeline_tasks||[]).filter(t=>t.status==='completed').length;
  const taskTotal = (deal.ai_timeline_tasks||[]).length;
  const pct = taskTotal > 0 ? Math.round(taskDone/taskTotal*100) : 0;
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={onOpen}>
      <div className="font-semibold text-slate-900 text-sm mb-1 leading-tight">{deal.client_name}</div>
      {deal.property_city && <div className="text-xs text-slate-400 flex items-center gap-1 mb-2"><MapPin className="w-3 h-3"/>{deal.property_city}, {deal.property_state}</div>}
      {deal.consultation_date && (
        <div className="text-xs text-blue-600 flex items-center gap-1 mb-1">
          <Calendar className="w-3 h-3"/>Consult: {format(parseISO(deal.consultation_date), 'MMM d, h:mm a')}
        </div>
      )}
      {deal.estimated_sale_start_date && (
        <div className="text-xs text-green-600 flex items-center gap-1 mb-2">
          <CalendarDays className="w-3 h-3"/>Sale: {format(parseISO(deal.estimated_sale_start_date), 'MMM d')}
          {deal.estimated_sale_end_date && deal.estimated_sale_end_date !== deal.estimated_sale_start_date && ` – ${format(parseISO(deal.estimated_sale_end_date), 'MMM d')}`}
        </div>
      )}
      {deal.estimated_value && <div className="text-xs text-green-700 font-semibold mb-2">${Number(deal.estimated_value).toLocaleString()} est.</div>}
      {taskTotal > 0 && (
        <div className="mt-2">
          <div className="flex justify-between text-[10px] text-slate-400 mb-0.5"><span>{taskDone}/{taskTotal} tasks</span><span>{pct}%</span></div>
          <div className="h-1 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-cyan-500 rounded-full" style={{width:`${pct}%`}}/></div>
        </div>
      )}
      <Button size="sm" variant="outline" className="w-full mt-2 h-6 text-xs gap-1" onClick={e => { e.stopPropagation(); onAdvance(); }}>
        <ArrowRight className="w-3 h-3"/> Advance Stage
      </Button>
    </div>
  );
}

// ─── New Deal Form ────────────────────────────────────────────────────────────
function NewDealForm({ form, setForm, onSave, onCancel, saving }) {
  const f = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div><Label>Client Name *</Label><Input value={form.client_name} onChange={e=>f('client_name',e.target.value)} placeholder="Jane Smith"/></div>
        <div><Label>Phone</Label><Input value={form.client_phone} onChange={e=>f('client_phone',e.target.value)} placeholder="(555) 123-4567"/></div>
        <div className="sm:col-span-2"><Label>Email</Label><Input type="email" value={form.client_email} onChange={e=>f('client_email',e.target.value)} placeholder="client@email.com"/></div>
        <div className="sm:col-span-2"><Label>Property Address</Label><Input value={form.property_address} onChange={e=>f('property_address',e.target.value)} placeholder="123 Main St"/></div>
        <div><Label>City</Label><Input value={form.property_city} onChange={e=>f('property_city',e.target.value)} placeholder="Springfield"/></div>
        <div><Label>State</Label><Input value={form.property_state} onChange={e=>f('property_state',e.target.value)} placeholder="NJ" maxLength={2}/></div>
        <div>
          <Label>Situation</Label>
          <Select value={form.situation} onValueChange={v=>f('situation',v)}>
            <SelectTrigger><SelectValue/></SelectTrigger>
            <SelectContent>
              {['standard','probate','divorce','downsizing','relocation','foreclosure'].map(s=><SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label>Estimated Value ($)</Label><Input type="number" value={form.estimated_value} onChange={e=>f('estimated_value',e.target.value)} placeholder="25000"/></div>
        <div><Label>Consultation Date/Time</Label><Input type="datetime-local" value={form.consultation_date} onChange={e=>f('consultation_date',e.target.value)}/></div>
        <div><Label>Est. Sale Start Date</Label><Input type="date" value={form.estimated_sale_start_date} onChange={e=>f('estimated_sale_start_date',e.target.value)}/></div>
        <div><Label>Est. Sale End Date</Label><Input type="date" value={form.estimated_sale_end_date} onChange={e=>f('estimated_sale_end_date',e.target.value)}/></div>
        <div><Label>Commission Rate (%)</Label><Input type="number" value={form.commission_rate} onChange={e=>f('commission_rate',e.target.value)} placeholder="35"/></div>
      </div>
      <div><Label>Notes</Label><Textarea value={form.notes} onChange={e=>f('notes',e.target.value)} rows={3} placeholder="Initial notes about the client or property..."/></div>
      <div className="flex gap-2 justify-end pt-2 border-t">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={onSave} disabled={saving} className="bg-orange-600 hover:bg-orange-700">
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin"/>Saving...</> : 'Create Deal'}
        </Button>
      </div>
    </div>
  );
}

// ─── Deal Detail Modal ────────────────────────────────────────────────────────
function DealDetail({ deal, setDeal, onSave, saving, onStageChange, onGenerateTimeline, generatingTimeline, onUpdateTask, editingTaskId, setEditingTaskId }) {
  const [detailTab, setDetailTab] = useState('overview');
  const stage = STAGE_MAP[deal.stage];
  const f = (k, v) => setDeal(prev => ({ ...prev, [k]: v }));

  const tasks = deal.ai_timeline_tasks || [];
  const tasksByCategory = tasks.reduce((acc, t, i) => {
    const cat = t.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push({ ...t, _idx: i });
    return acc;
  }, {});
  const taskDone = tasks.filter(t=>t.status==='completed').length;
  const pct = tasks.length > 0 ? Math.round(taskDone/tasks.length*100) : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-slate-900">{deal.client_name}</h2>
          {deal.property_address && <p className="text-sm text-slate-500 mt-0.5">{deal.property_address}{deal.property_city && `, ${deal.property_city}, ${deal.property_state}`}</p>}
        </div>
        <Badge className={`${stage.color} text-sm px-3 py-1 flex-shrink-0`}>{stage.label}</Badge>
      </div>

      {/* Stage mover */}
      <div className="flex flex-wrap gap-1.5">
        {STAGES.map(s => (
          <button key={s.key} onClick={() => onStageChange(s.key)}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${deal.stage === s.key ? `${s.color} ${s.border} ring-2 ring-offset-1 ring-orange-400` : `${s.color} ${s.border} opacity-60 hover:opacity-100`}`}>
            {s.label}
          </button>
        ))}
      </div>

      <Tabs value={detailTab} onValueChange={setDetailTab}>
        <TabsList className="bg-slate-100">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="calendar">Dates</TabsTrigger>
          <TabsTrigger value="timeline">
            AI Timeline {tasks.length > 0 && <span className="ml-1 bg-orange-100 text-orange-700 text-[10px] px-1.5 rounded-full">{taskDone}/{tasks.length}</span>}
          </TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="mt-3 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            {deal.client_email && <div className="flex items-center gap-2 text-sm"><Mail className="w-4 h-4 text-slate-400"/><a href={`mailto:${deal.client_email}`} className="text-cyan-600">{deal.client_email}</a></div>}
            {deal.client_phone && <div className="flex items-center gap-2 text-sm"><Phone className="w-4 h-4 text-slate-400"/><a href={`tel:${deal.client_phone}`} className="text-cyan-600">{deal.client_phone}</a></div>}
            {deal.estimated_value && <div className="flex items-center gap-2 text-sm"><DollarSign className="w-4 h-4 text-green-500"/><span className="font-semibold text-green-700">${Number(deal.estimated_value).toLocaleString()} estimated · {deal.commission_rate}% comm.</span></div>}
            {deal.situation && <div className="flex items-center gap-2 text-sm"><User className="w-4 h-4 text-slate-400"/><span className="capitalize">{deal.situation}</span></div>}
          </div>
          <div>
            <Label className="text-sm">Notes</Label>
            <Textarea value={deal.notes||''} onChange={e=>f('notes',e.target.value)} rows={4} className="mt-1"/>
          </div>
          <div>
            <Label className="text-sm">Consultation Notes</Label>
            <Textarea value={deal.consultation_notes||''} onChange={e=>f('consultation_notes',e.target.value)} rows={3} placeholder="Notes from the in-person consultation..." className="mt-1"/>
          </div>
          <Button onClick={onSave} disabled={saving} className="bg-orange-600 hover:bg-orange-700 gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : null} Save Changes
          </Button>
        </TabsContent>

        {/* CALENDAR / DATES */}
        <TabsContent value="calendar" className="mt-3 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-blue-500"/> Consultation Date & Time</Label>
              <Input type="datetime-local" value={deal.consultation_date||''} onChange={e=>f('consultation_date',e.target.value)} className="mt-1"/>
              <p className="text-xs text-slate-400 mt-1">In-person visit with the client</p>
            </div>
            <div>
              <Label className="flex items-center gap-1.5"><FileText className="w-4 h-4 text-purple-500"/> Contract Signed Date</Label>
              <Input type="date" value={deal.contract_signed_date||''} onChange={e=>f('contract_signed_date',e.target.value)} className="mt-1"/>
            </div>
            <div>
              <Label className="flex items-center gap-1.5"><CalendarDays className="w-4 h-4 text-green-500"/> Estimated Sale Start Date</Label>
              <Input type="date" value={deal.estimated_sale_start_date||''} onChange={e=>f('estimated_sale_start_date',e.target.value)} className="mt-1"/>
              <p className="text-xs text-slate-400 mt-1">Used for AI timeline calculation</p>
            </div>
            <div>
              <Label className="flex items-center gap-1.5"><CalendarDays className="w-4 h-4 text-orange-500"/> Estimated Sale End Date</Label>
              <Input type="date" value={deal.estimated_sale_end_date||''} onChange={e=>f('estimated_sale_end_date',e.target.value)} className="mt-1"/>
            </div>
          </div>
          {deal.consultation_date && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              <strong>Consultation:</strong> {format(parseISO(deal.consultation_date), "EEEE, MMMM d, yyyy 'at' h:mm a")}
            </div>
          )}
          {deal.estimated_sale_start_date && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
              <strong>Sale Window:</strong> {format(parseISO(deal.estimated_sale_start_date), 'MMM d')}
              {deal.estimated_sale_end_date ? ` – ${format(parseISO(deal.estimated_sale_end_date), 'MMMM d, yyyy')}` : ''}
            </div>
          )}
          <Button onClick={onSave} disabled={saving} className="bg-orange-600 hover:bg-orange-700 gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : null} Save Dates
          </Button>
        </TabsContent>

        {/* AI TIMELINE */}
        <TabsContent value="timeline" className="mt-3 space-y-4">
          {/* Progress bar */}
          {tasks.length > 0 && (
            <div>
              <div className="flex justify-between text-sm text-slate-600 mb-1"><span>{taskDone} of {tasks.length} tasks complete</span><span className="font-bold">{pct}%</span></div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-cyan-500 to-green-500 rounded-full transition-all" style={{width:`${pct}%`}}/></div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">
                {tasks.length === 0
                  ? 'No timeline generated yet. Set a sale start date and click Generate.'
                  : `${tasks.length} tasks across ${Object.keys(tasksByCategory).length} stages`}
              </p>
              {!deal.estimated_sale_start_date && <p className="text-xs text-amber-600 mt-0.5">⚠ Set a sale start date on the Dates tab first</p>}
            </div>
            <Button
              onClick={onGenerateTimeline}
              disabled={generatingTimeline || !deal.estimated_sale_start_date}
              className="bg-purple-600 hover:bg-purple-700 gap-2 flex-shrink-0"
            >
              {generatingTimeline ? <Loader2 className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4"/>}
              {tasks.length > 0 ? 'Regenerate' : 'Generate AI Timeline'}
            </Button>
          </div>

          {/* Tasks grouped by category */}
          {Object.entries(tasksByCategory).map(([cat, catTasks]) => (
            <div key={cat}>
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold mb-2 ${CAT_MAP[cat] || 'bg-slate-100 text-slate-700'}`}>
                {cat}
              </div>
              <div className="space-y-1.5">
                {catTasks.map(task => (
                  <TaskRow
                    key={task._idx}
                    task={task}
                    onStatusChange={(s) => onUpdateTask(task._idx, 'status', s)}
                    editing={editingTaskId === task._idx}
                    onToggleEdit={() => setEditingTaskId(editingTaskId === task._idx ? null : task._idx)}
                  />
                ))}
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Task Row ─────────────────────────────────────────────────────────────────
function TaskRow({ task, onStatusChange, editing, onToggleEdit }) {
  const statusIcon = {
    completed: <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0"/>,
    in_progress: <Clock className="w-4 h-4 text-orange-500 flex-shrink-0"/>,
    not_started: <Circle className="w-4 h-4 text-slate-300 flex-shrink-0"/>,
  }[task.status] || <Circle className="w-4 h-4 text-slate-300 flex-shrink-0"/>;

  const overdue = task.due_date && isPast(parseISO(task.due_date)) && task.status !== 'completed';

  return (
    <div className={`flex items-start gap-2 p-2.5 rounded-lg border transition-colors ${task.status==='completed' ? 'bg-green-50 border-green-100' : overdue ? 'bg-red-50 border-red-100' : 'bg-white border-slate-100 hover:bg-slate-50'}`}>
      <button onClick={() => onStatusChange(task.status === 'completed' ? 'not_started' : task.status === 'not_started' ? 'in_progress' : 'completed')} className="mt-0.5">
        {statusIcon}
      </button>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium ${task.status==='completed' ? 'line-through text-slate-400' : 'text-slate-800'}`}>{task.task}</div>
        {editing && <p className="text-xs text-slate-500 mt-0.5">{task.description}</p>}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {task.due_date && (
          <span className={`text-xs px-1.5 py-0.5 rounded ${overdue ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>
            {dateLabel(task.due_date)}
          </span>
        )}
        {task.priority === 'high' && <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0"/>}
        <button onClick={onToggleEdit} className="text-slate-300 hover:text-slate-500">
          <Edit2 className="w-3.5 h-3.5"/>
        </button>
      </div>
    </div>
  );
}