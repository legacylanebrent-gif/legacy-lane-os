import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { Star, Send, UserCheck, Calendar, Clock, Users, CheckCircle, XCircle, Ticket, QrCode } from 'lucide-react';

export default function VIPEventManager({ event }) {
  const [invites, setInvites] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newInvite, setNewInvite] = useState({ name: '', email: '', phone: '' });
  const [checkInCode, setCheckInCode] = useState('');

  useEffect(() => {
    loadData();
  }, [event.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [invitesData, ticketsData] = await Promise.all([
        base44.entities.VIPInvite.filter({ event_id: event.id }),
        base44.entities.VIPTicket.filter({ event_id: event.id })
      ]);
      setInvites(invitesData);
      setTickets(ticketsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddInvite = async () => {
    if (!newInvite.name || !newInvite.email) {
      alert('Please enter name and email');
      return;
    }

    try {
      await base44.entities.VIPInvite.create({
        event_id: event.id,
        name: newInvite.name,
        email: newInvite.email,
        phone: newInvite.phone,
        status: 'pending',
        invited_date: new Date().toISOString()
      });

      setNewInvite({ name: '', email: '', phone: '' });
      loadData();
    } catch (error) {
      console.error('Error adding invite:', error);
      alert('Failed to add invite');
    }
  };

  const handleSendInvites = async () => {
    setSending(true);
    try {
      const pendingInvites = invites.filter(inv => inv.status === 'pending');
      
      for (const invite of pendingInvites) {
        await base44.integrations.Core.SendEmail({
          to: invite.email,
          subject: `VIP Invitation: ${event.title}`,
          body: `Dear ${invite.name},

You're invited to our exclusive VIP pre-sale event!

Event: ${event.title}
Date: ${format(new Date(event.event_date), 'MMMM d, yyyy')}
Time: ${event.start_time} - ${event.end_time}

${event.description || ''}

Please RSVP by responding to this email.

Best regards`
        });
      }

      alert(`Sent ${pendingInvites.length} invitation(s)`);
    } catch (error) {
      console.error('Error sending invites:', error);
      alert('Failed to send invites');
    } finally {
      setSending(false);
    }
  };

  const handleAcceptRSVP = async (invite) => {
    try {
      await base44.entities.VIPInvite.update(invite.id, {
        status: 'accepted',
        responded_date: new Date().toISOString()
      });

      // Generate ticket
      const ticketCode = `VIP-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      await base44.entities.VIPTicket.create({
        invite_id: invite.id,
        event_id: event.id,
        ticket_code: ticketCode,
        attendee_name: invite.name,
        attendee_email: invite.email,
        checked_in: false
      });

      // Send ticket email
      await base44.integrations.Core.SendEmail({
        to: invite.email,
        subject: `Your VIP Ticket - ${event.title}`,
        body: `Dear ${invite.name},

Your RSVP has been confirmed! Here's your VIP ticket:

Ticket Code: ${ticketCode}
Event: ${event.title}
Date: ${format(new Date(event.event_date), 'MMMM d, yyyy')}
Time: ${event.start_time} - ${event.end_time}

Please present this ticket code when you arrive at the event.

See you there!`
      });

      loadData();
      alert('RSVP accepted and ticket sent!');
    } catch (error) {
      console.error('Error accepting RSVP:', error);
      alert('Failed to process RSVP');
    }
  };

  const handleCheckIn = async () => {
    if (!checkInCode.trim()) return;

    try {
      const ticket = tickets.find(t => t.ticket_code === checkInCode.trim());
      
      if (!ticket) {
        alert('Ticket not found');
        return;
      }

      if (ticket.checked_in) {
        alert('This ticket has already been used');
        return;
      }

      await base44.entities.VIPTicket.update(ticket.id, {
        checked_in: true,
        check_in_time: new Date().toISOString()
      });

      setCheckInCode('');
      loadData();
      alert(`✓ Checked in: ${ticket.attendee_name}`);
    } catch (error) {
      console.error('Error checking in:', error);
      alert('Failed to check in');
    }
  };

  const stats = {
    totalInvites: invites.length,
    accepted: invites.filter(i => i.status === 'accepted').length,
    declined: invites.filter(i => i.status === 'declined').length,
    pending: invites.filter(i => i.status === 'pending').length,
    checkedIn: tickets.filter(t => t.checked_in).length
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Event Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-600" />
                {event.title}
              </CardTitle>
              <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(event.event_date), 'MMMM d, yyyy')}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {event.start_time} - {event.end_time}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  Max: {event.max_attendees}
                </span>
              </div>
            </div>
            <Badge className="bg-yellow-600">{event.status}</Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.totalInvites}</div>
            <div className="text-sm text-slate-600">Total Invites</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats.accepted}</div>
            <div className="text-sm text-slate-600">Accepted</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
            <div className="text-sm text-slate-600">Pending</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">{stats.declined}</div>
            <div className="text-sm text-slate-600">Declined</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{stats.checkedIn}</div>
            <div className="text-sm text-slate-600">Checked In</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="invites">
        <TabsList>
          <TabsTrigger value="invites">Invites & RSVPs</TabsTrigger>
          <TabsTrigger value="checkin">Check-In</TabsTrigger>
          <TabsTrigger value="tickets">All Tickets</TabsTrigger>
        </TabsList>

        <TabsContent value="invites" className="space-y-4">
          {/* Add Invite */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Add VIP Invite</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-3">
                <Input
                  placeholder="Name"
                  value={newInvite.name}
                  onChange={(e) => setNewInvite({...newInvite, name: e.target.value})}
                />
                <Input
                  placeholder="Email"
                  type="email"
                  value={newInvite.email}
                  onChange={(e) => setNewInvite({...newInvite, email: e.target.value})}
                />
                <Input
                  placeholder="Phone (optional)"
                  value={newInvite.phone}
                  onChange={(e) => setNewInvite({...newInvite, phone: e.target.value})}
                />
                <Button onClick={handleAddInvite} className="bg-yellow-600 hover:bg-yellow-700">
                  Add Invite
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Send Invites Button */}
          {stats.pending > 0 && (
            <Button 
              onClick={handleSendInvites}
              disabled={sending}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <Send className="w-4 h-4 mr-2" />
              {sending ? 'Sending...' : `Send ${stats.pending} Pending Invite(s)`}
            </Button>
          )}

          {/* Invites List */}
          <div className="space-y-2">
            {invites.map((invite) => (
              <Card key={invite.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{invite.name}</div>
                      <div className="text-sm text-slate-600">{invite.email}</div>
                      {invite.phone && (
                        <div className="text-sm text-slate-600">{invite.phone}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={
                        invite.status === 'accepted' ? 'bg-green-600' :
                        invite.status === 'declined' ? 'bg-red-600' :
                        'bg-orange-600'
                      }>
                        {invite.status}
                      </Badge>
                      {invite.status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={() => handleAcceptRSVP(invite)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Accept RSVP
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="checkin">
          <Card>
            <CardHeader>
              <CardTitle>Scan Ticket Code</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <Input
                  placeholder="Enter ticket code"
                  value={checkInCode}
                  onChange={(e) => setCheckInCode(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCheckIn()}
                  className="flex-1"
                />
                <Button onClick={handleCheckIn} className="bg-blue-600 hover:bg-blue-700">
                  <UserCheck className="w-4 h-4 mr-2" />
                  Check In
                </Button>
              </div>

              <div className="text-sm text-slate-600">
                {stats.checkedIn} of {tickets.length} attendees checked in
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tickets" className="space-y-2">
          {tickets.map((ticket) => (
            <Card key={ticket.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{ticket.attendee_name}</div>
                    <div className="text-sm text-slate-600 font-mono">{ticket.ticket_code}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    {ticket.checked_in ? (
                      <Badge className="bg-green-600">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Checked In
                      </Badge>
                    ) : (
                      <Badge variant="outline">Not Checked In</Badge>
                    )}
                    {ticket.check_in_time && (
                      <div className="text-xs text-slate-500">
                        {format(new Date(ticket.check_in_time), 'MMM d, h:mm a')}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}