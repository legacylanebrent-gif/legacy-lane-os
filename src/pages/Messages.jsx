import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, MessageSquare, Send } from 'lucide-react';
import { format } from 'date-fns';
import MessageModal from '@/components/messaging/MessageModal';

export default function Messages() {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState(null);

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);

      const allMessages = await base44.entities.Message.list('-created_date', 200);
      const userMessages = allMessages.filter(m => 
        m.sender_id === user.id || m.recipient_id === user.id
      );

      // Group by conversation
      const convMap = new Map();
      userMessages.forEach(msg => {
        const convId = msg.conversation_id;
        if (!convMap.has(convId)) {
          convMap.set(convId, {
            id: convId,
            messages: [],
            otherParty: msg.sender_id === user.id 
              ? { id: msg.recipient_id, name: msg.recipient_name }
              : { id: msg.sender_id, name: msg.sender_name },
            lastMessage: msg,
            unreadCount: 0
          });
        }
        convMap.get(convId).messages.push(msg);
        if (msg.recipient_id === user.id && !msg.read) {
          convMap.get(convId).unreadCount++;
        }
      });

      const convList = Array.from(convMap.values()).sort((a, b) => 
        new Date(b.lastMessage.created_date) - new Date(a.lastMessage.created_date)
      );

      setConversations(convList);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConversationClick = (conv) => {
    setSelectedRecipient(conv.otherParty);
    setMessageModalOpen(true);
  };

  const filteredConversations = conversations.filter(conv =>
    conv.otherParty.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.lastMessage.message?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const unreadTotal = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-pulse text-slate-600">Loading messages...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-serif font-bold text-slate-900">Messages</h1>
            <p className="text-slate-600 mt-1">
              {unreadTotal > 0 && `${unreadTotal} unread message${unreadTotal > 1 ? 's' : ''}`}
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {filteredConversations.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 text-lg">No messages yet</p>
                <p className="text-slate-400 text-sm">Start a conversation from an estate sale or contact</p>
              </div>
            ) : (
              <ScrollArea className="h-[600px]">
                <div className="space-y-2">
                  {filteredConversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => handleConversationClick(conv)}
                      className="w-full text-left p-4 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white font-semibold">
                            {conv.otherParty.name?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">{conv.otherParty.name}</div>
                            <div className="text-xs text-slate-500">
                              {format(new Date(conv.lastMessage.created_date), 'MMM d, h:mm a')}
                            </div>
                          </div>
                        </div>
                        {conv.unreadCount > 0 && (
                          <Badge className="bg-orange-600">{conv.unreadCount}</Badge>
                        )}
                      </div>
                      <div className="text-sm text-slate-600 truncate ml-12">
                        {conv.lastMessage.sender_id === currentUser.id ? 'You: ' : ''}
                        {conv.lastMessage.message}
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedRecipient && (
        <MessageModal
          open={messageModalOpen}
          onClose={() => {
            setMessageModalOpen(false);
            loadMessages();
          }}
          recipient={selectedRecipient}
        />
      )}
    </div>
  );
}