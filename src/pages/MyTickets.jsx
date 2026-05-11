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
import { Plus, MessageSquare, Clock, CheckCircle, AlertCircle, Upload, Send } from 'lucide-react';
import { format } from 'date-fns';
import SharedFooter from '@/components/layout/SharedFooter';

export default function MyTickets() {
  const [tickets, setTickets] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketMessages, setTicketMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);

  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    category: 'general_inquiry',
    priority: 'medium',
    attachments: []
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);

      const ticketsData = await base44.entities.Ticket.filter({ user_id: user.id }, '-created_date');
      setTickets(ticketsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTicketMessages = async (ticketId) => {
    try {
      const messages = await base44.entities.TicketMessage.filter({ ticket_id: ticketId }, 'created_date');
      setTicketMessages(messages.filter(m => !m.is_internal));
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, attachments: [...formData.attachments, file_url] });
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const ticketNumber = `TKT-${Date.now().toString().slice(-6)}`;
      
      await base44.entities.Ticket.create({
        ...formData,
        ticket_number: ticketNumber,
        user_id: currentUser.id,
        user_name: currentUser.full_name,
        user_email: currentUser.email,
        account_type: currentUser.primary_account_type,
        last_response_date: new Date().toISOString()
      });

      setShowCreateModal(false);
      setFormData({
        subject: '',
        description: '',
        category: 'general_inquiry',
        priority: 'medium',
        attachments: []
      });
      loadData();
    } catch (error) {
      console.error('Error creating ticket:', error);
      alert('Failed to create ticket');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      await base44.entities.TicketMessage.create({
        ticket_id: selectedTicket.id,
        sender_id: currentUser.id,
        sender_name: currentUser.full_name,
        sender_type: 'user',
        message: newMessage
      });

      await base44.entities.Ticket.update(selectedTicket.id, {
        last_response_date: new Date().toISOString(),
        status: selectedTicket.status === 'waiting_response' ? 'in_progress' : selectedTicket.status
      });

      setNewMessage('');
      loadTicketMessages(selectedTicket.id);
      loadData();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const openTicketDetail = (ticket) => {
    setSelectedTicket(ticket);
    loadTicketMessages(ticket.id);
    setShowDetailModal(true);
  };

  const getStatusBadge = (status) => {
    const configs = {
      open: { label: 'Open', className: 'bg-blue-100 text-blue-700' },
      in_progress: { label: 'In Progress', className: 'bg-yellow-100 text-yellow-700' },
      waiting_response: { label: 'Waiting Response', className: 'bg-orange-100 text-orange-700' },
      resolved: { label: 'Resolved', className: 'bg-green-100 text-green-700' },
      closed: { label: 'Closed', className: 'bg-slate-100 text-slate-700' }
    };
    const config = configs[status] || configs.open;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getPriorityBadge = (priority) => {
    const configs = {
      low: { label: 'Low', className: 'bg-slate-100 text-slate-600' },
      medium: { label: 'Medium', className: 'bg-blue-100 text-blue-700' },
      high: { label: 'High', className: 'bg-orange-100 text-orange-700' },
      urgent: { label: 'Urgent', className: 'bg-red-100 text-red-700' }
    };
    const config = configs[priority] || configs.medium;
    return <Badge variant="outline" className={config.className}>{config.label}</Badge>;
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

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-serif font-bold text-slate-900 mb-2">My Support Tickets</h1>
          <p className="text-slate-600">Get help from our support team</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-orange-600 hover:bg-orange-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Ticket
        </Button>
      </div>

      {tickets.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <MessageSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 mb-4">You haven't created any support tickets yet</p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Ticket
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {tickets.map(ticket => (
            <Card
              key={ticket.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => openTicketDetail(ticket)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-mono text-sm text-slate-500">{ticket.ticket_number}</span>
                      {getStatusBadge(ticket.status)}
                      {getPriorityBadge(ticket.priority)}
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">{ticket.subject}</h3>
                    <p className="text-slate-600 text-sm line-clamp-2 mb-3">{ticket.description}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(ticket.created_date), 'MMM d, yyyy h:mm a')}
                      </div>
                      {ticket.assigned_to_name && (
                        <div>Assigned to: {ticket.assigned_to_name}</div>
                      )}
                    </div>
                  </div>
                  {ticket.status === 'waiting_response' && (
                    <div className="text-orange-600 text-sm font-medium flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      Awaiting your response
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Ticket Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">Create Support Ticket</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateTicket} className="space-y-4 mt-4">
            <div>
              <Label>Subject *</Label>
              <Input
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Brief description of your issue"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category *</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technical_issue">Technical Issue</SelectItem>
                    <SelectItem value="billing_payment">Billing & Payment</SelectItem>
                    <SelectItem value="account_access">Account Access</SelectItem>
                    <SelectItem value="feature_request">Feature Request</SelectItem>
                    <SelectItem value="sales_management">Sales Management</SelectItem>
                    <SelectItem value="marketplace_issue">Marketplace Issue</SelectItem>
                    <SelectItem value="course_access">Course Access</SelectItem>
                    <SelectItem value="lead_management">Lead Management</SelectItem>
                    <SelectItem value="vendor_services">Vendor Services</SelectItem>
                    <SelectItem value="general_inquiry">General Inquiry</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Priority</Label>
                <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Description *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Provide detailed information about your issue..."
                rows={6}
                required
              />
            </div>

            <div>
              <Label>Attachments</Label>
              <div className="flex items-center gap-2">
                <Input type="file" onChange={handleFileUpload} disabled={uploadingFile} />
                {uploadingFile && <span className="text-sm text-slate-500">Uploading...</span>}
              </div>
              {formData.attachments.length > 0 && (
                <div className="mt-2 text-sm text-slate-600">
                  {formData.attachments.length} file(s) attached
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-orange-600 hover:bg-orange-700">
                Create Ticket
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Ticket Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm text-slate-500">{selectedTicket?.ticket_number}</span>
                {selectedTicket && getStatusBadge(selectedTicket.status)}
                {selectedTicket && getPriorityBadge(selectedTicket.priority)}
              </div>
              <DialogTitle className="text-2xl">{selectedTicket?.subject}</DialogTitle>
              <p className="text-sm text-slate-600">{selectedTicket?.description}</p>
            </div>
          </DialogHeader>

          <div className="mt-6 space-y-4">
            <h3 className="font-semibold text-lg">Conversation</h3>
            
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {ticketMessages.map(msg => (
                <div
                  key={msg.id}
                  className={`p-4 rounded-lg ${
                    msg.sender_type === 'admin' 
                      ? 'bg-cyan-50 border border-cyan-200' 
                      : 'bg-slate-50 border border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-sm">
                      {msg.sender_type === 'admin' ? '🎯 ' : ''}
                      {msg.sender_name}
                      {msg.sender_type === 'admin' && (
                        <Badge className="ml-2 bg-cyan-600 text-white text-xs">Support Team</Badge>
                      )}
                    </div>
                    <span className="text-xs text-slate-500">
                      {format(new Date(msg.created_date), 'MMM d, h:mm a')}
                    </span>
                  </div>
                  <p className="text-slate-700 whitespace-pre-wrap">{msg.message}</p>
                </div>
              ))}
            </div>

            {selectedTicket?.status !== 'closed' && selectedTicket?.status !== 'resolved' && (
              <div className="pt-4 border-t">
                <Label>Add a message</Label>
                <div className="flex gap-2 mt-2">
                  <Textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    rows={3}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    className="bg-cyan-600 hover:bg-cyan-700"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {(selectedTicket?.status === 'resolved' || selectedTicket?.status === 'closed') && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-700 font-semibold mb-2">
                  <CheckCircle className="w-5 h-5" />
                  Ticket {selectedTicket.status === 'resolved' ? 'Resolved' : 'Closed'}
                </div>
                {selectedTicket.resolution_notes && (
                  <p className="text-sm text-slate-700">{selectedTicket.resolution_notes}</p>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      </div>
      <SharedFooter />
    </div>
  );
}