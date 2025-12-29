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
  const [recommendations, setRecommendations] = useState({ sales: [], items: [] });
  const [loading, setLoading] = useState(true);
  const [loadingRecommendations, setLoadingRecommendations] = useState(true);

  useEffect(() => {
    loadRecentActivity();
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    try {
      const response = await base44.functions.invoke('getRecommendations', {});
      setRecommendations(response.data || { sales: [], items: [] });
    } catch (error) {
      console.error('Error loading recommendations:', error);
      setRecommendations({ sales: [], items: [] });
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const loadRecentActivity = async () => {
    try {
      const activities = [];

      // Load user's messages
      try {
        const messages = await base44.entities.Message.filter({ 
          recipient_id: user.id 
        }, '-created_date', 5);
        (messages || []).forEach(msg => {
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
      } catch (e) {
        console.log('Could not load messages');
      }

      // Load notifications
      try {
        const notifications = await base44.entities.Notification.filter({
          user_id: user.id
        }, '-created_date', 5);
        (notifications || []).forEach(notif => {
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
      } catch (e) {
        console.log('Could not load notifications');
      }

      // Load saved estate sales
      try {
        const savedSaleIds = JSON.parse(localStorage.getItem('savedSales') || '[]');
        if (savedSaleIds.length > 0) {
          const sales = await base44.entities.EstateSale.list('-created_date', 50);
          const recentSaved = (sales || [])
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
      } catch (e) {
        console.log('Could not load saved sales');
      }

      // Load orders
      try {
        const orders = await base44.entities.Order.filter({
          buyer_id: user.id
        }, '-created_date', 3);
        (orders || []).forEach(order => {
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
      } catch (e) {
        console.log('Could not load orders');
      }

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

      {/* AI Recommendations */}
      <Card className="bg-gradient-to-br from-orange-50 to-cyan-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-serif text-navy-900 flex items-center gap-2">
              ✨ Recommended For You
            </CardTitle>
            <Badge className="bg-gradient-to-r from-orange-600 to-orange-700 text-white">
              AI Powered
            </Badge>
          </div>
          <p className="text-sm text-slate-600 mt-2">
            Personalized suggestions based on your interests and activity
          </p>
        </CardHeader>
        <CardContent>
          {loadingRecommendations ? (
            <div className="space-y-4">
              <div className="animate-pulse space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-24 bg-white rounded-lg" />
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Recommended Sales */}
              {recommendations.sales.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-navy-900 mb-3 flex items-center gap-2">
                    <Home className="w-5 h-5 text-orange-600" />
                    Estate Sales You'll Love
                  </h3>
                  <div className="space-y-3">
                    {recommendations.sales.slice(0, 3).map(sale => (
                      <Link
                        key={sale.id}
                        to={createPageUrl('EstateSaleDetail') + '?id=' + sale.id}
                        className="block"
                      >
                        <Card className="hover:shadow-lg transition-all border-2 border-transparent hover:border-orange-200">
                          <CardContent className="p-4">
                            <div className="flex gap-4">
                              {sale.images?.[0] && (
                                <img
                                  src={sale.images[0]}
                                  alt={sale.title}
                                  className="w-20 h-20 rounded-lg object-cover"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-navy-900 mb-1">
                                  {sale.title}
                                </h4>
                                <p className="text-xs text-slate-600 mb-2 flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {sale.property_address?.city}, {sale.property_address?.state}
                                </p>
                                <p className="text-xs text-cyan-600 italic">
                                  💡 {sale.recommendation_reason}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommended Items */}
              {recommendations.items.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-navy-900 mb-3 flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-green-600" />
                    Marketplace Items For You
                  </h3>
                  <div className="space-y-3">
                    {recommendations.items.slice(0, 3).map(item => (
                      <Card key={item.id} className="hover:shadow-lg transition-all border-2 border-transparent hover:border-green-200">
                        <CardContent className="p-4">
                          <div className="flex gap-4">
                            {item.images?.[0] && (
                              <img
                                src={item.images[0]}
                                alt={item.title}
                                className="w-20 h-20 rounded-lg object-cover"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-navy-900 mb-1">
                                {item.title}
                              </h4>
                              <p className="text-sm font-bold text-green-600 mb-2">
                                ${item.price.toFixed(2)}
                              </p>
                              <p className="text-xs text-cyan-600 italic">
                                💡 {item.recommendation_reason}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {recommendations.sales.length === 0 && recommendations.items.length === 0 && (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">🤖</div>
                  <p className="text-slate-600 mb-2">Start exploring to get personalized recommendations</p>
                  <p className="text-sm text-slate-500">
                    Save estate sales and browse items to help our AI learn your preferences
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

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