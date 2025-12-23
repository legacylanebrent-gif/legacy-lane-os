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
        revenueEvents,
        leads,
        campaigns,
        income,
        expenses
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
        base44.entities.Transaction.list(),
        base44.entities.RevenueEvent.list(),
        base44.entities.Lead.list(),
        base44.entities.Campaign.list(),
        base44.entities.Income.list(),
        base44.entities.BusinessExpense.list()
      ]);

      // Calculate comprehensive revenue from multiple sources
      const revenueFromEvents = revenueEvents.reduce((sum, event) => sum + (event.amount || 0), 0);
      const revenueFromTransactions = transactions.reduce((sum, t) => sum + (t.final_price || 0), 0);
      const revenueFromIncome = income.reduce((sum, i) => sum + (i.amount || 0), 0);
      const totalRevenue = revenueFromEvents + revenueFromTransactions + revenueFromIncome;

      // Calculate comprehensive estate sales stats
      const activeSales = estateSales.filter(e => e.status === 'active' || e.status === 'upcoming');
      const totalSalesRevenue = estateSales.reduce((sum, s) => sum + (s.actual_revenue || 0), 0);
      const totalCommission = estateSales.reduce((sum, s) => sum + (s.commission_earned || 0), 0);

      // Calculate marketplace stats
      const listedItems = items.filter(i => i.status === 'available' || i.status === 'pending');
      const soldItems = items.filter(i => i.status === 'sold');

      // Calculate vendor stats
      const activeVendorList = vendors.filter(v => v.tier && v.tier !== 'standard');
      
      // Calculate referral stats
      const activeReferrals = referrals.filter(r => r.status === 'subscribed' || r.status === 'paid');
      const totalReferralRevenue = activeReferrals.reduce((sum, r) => sum + (r.reward_amount || 0), 0);

      // Calculate subscription MRR
      const activeSubs = subscriptions.filter(s => s.status === 'active');
      const mrr = activeSubs.reduce((sum, s) => sum + (s.mrr || 0), 0);

      setStats({
        totalUsers: users.length,
        totalRevenue,
        activeEstateSales: activeSales.length,
        totalCourses: courses.length,
        totalItems: listedItems.length,
        totalProperties: properties.length,
        totalSubscriptions: activeSubs.length,
        totalTickets: tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length,
        activeVendors: activeVendorList.length,
        totalReferrals: activeReferrals.length
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
      gradient: 'from-slate-700 to-slate-800',
      bgGradient: 'from-white to-slate-50',
      iconColor: 'text-slate-700',
      link: createPageUrl('AdminUsers')
    },
    { 
      title: 'Platform Revenue', 
      value: `$${stats.totalRevenue.toLocaleString()}`, 
      icon: DollarSign, 
      gradient: 'from-emerald-600 to-emerald-700',
      bgGradient: 'from-white to-slate-50',
      iconColor: 'text-emerald-600',
      link: createPageUrl('ComprehensiveRevenue')
    },
    { 
      title: 'Active Estate Sales', 
      value: stats.activeEstateSales, 
      icon: Home, 
      gradient: 'from-indigo-600 to-indigo-700',
      bgGradient: 'from-white to-slate-50',
      iconColor: 'text-indigo-600',
      link: createPageUrl('AdminEstateSales')
    },
    { 
      title: 'Total Courses', 
      value: stats.totalCourses, 
      icon: BookOpen, 
      gradient: 'from-orange-600 to-orange-700',
      bgGradient: 'from-white to-slate-50',
      iconColor: 'text-orange-600',
      link: createPageUrl('AdminCourses')
    },
    { 
      title: 'Marketplace Items', 
      value: stats.totalItems, 
      icon: ShoppingBag, 
      gradient: 'from-violet-600 to-violet-700',
      bgGradient: 'from-white to-slate-50',
      iconColor: 'text-violet-600',
      link: createPageUrl('AdminMarketplace')
    },
    { 
      title: 'Properties', 
      value: stats.totalProperties, 
      icon: TrendingUp, 
      gradient: 'from-cyan-600 to-cyan-700',
      bgGradient: 'from-white to-slate-50',
      iconColor: 'text-cyan-600'
    },
    { 
      title: 'Active Subscriptions', 
      value: stats.totalSubscriptions, 
      icon: Package, 
      gradient: 'from-blue-600 to-blue-700',
      bgGradient: 'from-white to-slate-50',
      iconColor: 'text-blue-600',
      link: createPageUrl('AdminPackages')
    },
    { 
      title: 'Open Tickets', 
      value: stats.totalTickets, 
      icon: MessageSquare, 
      gradient: 'from-amber-600 to-amber-700',
      bgGradient: 'from-white to-slate-50',
      iconColor: 'text-amber-600',
      link: createPageUrl('AdminTickets')
    },
    { 
      title: 'Active Vendors', 
      value: stats.activeVendors, 
      icon: Briefcase, 
      gradient: 'from-teal-600 to-teal-700',
      bgGradient: 'from-white to-slate-50',
      iconColor: 'text-teal-600',
      link: createPageUrl('AdminVendors')
    },
    { 
      title: 'Active Referrals', 
      value: stats.totalReferrals, 
      icon: Gift, 
      gradient: 'from-rose-600 to-rose-700',
      bgGradient: 'from-white to-slate-50',
      iconColor: 'text-rose-600',
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
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-4 shadow-xl border border-slate-700 w-[60%]">
        <h1 className="text-2xl font-serif font-bold text-white mb-1">
          Legacy Lane OS Dashboard
        </h1>
        <p className="text-sm text-slate-300">Welcome back, <span className="font-semibold text-white">{user.full_name}</span></p>
      </div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {statCards.map((stat, index) => {
          const CardWrapper = stat.link ? Link : 'div';
          const cardProps = stat.link ? { to: stat.link } : {};

          return (
            <CardWrapper key={index} {...cardProps}>
              <Card className={`relative overflow-hidden border border-slate-200 shadow-md hover:shadow-lg transition-all duration-300 ${stat.link ? 'cursor-pointer hover:border-slate-300' : ''} bg-white`}>
                <CardContent className="p-6 relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center`}>
                      <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
                    </div>
                    {stat.link && (
                      <ArrowUpRight className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">{stat.title}</p>
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
        <Card className="border border-slate-200 shadow-md">
          <CardHeader className="border-b bg-slate-50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-serif text-slate-900 flex items-center gap-2">
                <Activity className="h-6 w-6 text-slate-700" />
                Recent Activity
              </CardTitle>
              <Badge className="bg-slate-700 text-white">
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
                        <div className={`w-10 h-10 rounded-lg ${activity.color === 'text-green-600' ? 'bg-emerald-100' : activity.color === 'text-purple-600' ? 'bg-indigo-100' : 'bg-orange-100'} flex items-center justify-center flex-shrink-0`}>
                          <activity.icon className={`h-5 w-5 ${activity.color === 'text-green-600' ? 'text-emerald-600' : activity.color === 'text-purple-600' ? 'text-indigo-600' : 'text-orange-600'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="font-semibold text-slate-900 text-sm">{activity.title}</p>
                              <p className="text-slate-600 text-sm truncate">{activity.description}</p>
                            </div>
                            {activity.amount && (
                              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
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
        <Card className="border border-slate-200 shadow-md">
          <CardHeader className="border-b bg-slate-50">
            <CardTitle className="text-2xl font-serif text-slate-900 flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-slate-700" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid gap-3">
              <Link to={createPageUrl('AdminUsers')}>
                <Button className="w-full justify-start bg-slate-700 hover:bg-slate-800 text-white">
                  <Users className="h-5 w-5 mr-3" />
                  Manage Users
                </Button>
              </Link>
              <Link to={createPageUrl('AdminEstateSales')}>
                <Button className="w-full justify-start bg-indigo-600 hover:bg-indigo-700 text-white">
                  <Home className="h-5 w-5 mr-3" />
                  View Estate Sales
                </Button>
              </Link>
              <Link to={createPageUrl('AdminTickets')}>
                <Button className="w-full justify-start bg-orange-600 hover:bg-orange-700 text-white">
                  <MessageSquare className="h-5 w-5 mr-3" />
                  Support Tickets
                </Button>
              </Link>
              <Link to={createPageUrl('PlatformAnalytics')}>
                <Button className="w-full justify-start bg-cyan-600 hover:bg-cyan-700 text-white">
                  <TrendingUp className="h-5 w-5 mr-3" />
                  View Analytics
                </Button>
              </Link>
              <Link to={createPageUrl('ComprehensiveRevenue')}>
                <Button className="w-full justify-start bg-emerald-600 hover:bg-emerald-700 text-white">
                  <DollarSign className="h-5 w-5 mr-3" />
                  Revenue Reports
                </Button>
              </Link>
              <Link to={createPageUrl('AdminRewards')}>
                <Button className="w-full justify-start bg-rose-600 hover:bg-rose-700 text-white">
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