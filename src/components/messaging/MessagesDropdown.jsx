import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import HeaderPanel from '@/components/layout/HeaderPanel';
import { Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function MessagesDropdown() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadMessages = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);

      const allMessages = await base44.entities.Message.filter(
        { recipient_id: userData.id },
        '-created_date',
        10
      );

      // Group by conversation (sender)
      const conversationMap = new Map();
      allMessages.forEach(msg => {
        if (!conversationMap.has(msg.sender_id)) {
          conversationMap.set(msg.sender_id, {
            lastMessage: msg,
            unread: !msg.read,
            sender_name: msg.sender_name,
            sender_id: msg.sender_id
          });
        }
      });

      const conversations = Array.from(conversationMap.values());
      setMessages(conversations);

      const unread = allMessages.filter(m => !m.read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const goToMessages = () => {
    setOpen(false);
    navigate(createPageUrl('Messages'));
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label="Messages"
        className="relative text-orange-400 hover:text-orange-300 hover:bg-slate-700"
      >
        <Mail className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-orange-600 text-white text-xs border-2 border-slate-800">
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>

      <HeaderPanel
        open={open}
        onClose={() => setOpen(false)}
        title="Messages"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : undefined}
        widthClass="sm:w-80"
      >
        {messages.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <Mail className="w-12 h-12 mx-auto mb-2 text-slate-300" />
            <p className="text-sm">No messages yet</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {messages.map((conversation, idx) => (
              <button
                key={idx}
                type="button"
                onClick={goToMessages}
                className="block w-full p-3 text-left hover:bg-slate-50 active:bg-slate-100 transition-colors"
              >
                <div className="flex items-start gap-3 w-full">
                  <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center flex-shrink-0 font-semibold">
                    {conversation.sender_name?.charAt(0) || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm text-slate-900">
                        {conversation.sender_name || 'User'}
                      </span>
                      <span className="text-xs text-slate-500">
                        {formatDate(conversation.lastMessage.created_date)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 truncate">
                      {conversation.lastMessage.content}
                    </p>
                  </div>
                  {conversation.unread && (
                    <div className="w-2 h-2 rounded-full bg-orange-600 flex-shrink-0 mt-2"></div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="border-t border-slate-200">
          <button
            type="button"
            onClick={goToMessages}
            className="block w-full p-3 text-center text-orange-600 hover:text-orange-700 hover:bg-slate-50 active:bg-slate-100 font-medium"
          >
            View All Messages
          </button>
        </div>
      </HeaderPanel>
    </>
  );
}