import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import HeaderPanel from '@/components/layout/HeaderPanel';
import { Bell, MessageSquare, Calendar, AlertCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function NotificationsDropdown() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [markingAll, setMarkingAll] = useState(false);

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

  const markAllAsRead = async () => {
    if (unreadCount === 0) return;
    setMarkingAll(true);
    try {
      await base44.entities.Notification.updateMany(
        { user_id: user.id, read: false },
        { $set: { read: true } }
      );
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    } finally {
      setMarkingAll(false);
    }
  };

  const openNotification = (notif) => {
    markAsRead(notif.id);
    setOpen(false);
    if (notif.link_to_page) {
      const url = `/${notif.link_to_page}${notif.link_params ? `?${notif.link_params}` : ''}`;
      navigate(url);
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
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label="Notifications"
        className="relative text-orange-400 hover:text-orange-300 hover:bg-slate-700"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-orange-600 text-white text-xs border-2 border-slate-800">
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>

      <HeaderPanel
        open={open}
        onClose={() => setOpen(false)}
        title="Notifications"
        subtitle={`${unreadCount} unread`}
        widthClass="sm:w-96"
      >
        {unreadCount > 0 && (
          <div className="sticky top-0 z-10 flex items-center justify-end border-b border-slate-100 bg-white/95 px-4 py-2 backdrop-blur">
            <button
              type="button"
              onClick={markAllAsRead}
              disabled={markingAll}
              className="text-xs font-semibold text-cyan-700 hover:text-cyan-900 disabled:opacity-50"
            >
              {markingAll ? 'Marking…' : 'Mark all read'}
            </button>
          </div>
        )}
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            No notifications yet
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {notifications.map((notif) => (
              <button
                key={notif.id}
                type="button"
                onClick={() => openNotification(notif)}
                className={`w-full text-left p-4 hover:bg-slate-50 active:bg-slate-100 transition-colors ${
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
                      {format(parseISO(notif.created_date), 'MMM d, h:mm a')}
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
      </HeaderPanel>
    </>
  );
}