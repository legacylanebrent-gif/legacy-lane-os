import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowLeft, CheckCircle2, Circle, Clock, Loader2,
  Sparkles, AlertTriangle, AlertOctagon, HelpCircle, Flag
} from 'lucide-react';
import { isOverdue, isDueSoon } from '@/components/saleops/saleDecisionModel';

// Chapter 1 P1 — the canonical SaleTasks surface, now PERSISTED (SaleTask entity) with
// accountability: assignee, due date, blocked state, priority, attention flag and
// completion audit. The three statuses are unchanged; the template gains one
// Chapter 6 P2 step (Sensitive Material Review) for new sales.

const DEFAULT_TASKS = [
  { name: 'Initial Client Meeting', description: 'Meet with client to discuss estate sale needs and timeline', category: 'Planning' },
  { name: 'Sign Contract', description: 'Review and sign estate sale agreement with client', category: 'Planning' },
  { name: 'Property Walkthrough', description: 'Conduct detailed walkthrough and inventory of items', category: 'Planning' },
  // Chapter 6 P2 — SENSITIVE MATERIAL REVIEW: one prep step, STOP / SEPARATE / ESCALATE.
  { name: 'Sensitive Material Review', description: 'STOP — before photographing or cataloging contents, separate documents, IDs, medications, financial information, private photos, and other sensitive material for operator/client review. Do not catalog or photograph sensitive material.', category: 'Preparation' },
  { name: 'Research & Pricing', description: 'Research item values and set pricing strategy', category: 'Preparation' },
  { name: 'Item Sorting & Organization', description: 'Sort, organize, and stage items for sale', category: 'Preparation' },
  { name: 'Photography & Listing', description: 'Take photos and create online listings', category: 'Marketing' },
  { name: 'Marketing & Advertising', description: 'Promote sale through various channels', category: 'Marketing' },
  { name: 'Signage & Directional Signs', description: 'Create and place directional signs', category: 'Marketing' },
  { name: 'Setup & Staging', description: 'Final staging and setup of sale space', category: 'Execution' },
  { name: 'Staff Coordination', description: 'Coordinate and brief sale day staff', category: 'Execution' },
  { name: 'Sale Day Operations', description: 'Manage sale day activities and transactions', category: 'Execution' },
  { name: 'Breakdown & Cleanup', description: 'Remove unsold items and clean property', category: 'Post-Sale' },
  { name: 'Donation Coordination', description: 'Arrange pickup/delivery of unsold items', category: 'Post-Sale' },
  { name: 'Final Accounting', description: 'Calculate totals and prepare financial report', category: 'Post-Sale' },
  { name: 'Payment to Client', description: 'Process and deliver payment to client', category: 'Post-Sale' }
];

