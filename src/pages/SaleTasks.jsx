import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowLeft, CheckCircle2, Circle, Clock, Loader2, 
  Sparkles, Plus
} from 'lucide-react';

const DEFAULT_TASKS = [
  { name: 'Initial Client Meeting', description: 'Meet with client to discuss estate sale needs and timeline', category: 'Planning' },
  { name: 'Sign Contract', description: 'Review and sign estate sale agreement with client', category: 'Planning' },
  { name: 'Property Walkthrough', description: 'Conduct detailed walkthrough and inventory of items', category: 'Planning' },
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const saleId = params.get('saleId');
      
      if (!saleId) {
        alert('Sale ID not found');
        navigate(createPageUrl('MySales'));
        return;
      }

      const saleData = await base44.entities.EstateSale.filter({ id: saleId });
      if (saleData.length === 0) {
        alert('Sale not found');
        navigate(createPageUrl('MySales'));
        return;
      }

      setSale(saleData[0]);

      // Initialize with default tasks
      const initialTasks = DEFAULT_TASKS.map((task, idx) => ({
        ...task,
        id: idx,
        status: 'not_started'
      }));
      setTasks(initialTasks);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateTaskStatus = (taskId, newStatus) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, status: newStatus } : task
    ));
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
        const customTasks = response.tasks.map((task, idx) => ({
          ...task,
          id: idx,
          status: 'not_started'
        }));
        setTasks(customTasks);
      }
    } catch (error) {
      console.error('Error generating tasks:', error);
      alert('Failed to generate custom tasks');
    } finally {
      setGeneratingTasks(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'in_progress':
        return <Clock className="w-5 h-5 text-orange-600" />;
      default:
        return <Circle className="w-5 h-5 text-slate-300" />;
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      not_started: 'bg-slate-100 text-slate-700',
      in_progress: 'bg-orange-100 text-orange-700',
      completed: 'bg-green-100 text-green-700'
    };
    return colors[status] || 'bg-slate-100 text-slate-700';
  };

  const stats = {
    total: tasks.length,
    notStarted: tasks.filter(t => t.status === 'not_started').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    completion: tasks.length > 0 ? Math.round((tasks.filter(t => t.status === 'completed').length / tasks.length) * 100) : 0
  };

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(createPageUrl('MySales'))}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Sales
          </Button>
          <div>
            <h1 className="text-4xl font-serif font-bold text-slate-900">{sale?.title}</h1>
            <p className="text-slate-600">Task Management</p>
          </div>
        </div>
        <Button 
          onClick={generateCustomTasks}
          disabled={generatingTasks}
          className="bg-purple-600 hover:bg-purple-700"
        >
          {generatingTasks ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              AI Generate Tasks
            </>
          )}
        </Button>
      </div>

      {/* Progress Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-600 mb-1">Total Tasks</div>
            <div className="text-3xl font-bold text-slate-900">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-600 mb-1">Not Started</div>
            <div className="text-3xl font-bold text-slate-500">{stats.notStarted}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-600 mb-1">In Progress</div>
            <div className="text-3xl font-bold text-orange-600">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-600 mb-1">Completed</div>
            <div className="text-3xl font-bold text-green-600">{stats.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-600 mb-1">Progress</div>
            <div className="text-3xl font-bold text-cyan-600">{stats.completion}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-cyan-500 to-cyan-600 h-full transition-all duration-500"
              style={{ width: `${stats.completion}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Tasks by Category */}
      <div className="space-y-6">
        {categories.map(category => (
          <Card key={category}>
            <CardHeader>
              <CardTitle>{category}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {tasks.filter(t => t.category === category).map(task => (
                <div key={task.id} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="pt-1">
                    {getStatusIcon(task.status)}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-900 mb-1">{task.name}</h4>
                    <p className="text-sm text-slate-600">{task.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateTaskStatus(task.id, 'not_started')}
                      className={task.status === 'not_started' ? 'border-slate-400' : ''}
                    >
                      Not Started
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateTaskStatus(task.id, 'in_progress')}
                      className={task.status === 'in_progress' ? 'border-orange-400 bg-orange-50' : ''}
                    >
                      In Progress
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateTaskStatus(task.id, 'completed')}
                      className={task.status === 'completed' ? 'border-green-400 bg-green-50' : ''}
                    >
                      Completed
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}