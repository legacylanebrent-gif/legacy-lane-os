import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import SharedFooter from '@/components/layout/SharedFooter';
import {
  Bell, BellOff, CheckCheck, Trash2, Mail, MessageSquare,
  ShoppingBag, Home, DollarSign, Users, TrendingUp, Calendar,
  Award, GraduationCap, AlertCircle
} from 'lucide-react';

const ICON_MAP = {
  sale: Home,
  message: MessageSquare,
  payment: DollarSign,
  lead: TrendingUp,
  marketplace: ShoppingBag,
  event: Calendar,
  referral: Users,
  reward: Award,
  course: GraduationCap,
  system: Bell,
  alert: AlertCircle
};

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [filteredNotifications, setFilteredNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadUserAndNotifications();
  }, []);

  useEffect(() => {
    filterNotifications();
  }, [filter, notifications]);

  const loadUserAndNotifications = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);

      const notifs = await base44.entities.Notification.filter(
        { user_id: userData.id },
        '-created_date'
      );
      setNotifications(notifs);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterNotifications = () => {
    let filtered = notifications;

    if (filter === 'unread') {
      filtered = notifications.filter(n => !n.read);
    } else if (filter === 'read') {
      filtered = notifications.filter(n => n.read);
    }

    setFilteredNotifications(filtered);
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await base44.entities.Notification.update(notificationId, { read: true });
      setNotifications(notifications.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      ));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
      await Promise.all(
        unreadIds.map(id => base44.entities.Notification.update(id, { read: true }))
      );
      setNotifications(notifications.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleDelete = async (notificationId) => {
    if (!confirm('Delete this notification?')) return;

    try {
      await base44.entities.Notification.delete(notificationId);
      setNotifications(notifications.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Delete all notifications? This cannot be undone.')) return;

    try {
      await Promise.all(
        filteredNotifications.map(n => base44.entities.Notification.delete(n.id))
      );
      setNotifications(notifications.filter(n => !filteredNotifications.includes(n)));
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  const getIcon = (type) => {
    const Icon = ICON_MAP[type] || Bell;
    return Icon;
  };

  const getIconColor = (type) => {
    const colors = {
      sale: 'text-orange-600 bg-orange-100',
      message: 'text-cyan-600 bg-cyan-100',
      payment: 'text-green-600 bg-green-100',
      lead: 'text-blue-600 bg-blue-100',
      marketplace: 'text-purple-600 bg-purple-100',
      event: 'text-pink-600 bg-pink-100',
      referral: 'text-indigo-600 bg-indigo-100',
      reward: 'text-yellow-600 bg-yellow-100',
      course: 'text-teal-600 bg-teal-100',
      system: 'text-slate-600 bg-slate-100',
      alert: 'text-red-600 bg-red-100'
    };
    return colors[type] || 'text-slate-600 bg-slate-100';
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

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-20 bg-slate-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-serif font-bold text-slate-900 mb-2">Notifications</h1>
          <p className="text-slate-600">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}` : 'All caught up!'}
          </p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button
              onClick={handleMarkAllAsRead}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <CheckCheck className="w-4 h-4" />
              Mark All Read
            </Button>
          )}
          {filteredNotifications.length > 0 && (
            <Button
              onClick={handleClearAll}
              variant="outline"
              size="sm"
              className="gap-2 text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
              Clear All
            </Button>
          )}
        </div>
      </div>

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="all">
            All ({notifications.length})
          </TabsTrigger>
          <TabsTrigger value="unread">
            Unread ({unreadCount})
          </TabsTrigger>
          <TabsTrigger value="read">
            Read ({notifications.length - unreadCount})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <BellOff className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">
                {filter === 'unread' ? 'No unread notifications' : 'No notifications'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredNotifications.map(notification => {
            const Icon = getIcon(notification.type);
            const iconColor = getIconColor(notification.type);

            return (
              <Card
                key={notification.id}
                className={`transition-all hover:shadow-md ${
                  !notification.read ? 'bg-cyan-50 border-cyan-200' : 'bg-white'
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${iconColor}`}>
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <h3 className="font-semibold text-slate-900">{notification.title}</h3>
                        <span className="text-xs text-slate-500 whitespace-nowrap">
                          {formatDate(notification.created_date)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mb-2">{notification.message}</p>

                      <div className="flex items-center gap-2">
                        {!notification.read && (
                          <Button
                            onClick={() => handleMarkAsRead(notification.id)}
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50"
                          >
                            <CheckCheck className="w-3 h-3 mr-1" />
                            Mark as read
                          </Button>
                        )}
                        {notification.link && (
                          <Link to={notification.link}>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-slate-600 hover:text-slate-700"
                              onClick={() => !notification.read && handleMarkAsRead(notification.id)}
                            >
                              View →
                            </Button>
                          </Link>
                        )}
                        <Button
                          onClick={() => handleDelete(notification.id)}
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    {!notification.read && (
                      <div className="w-2 h-2 rounded-full bg-cyan-600 flex-shrink-0 mt-2"></div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
      </div>
      <SharedFooter />
    </div>
  );
}