export default function SaleTasks() {
  const navigate = useNavigate();
  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [generatingTasks, setGeneratingTasks] = useState(false);
  const [teamOptions, setTeamOptions] = useState([]);
  const [blockedTarget, setBlockedTarget] = useState(null);
  const [blockedReason, setBlockedReason] = useState('');
  // Chapter 8 P0-1 — non-blocking notices replace native alert() dialogs,
  // which froze the page (observed at mobile widths when opened without a saleId).
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadTasks = async (sale) => {
    let records = await base44.entities.SaleTask.filter({ sale_id: sale.id });
    if (!Array.isArray(records)) records = records.items || [];

    if (records.length === 0) {
      const seeded = await base44.entities.SaleTask.bulkCreate(
        DEFAULT_TASKS.map((t, idx) => ({
          ...t,
          sale_id: sale.id,
          operator_id: sale.operator_id,
          company_id: sale.company_id || '',
          sale_team_ids: sale.sale_team || [],
          status: 'not_started',
          priority: 'medium',
          sort_order: idx,
        }))
      );
      records = Array.isArray(seeded) ? seeded : (seeded.records || []);
    }
    records.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    setTasks(records);
  };

  const loadData = async () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const saleId = params.get('saleId');

      if (!saleId) { navigate(createPageUrl('MySales')); return; }

      const saleData = await base44.entities.EstateSale.filter({ id: saleId });
      if (saleData.length === 0) { navigate(createPageUrl('MySales')); return; }
      const sale = saleData[0];
      setSale(sale);

      await loadTasks(sale);

      // Assignee options: the operator + sale team (reuse existing identities only).
      let options = [{ id: 'unassigned', label: 'Unassigned' }];
      const me = await base44.auth.me().catch(() => null);
      if (me) options.push({ id: me.id, label: `${me.full_name || me.email} (You)` });
      try {
        if (sale.sale_team?.length) {
          const users = await base44.entities.User.filter({ id: { $in: sale.sale_team } });
          const list = Array.isArray(users) ? users : (users.items || []);
          list.forEach(u => {
            options.push({ id: u.id, label: u.full_name || u.email || 'Team member' });
          });
        }
      } catch (e) {
        // Non-admin operators may not be able to list users — keep plain team entries.
        (sale.sale_team || []).forEach(id => options.push({ id, label: 'Team member' }));
      }
      setTeamOptions(options);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const patchTask = async (taskId, patch) => {
    setTasks(prev => prev.map(t => (t.id === taskId ? { ...t, ...patch } : t)));
    try {
      await base44.entities.SaleTask.update(taskId, patch);
    } catch (e) {
      console.error(e);
      setNotice('Could not save the task change');
      if (sale) loadTasks(sale);
    }
  };

  const setStatus = async (task, newStatus) => {
    if (task.status === newStatus) return;
    const me = await base44.auth.me().catch(() => null);
    const patch = { status: newStatus };
    if (newStatus === 'completed') {
      patch.completed_at = new Date().toISOString();
      patch.completed_by = me?.id || '';
      patch.completed_by_name = me?.full_name || '';
      patch.blocked = false;
      patch.blocked_reason = '';
    } else {
      patch.completed_at = '';
      patch.completed_by = '';
      patch.completed_by_name = '';
    }
    await patchTask(task.id, patch);
  };

  const assignTask = async (task, userId) => {
    if (userId === 'unassigned') {
      await patchTask(task.id, { assignee_user_id: '', assignee_name: '' });
    } else {
      const opt = teamOptions.find(o => o.id === userId);
      // Only the sale's operator or an existing team member can own a task.
      if (userId !== sale.operator_id && !(sale.sale_team || []).includes(userId)) {
        alert('Assignees must be the sale owner or a member of the sale team.');
        return;
      }
      await patchTask(task.id, { assignee_user_id: userId, assignee_name: opt?.label || 'Team member' });
    }
  };

  const toggleBlocked = async (task) => {
    if (task.blocked) {
      await patchTask(task.id, { blocked: false, blocked_reason: '' });
    } else {
      setBlockedTarget(task);
    }
  };

  const confirmBlocked = async () => {
    if (!blockedTarget) return;
    const reason = blockedReason.trim();
    if (!reason) return;
    await patchTask(blockedTarget.id, { blocked: true, blocked_reason: reason });
    setBlockedTarget(null);
    setBlockedReason('');
  };

  const toggleAttention = async (task) => {
    await patchTask(task.id, { attention: !task.attention });
  };

  const generateCustomTasks = async () => {
    setGeneratingTasks(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate a comprehensive task list for an estate sale with the following details:

Sale Title: ${sale.title}
Sale Dates: ${sale.sale_dates?.map(d => d.date).join(', ') || 'Not set'}
Description: ${sale.description || 'N/A'}

Create a detailed task list covering:
- Initial planning and client meetings
- Property assessment and inventory
- Pricing and research
- Marketing and promotion
- Setup and staging
- Sale day operations
- Post-sale cleanup and accounting
- Payment processing

For each task, provide:
- Task name
- Brief description
- Category (Planning, Preparation, Marketing, Execution, or Post-Sale)

Return as a JSON array.`,
        response_json_schema: {
          type: 'object',
          properties: {
            tasks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  category: { type: 'string' }
                }
              }
            }
          }
        }
      });

      if (response?.tasks) {
        const existingNames = new Set(tasks.map(t => t.name.toLowerCase()));
        const additions = response.tasks
          .filter(t => t.name && !existingNames.has(t.name.toLowerCase()))
          .map((t, idx) => ({
            ...t,
            sale_id: sale.id,
            operator_id: sale.operator_id,
            company_id: sale.company_id || '',
            sale_team_ids: sale.sale_team || [],
            status: 'not_started',
            priority: 'medium',
            sort_order: tasks.length + idx,
          }));
        if (additions.length === 0) {
          setNotice('No new tasks to add — generated suggestions already exist on this sale.');
        } else {
          await base44.entities.SaleTask.bulkCreate(additions);
          await loadTasks(sale);
          setNotice(`Added ${additions.length} new task(s). Existing tasks and completions were preserved.`);
        }
      }
    } catch (error) {
      console.error('Error generating tasks:', error);
      setNotice('Failed to generate custom tasks');
    } finally {
      setGeneratingTasks(false);
    }
  };

  const getStatusIcon = (task) => {
    if (task.status === 'completed') return <CheckCircle2 className="w-5 h-5 text-green-600" />;
    if (task.blocked) return <AlertOctagon className="w-5 h-5 text-red-600" />;
    if (isOverdue(task.due_date, task.status)) return <AlertTriangle className="w-5 h-5 text-orange-600" />;
    if (task.status === 'in_progress') return <Clock className="w-5 h-5 text-orange-600" />;
    return <Circle className="w-5 h-5 text-slate-300" />;
  };

  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'completed').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    notStarted: tasks.filter(t => t.status === 'not_started').length,
    overdue: tasks.filter(t => isOverdue(t.due_date, t.status)).length,
    blocked: tasks.filter(t => t.blocked && t.status !== 'completed').length,
    unassigned: tasks.filter(t => !t.assignee_user_id && t.status !== 'completed').length,
    attention: tasks.filter(t => t.attention && t.status !== 'completed').length,
  };
  stats.completion = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  const categories = [...new Set(tasks.map(t => t.category))];

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="h-96 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex flex-col items-start gap-1 min-w-0">
          <Button variant="ghost" onClick={() => navigate(createPageUrl('MySales'))} className="text-slate-600 hover:text-slate-900 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" />Back to Sales
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-4xl font-serif font-bold text-slate-900 break-words">{sale?.title}</h1>
            <p className="text-slate-600">Task Management</p>
          </div>
        </div>
        <Button onClick={generateCustomTasks} disabled={generatingTasks} className="bg-purple-600 hover:bg-purple-700">
          {generatingTasks ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>) : (<><Sparkles className="w-4 h-4 mr-2" />AI Generate Tasks</>)}
        </Button>
      </div>

      {/* Chapter 8 P0-1 — non-blocking notice banner */}
      {notice && (
        <div className="flex items-center justify-between gap-3 bg-slate-100 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="text-slate-500 hover:text-slate-800 text-lg leading-none">&times;</button>
        </div>
      )}

      {/* Attention strip */}
      {(stats.overdue > 0 || stats.blocked > 0 || stats.unassigned > 0 || stats.attention > 0) && (
        <div className="flex flex-wrap gap-2">
          {stats.overdue > 0 && <Badge className="bg-red-100 text-red-700 border border-red-300"><AlertTriangle className="w-3 h-3 mr-1" />{stats.overdue} overdue</Badge>}
          {stats.blocked > 0 && <Badge className="bg-red-100 text-red-700 border border-red-300"><AlertOctagon className="w-3 h-3 mr-1" />{stats.blocked} blocked</Badge>}
          {stats.unassigned > 0 && <Badge className="bg-slate-100 text-slate-600 border border-slate-300"><HelpCircle className="w-3 h-3 mr-1" />{stats.unassigned} unassigned</Badge>}
          {stats.attention > 0 && <Badge className="bg-purple-100 text-purple-700 border border-purple-300"><Flag className="w-3 h-3 mr-1" />{stats.attention} flagged</Badge>}
        </div>
      )}

      {/* Progress Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardContent className="p-4"><div className="text-sm text-slate-600 mb-1">Total Tasks</div><div className="text-3xl font-bold text-slate-900">{stats.total}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-sm text-slate-600 mb-1">In Progress</div><div className="text-3xl font-bold text-orange-600">{stats.inProgress}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-sm text-slate-600 mb-1">Completed</div><div className="text-3xl font-bold text-green-600">{stats.completed}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-sm text-slate-600 mb-1">Overdue</div><div className="text-3xl font-bold text-red-600">{stats.overdue}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-sm text-slate-600 mb-1">Progress</div><div className="text-3xl font-bold text-cyan-600">{stats.completion}%</div></CardContent></Card>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden">
            <div className="bg-gradient-to-r from-cyan-500 to-cyan-600 h-full transition-all duration-500" style={{ width: `${stats.completion}%` }} />
          </div>
        </CardContent>
      </Card>

      {/* Tasks by Category */}
      <div className="space-y-6">
        {categories.map(category => (
          <Card key={category}>
            <CardHeader><CardTitle>{category}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {tasks.filter(t => t.category === category).map(task => (
                <div key={task.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-start gap-4">
                    <div className="pt-1">{getStatusIcon(task)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className={`font-semibold ${task.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{task.name}</h4>
                        {task.priority === 'high' && <Badge className="bg-red-100 text-red-700">HIGH</Badge>}
                        {isOverdue(task.due_date, task.status) && <Badge className="bg-red-100 text-red-700">OVERDUE</Badge>}
                        {isDueSoon(task.due_date, task.status) && <Badge className="bg-amber-100 text-amber-700">DUE SOON</Badge>}
                        {task.blocked && <Badge className="bg-red-100 text-red-700 border border-red-300">BLOCKED</Badge>}
                        {task.attention && <Badge className="bg-purple-100 text-purple-700 border border-purple-300">NEEDS ATTENTION</Badge>}
                      </div>
                      <p className="text-sm text-slate-600">{task.description}</p>
                      {task.blocked && task.blocked_reason && (
                        <p className="text-sm text-red-700 mt-1">Blocked: {task.blocked_reason}</p>
                      )}
                      {task.status === 'completed' && task.completed_at && (
                        <p className="text-xs text-slate-500 mt-1">Completed {new Date(task.completed_at).toLocaleString()}{task.completed_by_name ? ` by ${task.completed_by_name}` : ''}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setStatus(task, 'not_started')} className={task.status === 'not_started' ? 'border-slate-400' : ''}>Not Started</Button>
                      <Button variant="outline" size="sm" onClick={() => setStatus(task, 'in_progress')} className={task.status === 'in_progress' ? 'border-orange-400 bg-orange-50' : ''}>In Progress</Button>
                      <Button variant="outline" size="sm" onClick={() => setStatus(task, 'completed')} className={task.status === 'completed' ? 'border-green-400 bg-green-50' : ''}>Completed</Button>
                    </div>
                  </div>
                  {/* Accountability row */}
                  <div className="flex flex-col lg:flex-row lg:items-center gap-2 pl-9 border-t border-slate-100 pt-3">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-xs text-slate-500 flex-shrink-0">Owner</span>
                      <Select value={task.assignee_user_id || 'unassigned'} onValueChange={v => assignTask(task, v)}>
                        <SelectTrigger className="h-8 text-xs w-full lg:w-56"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {teamOptions.map(o => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 flex-shrink-0">Due</span>
                      <Input type="date" value={task.due_date || ''} onChange={e => patchTask(task.id, { due_date: e.target.value })}
                        className="h-8 text-xs w-36" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 flex-shrink-0">Priority</span>
                      <Select value={task.priority || 'medium'} onValueChange={v => patchTask(task.id, { priority: v })}>
                        <SelectTrigger className="h-8 text-xs w-28"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button variant="outline" size="sm" className={`h-8 text-xs ${task.blocked ? 'border-red-400 bg-red-50 text-red-700' : ''}`} onClick={() => toggleBlocked(task)}>
                        {task.blocked ? 'Unblock' : 'Block'}
                      </Button>
                      <Button variant="outline" size="sm" className={`h-8 text-xs ${task.attention ? 'border-purple-400 bg-purple-50 text-purple-700' : ''}`} onClick={() => toggleAttention(task)}>
                        <Flag className="w-3 h-3 mr-1" />{task.attention ? 'Unflag' : 'Flag'}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Blocked-reason dialog */}
      <Dialog open={!!blockedTarget} onOpenChange={o => { if (!o) { setBlockedTarget(null); setBlockedReason(''); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>What is preventing completion?</DialogTitle></DialogHeader>
          <Textarea rows={3} value={blockedReason} onChange={e => setBlockedReason(e.target.value)} placeholder="Blocked reason (required)" />
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => { setBlockedTarget(null); setBlockedReason(''); }}>Cancel</Button>
            <Button onClick={confirmBlocked} disabled={!blockedReason.trim()}>Mark Blocked</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}