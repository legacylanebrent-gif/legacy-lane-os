import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Calendar, CheckCircle2, Circle, Clock, Mail, MessageSquare, Share2, 
  TrendingUp, Users, Plus, Megaphone, Building2, ArrowRight
} from 'lucide-react';
import { format } from 'date-fns';

export default function MarketingTasks() {
  const [tasks, setTasks] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [activeTab, setActiveTab] = useState('estate_sale');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [tasksData, salesData] = await Promise.all([
        base44.entities.MarketingTask.list('-created_date'),
        base44.entities.EstateSale.list('-created_date', 50)
      ]);
      setTasks(tasksData);
      setSales(salesData.filter(s => s.status === 'upcoming' || s.status === 'active'));
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      await base44.entities.MarketingTask.update(task.id, {
        status: newStatus,
        completed_date: newStatus === 'completed' ? new Date().toISOString() : null
      });
      loadData();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const estateSaleTasks = tasks.filter(t => t.task_type === 'estate_sale');
  const businessTasks = tasks.filter(t => t.task_type === 'business');

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'email': return <Mail className="w-4 h-4" />;
      case 'sms': return <MessageSquare className="w-4 h-4" />;
      case 'social_media': return <Share2 className="w-4 h-4" />;
      case 'networking': return <Users className="w-4 h-4" />;
      case 'campaign': return <Megaphone className="w-4 h-4" />;
      default: return <TrendingUp className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-700 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'medium': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'low': return 'bg-slate-100 text-slate-700 border-slate-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-slate-200 rounded w-1/3"></div>
          <div className="h-96 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-slate-900">Marketing Tasks</h1>
          <p className="text-slate-600 mt-1">Manage estate sale and business marketing activities</p>
        </div>
        <div className="flex gap-3">
          <Link to={createPageUrl('CampaignBuilder')}>
            <Button variant="outline" className="border-cyan-600 text-cyan-700 hover:bg-cyan-50">
              <Megaphone className="w-4 h-4 mr-2" />
              Create Campaign
            </Button>
          </Link>
          <Dialog open={showTaskForm} onOpenChange={setShowTaskForm}>
            <DialogTrigger asChild>
              <Button className="bg-orange-600 hover:bg-orange-700" onClick={() => setEditingTask(null)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Task
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingTask ? 'Edit Task' : 'Create Marketing Task'}</DialogTitle>
              </DialogHeader>
              <TaskForm
                task={editingTask}
                sales={sales}
                onSave={() => {
                  loadData();
                  setShowTaskForm(false);
                  setEditingTask(null);
                }}
                onCancel={() => {
                  setShowTaskForm(false);
                  setEditingTask(null);
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="estate_sale">
            <Building2 className="w-4 h-4 mr-2" />
            Estate Sale Marketing
          </TabsTrigger>
          <TabsTrigger value="business">
            <TrendingUp className="w-4 h-4 mr-2" />
            Business Marketing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="estate_sale" className="space-y-6 mt-6">
          {sales.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No active estate sales</p>
              </CardContent>
            </Card>
          ) : (
            sales.map(sale => {
              const saleTasks = estateSaleTasks.filter(t => t.sale_id === sale.id);
              const completedCount = saleTasks.filter(t => t.status === 'completed').length;
              const totalCount = saleTasks.length;

              return (
                <Card key={sale.id} className="border-l-4 border-l-orange-500">
                  <CardHeader className="bg-slate-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-xl">{sale.title}</CardTitle>
                        <p className="text-sm text-slate-600 mt-1">
                          {sale.sale_dates && sale.sale_dates[0] && 
                            format(new Date(sale.sale_dates[0].date), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className="bg-orange-100 text-orange-700">
                          {completedCount}/{totalCount} Complete
                        </Badge>
                        <Link to={createPageUrl('EstateSaleDetail') + '?id=' + sale.id}>
                          <Button size="sm" variant="outline">
                            View Sale <ArrowRight className="w-4 h-4 ml-2" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    {saleTasks.length === 0 ? (
                      <div className="text-center py-8 text-slate-500">
                        <p>No marketing tasks for this sale yet</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3"
                          onClick={() => {
                            setEditingTask({ task_type: 'estate_sale', sale_id: sale.id, sale_title: sale.title });
                            setShowTaskForm(true);
                          }}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Task
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {saleTasks.map(task => (
                          <TaskItem
                            key={task.id}
                            task={task}
                            onToggle={handleToggleStatus}
                            onEdit={(t) => {
                              setEditingTask(t);
                              setShowTaskForm(true);
                            }}
                            getCategoryIcon={getCategoryIcon}
                            getPriorityColor={getPriorityColor}
                          />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="business" className="space-y-6 mt-6">
          <Card>
            <CardHeader className="bg-slate-50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">General Business Marketing</CardTitle>
                <Badge className="bg-cyan-100 text-cyan-700">
                  {businessTasks.filter(t => t.status === 'completed').length}/{businessTasks.length} Complete
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {businessTasks.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <TrendingUp className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p>No business marketing tasks yet</p>
                  <Button
                    variant="outline"
                    className="mt-3"
                    onClick={() => {
                      setEditingTask({ task_type: 'business' });
                      setShowTaskForm(true);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Task
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {businessTasks.map(task => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      onToggle={handleToggleStatus}
                      onEdit={(t) => {
                        setEditingTask(t);
                        setShowTaskForm(true);
                      }}
                      getCategoryIcon={getCategoryIcon}
                      getPriorityColor={getPriorityColor}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TaskItem({ task, onToggle, onEdit, getCategoryIcon, getPriorityColor }) {
  return (
    <div className="flex items-start gap-4 p-4 border rounded-lg hover:bg-slate-50 transition-colors">
      <button
        onClick={() => onToggle(task)}
        className="mt-1 flex-shrink-0"
      >
        {task.status === 'completed' ? (
          <CheckCircle2 className="w-5 h-5 text-green-600" />
        ) : (
          <Circle className="w-5 h-5 text-slate-400" />
        )}
      </button>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <p className={`font-semibold ${task.status === 'completed' ? 'line-through text-slate-500' : 'text-slate-900'}`}>
              {task.title}
            </p>
            {task.description && (
              <p className="text-sm text-slate-600 mt-1">{task.description}</p>
            )}
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="outline" className="flex items-center gap-1">
                {getCategoryIcon(task.category)}
                {task.category}
              </Badge>
              {task.platform && (
                <Badge variant="outline">{task.platform}</Badge>
              )}
              {task.due_date && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(task.due_date), 'MMM d')}
                </Badge>
              )}
              <Badge className={getPriorityColor(task.priority)}>
                {task.priority}
              </Badge>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onEdit(task)}
          >
            Edit
          </Button>
        </div>
      </div>
    </div>
  );
}

function TaskForm({ task, sales, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    task_type: task?.task_type || 'business',
    sale_id: task?.sale_id || '',
    sale_title: task?.sale_title || '',
    title: task?.title || '',
    description: task?.description || '',
    category: task?.category || 'email',
    platform: task?.platform || '',
    due_date: task?.due_date || '',
    priority: task?.priority || 'medium',
    status: task?.status || 'pending'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (formData.task_type === 'estate_sale' && formData.sale_id) {
        const sale = sales.find(s => s.id === formData.sale_id);
        formData.sale_title = sale?.title || '';
      }
      
      if (task?.id) {
        await base44.entities.MarketingTask.update(task.id, formData);
      } else {
        await base44.entities.MarketingTask.create(formData);
      }
      onSave();
    } catch (error) {
      console.error('Error saving task:', error);
      alert('Error saving task');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Task Type</Label>
        <select
          value={formData.task_type}
          onChange={(e) => setFormData({...formData, task_type: e.target.value})}
          className="w-full px-3 py-2 border rounded-lg"
        >
          <option value="business">Business Marketing</option>
          <option value="estate_sale">Estate Sale Marketing</option>
        </select>
      </div>

      {formData.task_type === 'estate_sale' && (
        <div>
          <Label>Estate Sale</Label>
          <select
            value={formData.sale_id}
            onChange={(e) => setFormData({...formData, sale_id: e.target.value})}
            className="w-full px-3 py-2 border rounded-lg"
            required
          >
            <option value="">Select a sale</option>
            {sales.map(sale => (
              <option key={sale.id} value={sale.id}>{sale.title}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <Label>Task Title</Label>
        <Input
          value={formData.title}
          onChange={(e) => setFormData({...formData, title: e.target.value})}
          placeholder="e.g., Send email to subscriber list"
          required
        />
      </div>

      <div>
        <Label>Description</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Category</Label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({...formData, category: e.target.value})}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="email">Email</option>
            <option value="sms">SMS</option>
            <option value="social_media">Social Media</option>
            <option value="advertising">Advertising</option>
            <option value="networking">Networking</option>
            <option value="content">Content</option>
            <option value="campaign">Campaign</option>
            <option value="signage">Signage</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <Label>Platform/Channel</Label>
          <Input
            value={formData.platform}
            onChange={(e) => setFormData({...formData, platform: e.target.value})}
            placeholder="e.g., Facebook, Instagram"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Due Date</Label>
          <Input
            type="date"
            value={formData.due_date}
            onChange={(e) => setFormData({...formData, due_date: e.target.value})}
          />
        </div>

        <div>
          <Label>Priority</Label>
          <select
            value={formData.priority}
            onChange={(e) => setFormData({...formData, priority: e.target.value})}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="bg-orange-600 hover:bg-orange-700">
          {task?.id ? 'Update Task' : 'Create Task'}
        </Button>
      </div>
    </form>
  );
}