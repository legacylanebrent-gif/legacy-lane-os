import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { 
  Plus, Zap, Mail, MessageSquare, Bell, Calendar, 
  Users, DollarSign, ShoppingBag, Home, Edit, Trash2, Power
} from 'lucide-react';

const TRIGGER_TYPES = [
  // User Events
  { value: 'user_signup', label: 'User Signs Up', icon: Users, category: 'user' },
  { value: 'user_login', label: 'User Logs In', icon: Users, category: 'user' },
  { value: 'user_profile_updated', label: 'User Updates Profile', icon: Users, category: 'user' },
  { value: 'user_inactive_30d', label: 'User Inactive (30+ days)', icon: Users, category: 'user' },
  
  // Billing Events
  { value: 'subscription_started', label: 'Subscription Started', icon: DollarSign, category: 'billing' },
  { value: 'subscription_cancelled', label: 'Subscription Cancelled', icon: DollarSign, category: 'billing' },
  { value: 'subscription_expired', label: 'Subscription Expired', icon: DollarSign, category: 'billing' },
  { value: 'subscription_trial_ending', label: 'Trial Ending Soon', icon: DollarSign, category: 'billing' },
  { value: 'payment_succeeded', label: 'Payment Successful', icon: DollarSign, category: 'billing' },
  { value: 'payment_failed', label: 'Payment Failed', icon: DollarSign, category: 'billing' },
  
  // Estate Sale Events
  { value: 'sale_created', label: 'Estate Sale Created', icon: Home, category: 'sales' },
  { value: 'sale_published', label: 'Estate Sale Published', icon: Home, category: 'sales' },
  { value: 'sale_going_live_24h', label: 'Estate Sale Going Live (24hrs)', icon: Home, category: 'sales' },
  { value: 'sale_completed', label: 'Estate Sale Completed', icon: Home, category: 'sales' },
  { value: 'sale_cancelled', label: 'Estate Sale Cancelled', icon: Home, category: 'sales' },
  { value: 'sale_revenue_milestone', label: 'Sale Revenue Milestone Reached', icon: Home, category: 'sales' },
  
  // Lead Events
  { value: 'lead_created', label: 'New Lead Received', icon: Users, category: 'leads' },
  { value: 'lead_assigned', label: 'Lead Assigned to Operator', icon: Users, category: 'leads' },
  { value: 'lead_converted', label: 'Lead Converted to Client', icon: Users, category: 'leads' },
  { value: 'lead_high_score', label: 'High-Score Lead (75+)', icon: Users, category: 'leads' },
  
  // Marketplace Events
  { value: 'item_listed', label: 'Item Listed for Sale', icon: ShoppingBag, category: 'marketplace' },
  { value: 'item_sold', label: 'Item Sold', icon: ShoppingBag, category: 'marketplace' },
  { value: 'offer_made', label: 'Offer Made on Item', icon: ShoppingBag, category: 'marketplace' },
  { value: 'offer_accepted', label: 'Offer Accepted', icon: ShoppingBag, category: 'marketplace' },
  { value: 'offer_rejected', label: 'Offer Rejected', icon: ShoppingBag, category: 'marketplace' },
  
  // Support Events
  { value: 'ticket_created', label: 'Support Ticket Created', icon: MessageSquare, category: 'support' },
  { value: 'ticket_resolved', label: 'Support Ticket Resolved', icon: MessageSquare, category: 'support' },
  { value: 'ticket_escalated', label: 'Ticket Escalated (High Priority)', icon: MessageSquare, category: 'support' },
  { value: 'ticket_response', label: 'New Ticket Message', icon: MessageSquare, category: 'support' },
  
  // VIP Event Management
  { value: 'vip_event_created', label: 'VIP Event Created', icon: Calendar, category: 'events' },
  { value: 'vip_invite_sent', label: 'VIP Invite Sent', icon: Calendar, category: 'events' },
  { value: 'vip_invite_accepted', label: 'VIP Invite Accepted', icon: Calendar, category: 'events' },
  { value: 'vip_event_tomorrow', label: 'VIP Event Tomorrow', icon: Calendar, category: 'events' },
  
  // Referral Events
  { value: 'referral_created', label: 'New Referral Made', icon: Users, category: 'referrals' },
  { value: 'referral_signed_up', label: 'Referral Signed Up', icon: Users, category: 'referrals' },
  { value: 'referral_subscribed', label: 'Referral Started Subscription', icon: Users, category: 'referrals' },
  { value: 'referral_first_payment', label: 'Referral Made First Payment', icon: DollarSign, category: 'referrals' },
  
  // Rewards Events
  { value: 'reward_points_earned', label: 'User Earned Points', icon: Users, category: 'rewards' },
  { value: 'reward_milestone_reached', label: 'Point Milestone Reached', icon: Users, category: 'rewards' },
  { value: 'monthly_draw_winner', label: 'Monthly Draw Winner Selected', icon: Users, category: 'rewards' },
  
  // Course Events
  { value: 'course_enrolled', label: 'User Enrolled in Course', icon: Users, category: 'courses' },
  { value: 'lesson_completed', label: 'Lesson Completed', icon: Users, category: 'courses' },
  { value: 'course_completed', label: 'Course Completed', icon: Users, category: 'courses' },
  { value: 'quiz_passed', label: 'Quiz Passed', icon: Users, category: 'courses' },
  { value: 'quiz_failed', label: 'Quiz Failed', icon: Users, category: 'courses' },
  
  // Vendor Events
  { value: 'bid_request_created', label: 'Bid Request Created', icon: Users, category: 'vendors' },
  { value: 'bid_submitted', label: 'Bid Submitted', icon: Users, category: 'vendors' },
  { value: 'bid_accepted', label: 'Bid Accepted', icon: Users, category: 'vendors' },
  
  // Financial Tracking
  { value: 'expense_added', label: 'Business Expense Added', icon: DollarSign, category: 'financial' },
  { value: 'income_recorded', label: 'Income Recorded', icon: DollarSign, category: 'financial' },
  { value: 'tax_threshold_reached', label: 'Tax Liability Threshold', icon: DollarSign, category: 'financial' },
  
  // CRM Events
  { value: 'contact_added', label: 'New Contact Added', icon: Users, category: 'crm' },
  { value: 'deal_created', label: 'New Deal Created', icon: DollarSign, category: 'crm' },
  { value: 'deal_closed', label: 'Deal Closed', icon: DollarSign, category: 'crm' },
  { value: 'property_listed', label: 'Property Listed', icon: Home, category: 'crm' }
];

