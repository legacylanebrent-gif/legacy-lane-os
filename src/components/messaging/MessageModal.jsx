import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, X } from 'lucide-react';
import { format } from 'date-fns';

export default function MessageModal({ open, onClose, recipient, relatedEntity }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [conversationId, setConversationId] = useState(null);

  useEffect(() => {
    if (open && recipient) {
      loadUser();
      loadConversation();
    }
  }, [open, recipient]);

  const loadUser = async () => {
    const user = await base44.auth.me();
    setCurrentUser(user);
  };

  const loadConversation = async () => {
    if (!recipient?.id) return;

    try {
      const user = await base44.auth.me();
      
      // Load existing messages between these users
      const allMessages = await base44.entities.Message.list('-created_date', 100);
      const conversation = allMessages.filter(m => 
        (m.sender_id === user.id && m.recipient_id === recipient.id) ||
        (m.sender_id === recipient.id && m.recipient_id === user.id)
      );

      if (conversation.length > 0) {
        setConversationId(conversation[0].conversation_id);
        setMessages(conversation.reverse());
        
        // Mark messages as read
        const unreadMessages = conversation.filter(m => 
          m.recipient_id === user.id && !m.read
        );
        for (const msg of unreadMessages) {
          await base44.entities.Message.update(msg.id, { read: true });
        }
      } else {
        // Generate new conversation ID
        setConversationId(`conv_${Date.now()}_${user.id}_${recipient.id}`);
      }

      // Set default subject if related entity provided
      if (relatedEntity && !subject) {
        setSubject(`Re: ${relatedEntity.title || relatedEntity.name || 'Inquiry'}`);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !currentUser || !recipient) return;

    setLoading(true);
    try {
      const messageData = {
        sender_id: currentUser.id,
        sender_name: currentUser.full_name,
        recipient_id: recipient.id,
        recipient_name: recipient.full_name || recipient.company_name || 'User',
        subject: subject || 'Message',
        message: newMessage,
        conversation_id: conversationId,
        read: false
      };

      if (relatedEntity) {
        messageData.related_entity_type = relatedEntity.type;
        messageData.related_entity_id = relatedEntity.id;
      }

      const created = await base44.entities.Message.create(messageData);
      setMessages([...messages, created]);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Message {recipient?.full_name || recipient?.company_name || 'User'}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {messages.length === 0 && (
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Subject</label>
              <Input
                placeholder="Message subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
          )}

          {messages.length > 0 && (
            <ScrollArea className="h-96 border rounded-lg p-4">
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_id === currentUser?.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        msg.sender_id === currentUser?.id
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
          )}

          <div className="space-y-2">
            <Textarea
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              rows={4}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  handleSend();
                }
              }}
            />
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500">Press Ctrl+Enter to send</span>
              <Button
                onClick={handleSend}
                disabled={loading || !newMessage.trim()}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <Send className="w-4 h-4 mr-2" />
                Send
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}