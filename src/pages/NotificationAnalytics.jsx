import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, Mail, TrendingUp, Users, Clock, AlertCircle, CheckCircle2, BarChart3, RefreshCw } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#f97316', '#06b6d4', '#8b5cf6', '#10b981', '#ef4444'];

export default function NotificationAnalytics() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [trends, setTrends] = useState([]);
  const [typeBreakdown, setTypeBreakdown] = useState([]);
  const [channelBreakdown, setChannelBreakdown] = useState([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const allNotifications = await base44.entities.Notification.list('-created_date', 10000);
      const allUsers = await base44.entities.User.list();
      const allPrefs = await base44.entities.NotificationPreference.list();

      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const last7Days = allNotifications.filter(n => new Date(n.created_date) > sevenDaysAgo);
      const last30Days = allNotifications.filter(n => new Date(n.created_date) > thirtyDaysAgo);
      
      const unreadCount = allNotifications.filter(n => !n.read).length;
      const readCount = allNotifications.filter(n => n.read).length;

      const typeCounts = {};
      allNotifications.forEach(n => {
        typeCounts[n.type] = (typeCounts[n.type] || 0) + 1;
      });
      setTypeBreakdown(Object.entries(typeCounts).map(([name, value]) => ({ name, value })));

      const dailyStats = {};
      for (let i = 0; i < 7; i++) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        dailyStats[dateStr] = { sent: 0, read: 0 };
      }
      
      last7Days.forEach(n => {
        const date = new Date(n.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (dailyStats[date]) {
          dailyStats[date].sent++;
          if (n.read) dailyStats[date].read++;
        }
      });
      
      setTrends(Object.entries(dailyStats).reverse().map(([date, data]) => ({
        date,
        sent: data.sent,
        read: data.read
      })));

      const emailEnabled = allPrefs.filter(p => Object.keys(p).some(key => key.endsWith('_email') && p[key] === true)).length;
      const inAppEnabled = allPrefs.filter(p => Object.keys(p).some(key => key.endsWith('_in_app') && p[key] === true)).length;
      const saleAlertsEnabled = allPrefs.filter(p => p.sale_alert_enabled === true).length;

      setChannelBreakdown([
        { name: 'In-App', value: inAppEnabled },
        { name: 'Email', value: emailEnabled },
        { name: 'Sale Alerts', value: saleAlertsEnabled }
      ]);

      setStats({
        total: allNotifications.length,
        last7Days: last7Days.length,
        last30Days: last30Days.length,
        unread: unreadCount,
        read: readCount,
        readRate: allNotifications.length > 0 ? Math.round((readCount / allNotifications.length) * 100) : 0,
        usersWithPrefs: allPrefs.length,
        avgPerDay: last7Days.length > 0 ? Math.round(last7Days.length / 7) : 0
      });
    } catch (error) {
      console.error('Error loading notification analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-4xl font-serif font-bold text-slate-900 mb-2">Notification Analytics</h1>
          <p className="text-slate-600">Track notification delivery, engagement, and user preferences</p>
        </div>
        <Button onClick={loadData} variant="outline" className="gap-2 w-full md:w-auto">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Notifications</CardTitle>
            <Bell className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total.toLocaleString()}</div>
            <p className="text-xs text-slate-500">{stats?.avgPerDay} per day average</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last 7 Days</CardTitle>
            <TrendingUp className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.last7Days.toLocaleString()}</div>
            <p className="text-xs text-slate-500">{stats?.last30Days.toLocaleString()} in last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Read Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.readRate}%</div>
            <p className="text-xs text-slate-500">{stats?.read.toLocaleString()} read / {stats?.unread.toLocaleString()} unread</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Users with Preferences</CardTitle>
            <Users className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.usersWithPrefs.toLocaleString()}</div>
            <p className="text-xs text-slate-500">Active notification settings</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-orange-600" />
              Daily Trends (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="sent" stroke="#f97316" strokeWidth={2} name="Sent" />
                <Line type="monotone" dataKey="read" stroke="#06b6d4" strokeWidth={2} name="Read" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-orange-600" />
              Notification Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={typeBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {typeBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-orange-600" />
            Channel Preferences
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            {channelBreakdown.map((channel, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-slate-700">{channel.name}</p>
                  <p className="text-xs text-slate-500">Users enabled</p>
                </div>
                <Badge className="bg-orange-100 text-orange-700 border-orange-200">
                  {channel.value.toLocaleString()}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}