const ACTION_TYPES = [
  { value: 'send_email', label: 'Send Email', icon: Mail },
  { value: 'send_sms', label: 'Send SMS', icon: MessageSquare },
  { value: 'send_notification', label: 'Send In-App Notification', icon: Bell },
  { value: 'assign_to_user', label: 'Assign to User', icon: Users },
  { value: 'create_task', label: 'Create Task', icon: Calendar },
  { value: 'webhook', label: 'Call Webhook', icon: Zap }
];

export default function AdminAutomations() {
  const [automations, setAutomations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState(null);
  const [activeTab, setActiveTab] = useState('automations');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    trigger_type: '',
    trigger_conditions: {},
    action_type: '',
    action_config: {},
    is_active: true
  });

  useEffect(() => {
    loadAutomations();
  }, []);

  const loadAutomations = async () => {
    try {
      // Note: You'll need to create an Automation entity
      // For now, we'll use local storage as a demo
      const stored = localStorage.getItem('automations');
      setAutomations(stored ? JSON.parse(stored) : []);
    } catch (error) {
      console.error('Error loading automations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAutomation = async (e) => {
    e.preventDefault();
    
    const automation = {
      id: editingAutomation?.id || `auto_${Date.now()}`,
      ...formData,
      created_date: editingAutomation?.created_date || new Date().toISOString(),
      updated_date: new Date().toISOString()
    };

    let updatedAutomations;
    if (editingAutomation) {
      updatedAutomations = automations.map(a => a.id === automation.id ? automation : a);
    } else {
      updatedAutomations = [...automations, automation];
    }

    localStorage.setItem('automations', JSON.stringify(updatedAutomations));
    setAutomations(updatedAutomations);
    
    setShowCreateModal(false);
    setEditingAutomation(null);
    resetForm();
  };

  const handleToggleActive = async (automationId, currentStatus) => {
    const updatedAutomations = automations.map(a => 
      a.id === automationId ? { ...a, is_active: !currentStatus } : a
    );
    localStorage.setItem('automations', JSON.stringify(updatedAutomations));
    setAutomations(updatedAutomations);
  };

  const handleDelete = (automationId) => {
    if (!confirm('Are you sure you want to delete this automation?')) return;
    
    const updatedAutomations = automations.filter(a => a.id !== automationId);
    localStorage.setItem('automations', JSON.stringify(updatedAutomations));
    setAutomations(updatedAutomations);
  };

  const handleEdit = (automation) => {
    setEditingAutomation(automation);
    setFormData({
      name: automation.name,
      description: automation.description,
      trigger_type: automation.trigger_type,
      trigger_conditions: automation.trigger_conditions,
      action_type: automation.action_type,
      action_config: automation.action_config,
      is_active: automation.is_active
    });
    setShowCreateModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      trigger_type: '',
      trigger_conditions: {},
      action_type: '',
      action_config: {},
      is_active: true
    });
  };

  const renderActionConfig = () => {
    if (!formData.action_type) return null;

    switch (formData.action_type) {
      case 'send_email':
        return (
          <div className="space-y-4">
            <div>
              <Label>Email Template</Label>
              <Input
                value={formData.action_config.template || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  action_config: { ...formData.action_config, template: e.target.value }
                })}
                placeholder="Welcome Email, Lead Notification, etc."
              />
            </div>
            <div>
              <Label>Subject</Label>
              <Input
                value={formData.action_config.subject || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  action_config: { ...formData.action_config, subject: e.target.value }
                })}
                placeholder="Email subject line"
              />
            </div>
            <div>
              <Label>Body</Label>
              <Textarea
                value={formData.action_config.body || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  action_config: { ...formData.action_config, body: e.target.value }
                })}
                placeholder="Use {{variable}} for dynamic content"
                rows={6}
              />
            </div>
          </div>
        );

      case 'send_sms':
        return (
          <div>
            <Label>SMS Message</Label>
            <Textarea
              value={formData.action_config.message || ''}
              onChange={(e) => setFormData({
                ...formData,
                action_config: { ...formData.action_config, message: e.target.value }
              })}
              placeholder="SMS text (160 chars max)"
              maxLength={160}
              rows={4}
            />
            <p className="text-xs text-slate-500 mt-1">
              {formData.action_config.message?.length || 0}/160 characters
            </p>
          </div>
        );

      case 'send_notification':
        return (
          <div className="space-y-4">
            <div>
              <Label>Notification Title</Label>
              <Input
                value={formData.action_config.title || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  action_config: { ...formData.action_config, title: e.target.value }
                })}
                placeholder="Notification title"
              />
            </div>
            <div>
              <Label>Notification Message</Label>
              <Textarea
                value={formData.action_config.message || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  action_config: { ...formData.action_config, message: e.target.value }
                })}
                placeholder="Notification text"
                rows={3}
              />
            </div>
          </div>
        );

      case 'webhook':
        return (
          <div className="space-y-4">
            <div>
              <Label>Webhook URL</Label>
              <Input
                type="url"
                value={formData.action_config.url || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  action_config: { ...formData.action_config, url: e.target.value }
                })}
                placeholder="https://example.com/webhook"
              />
            </div>
            <div>
              <Label>Method</Label>
              <Select
                value={formData.action_config.method || 'POST'}
                onValueChange={(value) => setFormData({
                  ...formData,
                  action_config: { ...formData.action_config, method: value }
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      default:
        return (
          <div className="p-4 bg-slate-50 rounded-lg text-sm text-slate-600">
            Additional configuration will appear here based on the action type selected.
          </div>
        );
    }
  };

  const getTriggerIcon = (type) => {
    const trigger = TRIGGER_TYPES.find(t => t.value === type);
    if (!trigger) return Zap;
    return trigger.icon;
  };

  const getActionIcon = (type) => {
    const action = ACTION_TYPES.find(a => a.value === type);
    if (!action) return Zap;
    return action.icon;
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="h-64 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  const activeCount = automations.filter(a => a.is_active).length;
  const inactiveCount = automations.filter(a => !a.is_active).length;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-serif font-bold text-slate-900 mb-2">Automations & Notifications</h1>
          <p className="text-slate-600">Automate workflows and manage system notifications</p>
        </div>
        <Button
          onClick={() => {
            setEditingAutomation(null);
            resetForm();
            setShowCreateModal(true);
          }}
          className="bg-orange-600 hover:bg-orange-700 w-full sm:w-auto whitespace-nowrap"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Automation
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Total Automations</p>
                <p className="text-3xl font-bold text-slate-900">{automations.length}</p>
              </div>
              <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-cyan-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Active</p>
                <p className="text-3xl font-bold text-green-600">{activeCount}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Power className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Inactive</p>
                <p className="text-3xl font-bold text-slate-600">{inactiveCount}</p>
              </div>
              <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                <Power className="w-6 h-6 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="automations">Automations</TabsTrigger>
          <TabsTrigger value="templates">Email Templates</TabsTrigger>
          <TabsTrigger value="logs">Activity Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="automations" className="space-y-4">
          {automations.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Zap className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 mb-4">No automations created yet</p>
                <Button onClick={() => setShowCreateModal(true)} className="bg-orange-600 hover:bg-orange-700">
                  Create Your First Automation
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {automations.map(automation => {
                const TriggerIcon = getTriggerIcon(automation.trigger_type);
                const ActionIcon = getActionIcon(automation.action_type);
                const triggerLabel = TRIGGER_TYPES.find(t => t.value === automation.trigger_type)?.label;
                const actionLabel = ACTION_TYPES.find(a => a.value === automation.action_type)?.label;

                return (
                  <Card key={automation.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                     <div className="flex flex-col gap-4">
                       <div className="flex items-start justify-between gap-3">
                         <div className="flex-1 min-w-0">
                           <div className="flex items-center gap-2 mb-2 flex-wrap">
                             <h3 className="text-lg font-semibold text-slate-900 truncate">{automation.name}</h3>
                             {automation.is_active ? (
                               <Badge className="bg-green-100 text-green-700 flex-shrink-0">Active</Badge>
                             ) : (
                               <Badge className="bg-slate-100 text-slate-600 flex-shrink-0">Inactive</Badge>
                             )}
                           </div>
                           {automation.description && (
                             <p className="text-sm text-slate-600 mb-3">{automation.description}</p>
                           )}
                         </div>

                         <div className="flex items-center gap-2 flex-shrink-0">
                           <Switch
                             checked={automation.is_active}
                             onCheckedChange={() => handleToggleActive(automation.id, automation.is_active)}
                           />
                           <Button
                             variant="ghost"
                             size="icon"
                             onClick={() => handleEdit(automation)}
                           >
                             <Edit className="w-4 h-4" />
                           </Button>
                           <Button
                             variant="ghost"
                             size="icon"
                             onClick={() => handleDelete(automation.id)}
                             className="text-red-600 hover:text-red-700"
                           >
                             <Trash2 className="w-4 h-4" />
                           </Button>
                         </div>
                       </div>

                       <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 text-sm">
                         <div className="flex items-center gap-2">
                           <div className="w-8 h-8 bg-cyan-100 rounded-lg flex items-center justify-center flex-shrink-0">
                             <TriggerIcon className="w-4 h-4 text-cyan-600" />
                           </div>
                           <div className="min-w-0">
                             <p className="text-xs text-slate-500">When</p>
                             <p className="font-medium text-slate-900 truncate">{triggerLabel}</p>
                           </div>
                         </div>

                         <div className="text-slate-400 hidden sm:block">→</div>

                         <div className="flex items-center gap-2">
                           <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                             <ActionIcon className="w-4 h-4 text-orange-600" />
                           </div>
                           <div className="min-w-0">
                             <p className="text-xs text-slate-500">Then</p>
                             <p className="font-medium text-slate-900 truncate">{actionLabel}</p>
                           </div>
                         </div>
                       </div>
                     </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardContent className="p-12 text-center">
              <Mail className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Email template management coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardContent className="p-12 text-center">
              <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Activity logs coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Automation Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-3xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="flex-shrink-0 px-6 pt-6">
            <DialogTitle className="text-2xl">
              {editingAutomation ? 'Edit Automation' : 'Create Automation'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateAutomation} className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
              <div>
                <Label>Automation Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Welcome Email on Signup"
                  required
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What does this automation do?"
                  rows={2}
                />
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-cyan-600" />
                  Trigger: When should this run?
                </h3>
                
                <div>
                  <Label>Trigger Event *</Label>
                  <Select
                    value={formData.trigger_type}
                    onValueChange={(value) => setFormData({ ...formData, trigger_type: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a trigger..." />
                    </SelectTrigger>
                    <SelectContent 
                      className="max-h-[40vh] overflow-y-auto" 
                      position="popper" 
                      sideOffset={5}
                      align="start"
                      collisionPadding={20}
                    >
                      {['user', 'billing', 'sales', 'leads', 'marketplace', 'support', 'events', 'referrals', 'rewards', 'courses', 'vendors', 'financial', 'crm'].map(category => (
                        <React.Fragment key={category}>
                          <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase">
                            {category}
                          </div>
                          {TRIGGER_TYPES.filter(t => t.category === category).map(trigger => (
                            <SelectItem key={trigger.value} value={trigger.value}>
                              {trigger.label}
                            </SelectItem>
                          ))}
                        </React.Fragment>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-orange-600" />
                  Action: What should happen?
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <Label>Action Type *</Label>
                    <Select
                      value={formData.action_type}
                      onValueChange={(value) => setFormData({ ...formData, action_type: value, action_config: {} })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select an action..." />
                      </SelectTrigger>
                      <SelectContent 
                        className="max-h-[40vh] overflow-y-auto" 
                        position="popper" 
                        sideOffset={5}
                        align="start"
                        collisionPadding={20}
                      >
                        {ACTION_TYPES.map(action => (
                          <SelectItem key={action.value} value={action.value}>
                            {action.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {renderActionConfig()}
                </div>
              </div>
            </div>

            <div className="flex-shrink-0 border-t bg-white px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label>Active</Label>
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditingAutomation(null);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-orange-600 hover:bg-orange-700">
                    {editingAutomation ? 'Update Automation' : 'Create Automation'}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}