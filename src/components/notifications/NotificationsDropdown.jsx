import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Bell, MessageSquare, Calendar, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function NotificationsDropdown({ user }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      loadNotifications();
      const interval = setInterval(loadNotifications, 30000); // Poll every 30s
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadNotifications = async () => {
    try {
      const allNotifs = await base44.entities.Notification.filter(
        { user_id: user.id },
        '-created_date',
        20
      );
      setNotifications(allNotifs);
      setUnreadCount(allNotifs.filter(n => !n.read).length);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const markAsRead = async (notifId) => {
    try {
      await base44.entities.Notification.update(notifId, { read: true });
      loadNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'message':
        return <MessageSquare className="w-4 h-4 text-orange-600" />;
      case 'sale_update':
        return <Calendar className="w-4 h-4 text-cyan-600" />;
      case 'reminder':
        return <Bell className="w-4 h-4 text-slate-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-orange-400 hover:text-orange-300 hover:bg-slate-700">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-orange-600 text-white text-xs border-2 border-slate-800">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96">
        <div className="p-3 border-b">
          <h3 className="font-semibold text-slate-900">Notifications</h3>
          <p className="text-xs text-slate-500">{unreadCount} unread</p>
        </div>
        <ScrollArea className="h-96">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              No notifications yet
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => {
                    markAsRead(notif.id);
                    if (notif.link) {
                      window.location.href = notif.link;
                    }
                  }}
                  className={`w-full text-left p-4 hover:bg-slate-50 transition-colors ${
                    !notif.read ? 'bg-orange-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">{getIcon(notif.type)}</div>
                    <div className="flex-1 min-w-0">
                      {notif.title && (
                        <div className="font-medium text-slate-900 text-sm mb-1">
                          {notif.title}
                        </div>
                      )}
                      <div className="text-sm text-slate-700">{notif.message}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        {format(new Date(notif.created_date), 'MMM d, h:mm a')}
                      </div>
                    </div>
                    {!notif.read && (
                      <div className="w-2 h-2 bg-orange-600 rounded-full mt-2" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}