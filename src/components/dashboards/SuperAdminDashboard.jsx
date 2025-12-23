import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  Users, DollarSign, TrendingUp, BookOpen, Home, Package, 
  ShoppingBag, Briefcase, ArrowUpRight, Activity, Gift, MessageSquare
} from 'lucide-react';
import { format } from 'date-fns';


export default function SuperAdminDashboard({ user }) {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalRevenue: 0,
    activeEstateSales: 0,
    totalCourses: 0,
    totalItems: 0,
    totalProperties: 0,
    totalSubscriptions: 0,
    totalTickets: 0,
    activeVendors: 0,
    totalReferrals: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [
        users, 
        estateSales, 
        courses, 
        items, 
        properties, 
        subscriptions,
        tickets,
        vendors,
        referrals,
        transactions,
        revenueEvents
      ] = await Promise.all([
        base44.asServiceRole.entities.User.list(),
        base44.entities.EstateSale.list(),
        base44.entities.Course.list(),
        base44.entities.Item.list(),
        base44.entities.Property.list(),
        base44.entities.Subscription.list(),
        base44.entities.Ticket.list(),
        base44.entities.Vendor.list(),
        base44.entities.Referral.list(),
        base44.entities.Transaction.list('-created_date', 50),
        base44.entities.RevenueEvent.list()
      ]);

      // Calculate total revenue from revenue events
      const totalRevenue = revenueEvents.reduce((sum, event) => sum + (event.amount || 0), 0);

      setStats({
        totalUsers: users.length,
        totalRevenue,
        activeEstateSales: estateSales.filter(e => e.status === 'active' || e.status === 'upcoming').length,
        totalCourses: courses.length,
        totalItems: items.length,
        totalProperties: properties.length,
        totalSubscriptions: subscriptions.filter(s => s.status === 'active').length,
        totalTickets: tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length,
        activeVendors: vendors.filter(v => v.tier).length,
        totalReferrals: referrals.filter(r => r.status === 'subscribed' || r.status === 'paid').length
      });

      // Build recent activity from transactions and other events
      const activities = [];
      
      transactions.slice(0, 10).forEach(t => {
        activities.push({
          type: 'transaction',
          title: 'New Transaction',
          description: `${t.buyer_name || 'Customer'} purchased ${t.item_title || 'item'}`,
          amount: t.final_price,
          time: t.created_date,
          icon: DollarSign,
          color: 'text-green-600'
        });
      });

      estateSales.filter(s => s.status === 'active').slice(0, 5).forEach(s => {
        activities.push({
          type: 'sale',
          title: 'Active Estate Sale',
          description: s.title,
          time: s.created_date,
          icon: Home,
          color: 'text-purple-600',
          link: createPageUrl(`EstateSaleDetail?id=${s.id}`)
        });
      });

      tickets.filter(t => t.status === 'open').slice(0, 5).forEach(t => {
        activities.push({
          type: 'ticket',
          title: 'New Support Ticket',
          description: t.subject,
          time: t.created_date,
          icon: MessageSquare,
          color: 'text-orange-600'
        });
      });

      // Sort by most recent
      activities.sort((a, b) => new Date(b.time) - new Date(a.time));
      setRecentActivity(activities.slice(0, 15));

    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { 
      title: 'Total Users', 
      value: stats.totalUsers, 
      icon: Users, 
      gradient: 'from-blue-500 to-blue-600',
      bgGradient: 'from-blue-50 to-blue-100',
      link: createPageUrl('AdminUsers')
    },
    { 
      title: 'Platform Revenue', 
      value: `$${stats.totalRevenue.toLocaleString()}`, 
      icon: DollarSign, 
      gradient: 'from-green-500 to-green-600',
      bgGradient: 'from-green-50 to-green-100',
      link: createPageUrl('ComprehensiveRevenue')
    },
    { 
      title: 'Active Estate Sales', 
      value: stats.activeEstateSales, 
      icon: Home, 
      gradient: 'from-purple-500 to-purple-600',
      bgGradient: 'from-purple-50 to-purple-100',
      link: createPageUrl('AdminEstateSales')
    },
    { 
      title: 'Total Courses', 
      value: stats.totalCourses, 
      icon: BookOpen, 
      gradient: 'from-orange-500 to-orange-600',
      bgGradient: 'from-orange-50 to-orange-100',
      link: createPageUrl('AdminCourses')
    },
    { 
      title: 'Marketplace Items', 
      value: stats.totalItems, 
      icon: ShoppingBag, 
      gradient: 'from-pink-500 to-pink-600',
      bgGradient: 'from-pink-50 to-pink-100',
      link: createPageUrl('AdminMarketplace')
    },
    { 
      title: 'Properties', 
      value: stats.totalProperties, 
      icon: TrendingUp, 
      gradient: 'from-cyan-500 to-cyan-600',
      bgGradient: 'from-cyan-50 to-cyan-100'
    },
    { 
      title: 'Active Subscriptions', 
      value: stats.totalSubscriptions, 
      icon: Package, 
      gradient: 'from-indigo-500 to-indigo-600',
      bgGradient: 'from-indigo-50 to-indigo-100',
      link: createPageUrl('AdminPackages')
    },
    { 
      title: 'Open Tickets', 
      value: stats.totalTickets, 
      icon: MessageSquare, 
      gradient: 'from-amber-500 to-amber-600',
      bgGradient: 'from-amber-50 to-amber-100',
      link: createPageUrl('AdminTickets')
    },
    { 
      title: 'Active Vendors', 
      value: stats.activeVendors, 
      icon: Briefcase, 
      gradient: 'from-teal-500 to-teal-600',
      bgGradient: 'from-teal-50 to-teal-100',
      link: createPageUrl('AdminVendors')
    },
    { 
      title: 'Active Referrals', 
      value: stats.totalReferrals, 
      icon: Gift, 
      gradient: 'from-rose-500 to-rose-600',
      bgGradient: 'from-rose-50 to-rose-100',
      link: createPageUrl('AdminRewards')
    }
  ];

  if (loading) {
    return (
      <div className="p-6 lg:p-8 space-y-8">
        <div className="animate-pulse space-y-6">
          <div className="h-12 bg-slate-200 rounded w-1/3"></div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-32 bg-slate-200 rounded"></div>
            ))}
          </div>
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="h-96 bg-slate-200 rounded"></div>
            <div className="h-96 bg-slate-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 via-purple-500/10 to-cyan-500/10 rounded-3xl blur-3xl"></div>
        <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-slate-200 shadow-lg">
          <h1 className="text-5xl font-serif font-bold bg-gradient-to-r from-slate-900 via-orange-600 to-cyan-600 bg-clip-text text-transparent mb-3">
            Platform Overview
          </h1>
          <p className="text-lg text-slate-600">Welcome back, <span className="font-semibold text-slate-900">{user.full_name}</span></p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {statCards.map((stat, index) => {
          const CardWrapper = stat.link ? Link : 'div';
          const cardProps = stat.link ? { to: stat.link } : {};

          return (
            <CardWrapper key={index} {...cardProps}>
              <Card className={`relative overflow-hidden border-none shadow-lg hover:shadow-xl transition-all duration-300 ${stat.link ? 'cursor-pointer hover:scale-105' : ''} bg-gradient-to-br ${stat.bgGradient}`}>
                <div className={`absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br ${stat.gradient} opacity-20 rounded-full blur-2xl`} />
                <CardContent className="p-6 relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg`}>
                      <stat.icon className="h-6 w-6 text-white" />
                    </div>
                    {stat.link && (
                      <ArrowUpRight className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-600">{stat.title}</p>
                    <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
                  </div>
                </CardContent>
              </Card>
            </CardWrapper>
          );
        })}
      </div>

      {/* Activity & Quick Actions */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card className="border-none shadow-lg">
          <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-slate-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-serif text-slate-900 flex items-center gap-2">
                <Activity className="h-6 w-6 text-orange-600" />
                Recent Activity
              </CardTitle>
              <Badge variant="outline" className="bg-white">
                Live
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[500px] overflow-y-auto">
              {recentActivity.length === 0 ? (
                <div className="p-12 text-center">
                  <Activity className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">No recent activity</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {recentActivity.map((activity, idx) => (
                    <div key={idx} className="p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${activity.color === 'text-green-600' ? 'from-green-500 to-green-600' : activity.color === 'text-purple-600' ? 'from-purple-500 to-purple-600' : 'from-orange-500 to-orange-600'} flex items-center justify-center flex-shrink-0`}>
                          <activity.icon className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="font-semibold text-slate-900 text-sm">{activity.title}</p>
                              <p className="text-slate-600 text-sm truncate">{activity.description}</p>
                            </div>
                            {activity.amount && (
                              <Badge className="bg-green-100 text-green-700 border-green-200">
                                ${activity.amount.toLocaleString()}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-1">
                            {format(new Date(activity.time), 'MMM d, h:mm a')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border-none shadow-lg">
          <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-slate-100">
            <CardTitle className="text-2xl font-serif text-slate-900 flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-cyan-600" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid gap-3">
              <Link to={createPageUrl('AdminUsers')}>
                <Button className="w-full justify-start bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg">
                  <Users className="h-5 w-5 mr-3" />
                  Manage Users
                </Button>
              </Link>
              <Link to={createPageUrl('AdminEstateSales')}>
                <Button className="w-full justify-start bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg">
                  <Home className="h-5 w-5 mr-3" />
                  View Estate Sales
                </Button>
              </Link>
              <Link to={createPageUrl('AdminTickets')}>
                <Button className="w-full justify-start bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white shadow-lg">
                  <MessageSquare className="h-5 w-5 mr-3" />
                  Support Tickets
                </Button>
              </Link>
              <Link to={createPageUrl('PlatformAnalytics')}>
                <Button className="w-full justify-start bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 text-white shadow-lg">
                  <TrendingUp className="h-5 w-5 mr-3" />
                  View Analytics
                </Button>
              </Link>
              <Link to={createPageUrl('ComprehensiveRevenue')}>
                <Button className="w-full justify-start bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg">
                  <DollarSign className="h-5 w-5 mr-3" />
                  Revenue Reports
                </Button>
              </Link>
              <Link to={createPageUrl('AdminRewards')}>
                <Button className="w-full justify-start bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white shadow-lg">
                  <Gift className="h-5 w-5 mr-3" />
                  Rewards & Draws
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}