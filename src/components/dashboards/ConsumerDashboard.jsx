import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MapPin, ShoppingBag, Home, GraduationCap, Users, Package, MessageSquare, Heart, Calendar, Eye, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function ConsumerDashboard({ user }) {
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecentActivity();
  }, []);

  const loadRecentActivity = async () => {
    try {
      const activities = [];

      // Load user's messages
      const messages = await base44.entities.Message.filter({ 
        recipient_id: user.id 
      }, '-created_date', 5);
      messages.forEach(msg => {
        activities.push({
          type: 'message',
          icon: MessageSquare,
          title: 'New message from ' + msg.sender_name,
          description: msg.message.substring(0, 60) + (msg.message.length > 60 ? '...' : ''),
          timestamp: msg.created_date,
          link: null,
          color: 'blue'
        });
      });

      // Load notifications
      const notifications = await base44.entities.Notification.filter({
        user_id: user.id
      }, '-created_date', 5);
      notifications.forEach(notif => {
        activities.push({
          type: 'notification',
          icon: notif.type === 'sale_update' ? Home : MessageSquare,
          title: notif.title || 'Notification',
          description: notif.message,
          timestamp: notif.created_date,
          link: notif.link,
          color: notif.read ? 'gray' : 'orange'
        });
      });

      // Load saved estate sales
      const savedSaleIds = JSON.parse(localStorage.getItem('savedSales') || '[]');
      if (savedSaleIds.length > 0) {
        const sales = await base44.entities.EstateSale.list('-created_date', 50);
        const recentSaved = sales
          .filter(s => savedSaleIds.includes(s.id))
          .slice(0, 3);
        recentSaved.forEach(sale => {
          activities.push({
            type: 'saved_sale',
            icon: Heart,
            title: 'Saved estate sale',
            description: sale.title,
            timestamp: sale.updated_date,
            link: createPageUrl('EstateSaleDetail') + '?id=' + sale.id,
            color: 'red'
          });
        });
      }

      // Load orders
      const orders = await base44.entities.Order.filter({
        buyer_id: user.id
      }, '-created_date', 3);
      orders.forEach(order => {
        activities.push({
          type: 'order',
          icon: ShoppingBag,
          title: 'Order ' + order.status,
          description: 'Order #' + order.order_number + ' - $' + order.total.toFixed(2),
          timestamp: order.created_date,
          link: null,
          color: 'green'
        });
      });

      // Sort all activities by timestamp
      activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setRecentActivity(activities.slice(0, 10));
    } catch (error) {
      console.error('Error loading activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      title: 'Find Estate Sales',
      description: 'Discover estate sales in your area',
      icon: MapPin,
      link: 'EstateSaleFinder',
      color: 'blue'
    },
    {
      title: 'Browse Marketplace',
      description: 'Shop unique items from sellers',
      icon: ShoppingBag,
      link: 'BrowseItems',
      color: 'green'
    },
    {
      title: 'My Listings',
      description: 'Manage items you are selling',
      icon: Package,
      link: 'MyListings',
      color: 'purple'
    },
    {
      title: 'Take Courses',
      description: 'Learn from industry experts',
      icon: GraduationCap,
      link: 'Courses',
      color: 'amber'
    }
  ];

  const colorMap = {
    blue: { bg: 'bg-blue-500', text: 'text-blue-600', border: 'border-blue-200' },
    green: { bg: 'bg-green-500', text: 'text-green-600', border: 'border-green-200' },
    purple: { bg: 'bg-purple-500', text: 'text-purple-600', border: 'border-purple-200' },
    amber: { bg: 'bg-amber-500', text: 'text-amber-600', border: 'border-amber-200' }
  };

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-4xl font-serif font-bold text-navy-900 mb-2">
          Welcome, {user.full_name}
        </h1>
        <p className="text-slate-600">Explore Legacy Lane services</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {quickActions.map((action, index) => {
          const colors = colorMap[action.color];
          return (
            <Link key={index} to={createPageUrl(action.link)}>
              <Card className={`cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1 border-2 ${colors.border} hover:${colors.border}`}>
                <CardHeader>
                  <div className={`w-12 h-12 rounded-lg ${colors.bg} bg-opacity-20 flex items-center justify-center mb-3`}>
                    <action.icon className={`h-6 w-6 ${colors.text}`} />
                  </div>
                  <CardTitle className="text-lg font-serif text-navy-900">
                    {action.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600">{action.description}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-serif text-navy-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-600" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse flex gap-3">
                    <div className="w-10 h-10 bg-slate-200 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-slate-200 rounded w-3/4" />
                      <div className="h-3 bg-slate-200 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No recent activity</p>
                <p className="text-sm text-slate-400 mt-1">
                  Start exploring estate sales and marketplace items
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {recentActivity.map((activity, idx) => {
                    const colorMap = {
                      blue: 'text-blue-600 bg-blue-50',
                      orange: 'text-orange-600 bg-orange-50',
                      red: 'text-red-600 bg-red-50',
                      green: 'text-green-600 bg-green-50',
                      gray: 'text-slate-600 bg-slate-50'
                    };
                    const colors = colorMap[activity.color] || 'text-slate-600 bg-slate-50';
                    
                    const content = (
                      <div className="flex gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                        <div className={`w-10 h-10 rounded-lg ${colors} flex items-center justify-center flex-shrink-0`}>
                          <activity.icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-slate-900 text-sm">
                            {activity.title}
                          </div>
                          <div className="text-sm text-slate-600 truncate">
                            {activity.description}
                          </div>
                          <div className="text-xs text-slate-400 mt-1">
                            {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                          </div>
                        </div>
                      </div>
                    );

                    return activity.link ? (
                      <Link key={idx} to={activity.link}>
                        {content}
                      </Link>
                    ) : (
                      <div key={idx}>{content}</div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-serif text-navy-900">Popular Courses</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-500">Recommended courses will appear here</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}