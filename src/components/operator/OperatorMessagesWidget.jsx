import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Send, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

export default function OperatorMessagesWidget({ user }) {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const allMessages = await base44.entities.Message.list('-created_date', 100);
      const userMessages = allMessages.filter(
        (m) => m.sender_id === user.id || m.recipient_id === user.id
      );

      const conversationMap = {};
      userMessages.forEach((msg) => {
        const convId = msg.conversation_id;
        if (!conversationMap[convId]) {
          conversationMap[convId] = {
            id: convId,
            messages: [],
            lastMessage: msg,
            otherParty:
              msg.sender_id === user.id
                ? { id: msg.recipient_id, name: msg.recipient_name }
                : { id: msg.sender_id, name: msg.sender_name },
            unread: 0,
          };
        }
        conversationMap[convId].messages.push(msg);
        if (msg.recipient_id === user.id && !msg.read) {
          conversationMap[convId].unread++;
        }
      });

      const convList = Object.values(conversationMap).sort(
        (a, b) => new Date(b.lastMessage.created_date) - new Date(a.lastMessage.created_date)
      );

      setConversations(convList);
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const openConversation = async (conversation) => {
    setSelectedConversation(conversation);
    setMessages(conversation.messages.sort((a, b) => new Date(a.created_date) - new Date(b.created_date)));
    setModalOpen(true);

    // Mark as read
    const unreadMessages = conversation.messages.filter(
      (m) => m.recipient_id === user.id && !m.read
    );
    for (const msg of unreadMessages) {
      try {
        await base44.entities.Message.update(msg.id, { read: true });
      } catch (error) {
        console.error('Error marking message as read:', error);
      }
    }

    loadConversations();
  };

  const handleSendReply = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    setLoading(true);
    try {
      const messageData = {
        sender_id: user.id,
        sender_name: user.full_name || user.company_name,
        recipient_id: selectedConversation.otherParty.id,
        recipient_name: selectedConversation.otherParty.name,
        subject: selectedConversation.lastMessage.subject || 'Re: Message',
        message: newMessage,
        conversation_id: selectedConversation.id,
        read: false,
      };

      const created = await base44.entities.Message.create(messageData);
      setMessages([...messages, created]);
      setNewMessage('');
      loadConversations();
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread, 0);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-xl font-semibold">Recent Messages</CardTitle>
          <Link to={createPageUrl('Messages')}>
            <Button variant="ghost" size="sm" className="gap-2">
              View All
              <ExternalLink className="w-4 h-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {conversations.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>No messages yet</p>
            </div>
          ) : (
            <ScrollArea className="h-96">
              <div className="space-y-2">
                {conversations.slice(0, 10).map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => openConversation(conv)}
                    className="w-full text-left p-3 rounded-lg hover:bg-slate-50 transition-colors border border-slate-200"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="font-medium text-slate-900">{conv.otherParty.name}</div>
                      {conv.unread > 0 && (
                        <Badge className="bg-orange-600">{conv.unread}</Badge>
                      )}
                    </div>
                    <div className="text-sm text-slate-600 line-clamp-2">
                      {conv.lastMessage.message}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {format(new Date(conv.lastMessage.created_date), 'MMM d, h:mm a')}
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Message Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Conversation with {selectedConversation?.otherParty.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <ScrollArea className="h-96 border rounded-lg p-4">
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        msg.sender_id === user.id
                          ? 'bg-orange-600 text-white'
                          : 'bg-slate-100 text-slate-900'
                      }`}
                    >
                      <div className="text-xs opacity-75 mb-1">
                        {msg.sender_name} • {format(new Date(msg.created_date), 'MMM d, h:mm a')}
                      </div>
                      <div className="whitespace-pre-wrap">{msg.message}</div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="space-y-2">
              <Textarea
                placeholder="Type your reply..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                rows={3}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.ctrlKey) {
                    handleSendReply();
                  }
                }}
              />
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Press Ctrl+Enter to send</span>
                <Button
                  onClick={handleSendReply}
                  disabled={loading || !newMessage.trim()}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send Reply
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}