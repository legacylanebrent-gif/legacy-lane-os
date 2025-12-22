import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, MessageSquare, Clock, User, Send, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminTickets() {
  const [tickets, setTickets] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketMessages, setTicketMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterTickets();
  }, [searchQuery, statusFilter, tickets]);

  const loadData = async () => {
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);

      const ticketsData = await base44.asServiceRole.entities.Ticket.list('-created_date');
      setTickets(ticketsData);

      const users = await base44.asServiceRole.entities.User.list();
      const admins = users.filter(u => 
        ['super_admin', 'platform_ops', 'growth_team', 'partnerships', 'education_admin', 'finance_admin'].includes(u.primary_account_type)
      );
      setAdminUsers(admins);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterTickets = () => {
    let filtered = tickets;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(ticket =>
        ticket.ticket_number?.toLowerCase().includes(query) ||
        ticket.subject?.toLowerCase().includes(query) ||
        ticket.user_name?.toLowerCase().includes(query) ||
        ticket.user_email?.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.status === statusFilter);
    }

    setFilteredTickets(filtered);
  };

  const loadTicketMessages = async (ticketId) => {
    try {
      const messages = await base44.asServiceRole.entities.TicketMessage.filter({ ticket_id: ticketId }, 'created_date');
      setTicketMessages(messages);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const openTicketDetail = (ticket) => {
    setSelectedTicket(ticket);
    loadTicketMessages(ticket.id);
    setShowDetailModal(true);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      await base44.asServiceRole.entities.TicketMessage.create({
        ticket_id: selectedTicket.id,
        sender_id: currentUser.id,
        sender_name: currentUser.full_name,
        sender_type: 'admin',
        message: newMessage,
        is_internal: isInternalNote
      });

      await base44.asServiceRole.entities.Ticket.update(selectedTicket.id, {
        last_response_date: new Date().toISOString(),
        status: isInternalNote ? selectedTicket.status : 'waiting_response'
      });

      setNewMessage('');
      setIsInternalNote(false);
      loadTicketMessages(selectedTicket.id);
      loadData();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleUpdateStatus = async (ticketId, newStatus) => {
    try {
      const updates = { status: newStatus };
      if (newStatus === 'resolved') {
        updates.resolved_date = new Date().toISOString();
      }
      await base44.asServiceRole.entities.Ticket.update(ticketId, updates);
      loadData();
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, ...updates });
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleAssignTicket = async (ticketId, adminUserId) => {
    try {
      const admin = adminUsers.find(a => a.id === adminUserId);
      await base44.asServiceRole.entities.Ticket.update(ticketId, {
        assigned_to: adminUserId,
        assigned_to_name: admin?.full_name,
        status: 'in_progress'
      });
      loadData();
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({ 
          ...selectedTicket, 
          assigned_to: adminUserId, 
          assigned_to_name: admin?.full_name,
          status: 'in_progress'
        });
      }
    } catch (error) {
      console.error('Error assigning ticket:', error);
    }
  };

  const handleUpdatePriority = async (ticketId, newPriority) => {
    try {
      await base44.asServiceRole.entities.Ticket.update(ticketId, { priority: newPriority });
      loadData();
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, priority: newPriority });
      }
    } catch (error) {
      console.error('Error updating priority:', error);
    }
  };

  const getStatusBadge = (status) => {
    const configs = {
      open: { label: 'Open', className: 'bg-blue-100 text-blue-700' },
      in_progress: { label: 'In Progress', className: 'bg-yellow-100 text-yellow-700' },
      waiting_response: { label: 'Waiting User', className: 'bg-orange-100 text-orange-700' },
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

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    waiting_response: tickets.filter(t => t.status === 'waiting_response').length
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
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-4xl font-serif font-bold text-slate-900 mb-2">Support Tickets</h1>
        <p className="text-slate-600">Manage customer support requests</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
            <div className="text-sm text-slate-600">Total Tickets</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.open}</div>
            <div className="text-sm text-slate-600">Open</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.in_progress}</div>
            <div className="text-sm text-slate-600">In Progress</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">{stats.waiting_response}</div>
            <div className="text-sm text-slate-600">Waiting User</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                placeholder="Search by ticket #, subject, user name, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Tabs value={statusFilter} onValueChange={setStatusFilter}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="open">Open</TabsTrigger>
                <TabsTrigger value="in_progress">In Progress</TabsTrigger>
                <TabsTrigger value="waiting_response">Waiting</TabsTrigger>
                <TabsTrigger value="resolved">Resolved</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Tickets List */}
      <div className="grid gap-4">
        {filteredTickets.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <MessageSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No tickets found</p>
            </CardContent>
          </Card>
        ) : (
          filteredTickets.map(ticket => (
            <Card
              key={ticket.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => openTicketDetail(ticket)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className="font-mono text-sm font-semibold text-slate-700">{ticket.ticket_number}</span>
                      {getStatusBadge(ticket.status)}
                      {getPriorityBadge(ticket.priority)}
                      <Badge variant="outline" className="text-xs">{ticket.category?.replace(/_/g, ' ')}</Badge>
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">{ticket.subject}</h3>
                    <p className="text-slate-600 text-sm line-clamp-2 mb-3">{ticket.description}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {ticket.user_name} ({ticket.account_type?.replace(/_/g, ' ')})
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(ticket.created_date), 'MMM d, yyyy h:mm a')}
                      </div>
                      {ticket.assigned_to_name && (
                        <div>Assigned: {ticket.assigned_to_name}</div>
                      )}
                    </div>
                  </div>
                  {ticket.status === 'open' && (
                    <div className="text-blue-600 text-sm font-medium flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      New
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Ticket Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-mono text-sm font-semibold text-slate-700">{selectedTicket?.ticket_number}</span>
                {selectedTicket && getStatusBadge(selectedTicket.status)}
                {selectedTicket && getPriorityBadge(selectedTicket.priority)}
              </div>
              <DialogTitle className="text-2xl">{selectedTicket?.subject}</DialogTitle>
              <p className="text-sm text-slate-600">{selectedTicket?.description}</p>
              <div className="flex items-center gap-4 text-sm text-slate-600">
                <div><strong>User:</strong> {selectedTicket?.user_name}</div>
                <div><strong>Email:</strong> {selectedTicket?.user_email}</div>
                <div><strong>Account:</strong> {selectedTicket?.account_type?.replace(/_/g, ' ')}</div>
              </div>
            </div>
          </DialogHeader>

          {/* Admin Controls */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg">
            <div>
              <Label className="text-xs">Status</Label>
              <Select
                value={selectedTicket?.status}
                onValueChange={(value) => handleUpdateStatus(selectedTicket?.id, value)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="waiting_response">Waiting User</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Priority</Label>
              <Select
                value={selectedTicket?.priority}
                onValueChange={(value) => handleUpdatePriority(selectedTicket?.id, value)}
              >
                <SelectTrigger className="h-9">
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

            <div>
              <Label className="text-xs">Assign To</Label>
              <Select
                value={selectedTicket?.assigned_to || 'unassigned'}
                onValueChange={(value) => handleAssignTicket(selectedTicket?.id, value)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {adminUsers.map(admin => (
                    <SelectItem key={admin.id} value={admin.id}>
                      {admin.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Conversation */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Conversation</h3>
            
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {ticketMessages.map(msg => (
                <div
                  key={msg.id}
                  className={`p-4 rounded-lg ${
                    msg.is_internal
                      ? 'bg-purple-50 border-2 border-purple-300'
                      : msg.sender_type === 'admin' 
                        ? 'bg-cyan-50 border border-cyan-200' 
                        : 'bg-slate-50 border border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-sm">
                      {msg.sender_type === 'admin' ? '🎯 ' : '👤 '}
                      {msg.sender_name}
                      {msg.sender_type === 'admin' && (
                        <Badge className="ml-2 bg-cyan-600 text-white text-xs">Support Team</Badge>
                      )}
                      {msg.is_internal && (
                        <Badge className="ml-2 bg-purple-600 text-white text-xs">Internal Note</Badge>
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

            {/* Reply */}
            {selectedTicket?.status !== 'closed' && (
              <div className="pt-4 border-t space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="internal"
                    checked={isInternalNote}
                    onChange={(e) => setIsInternalNote(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="internal" className="text-sm cursor-pointer">
                    Internal note (not visible to user)
                  </Label>
                </div>
                <div className="flex gap-2">
                  <Textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={isInternalNote ? "Add internal note..." : "Reply to user..."}
                    rows={3}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    className={isInternalNote ? "bg-purple-600 hover:bg-purple-700" : "bg-cyan-600 hover:bg-cyan-700"}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}