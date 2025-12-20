import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, DollarSign, TrendingUp, BookOpen, Home, Package } from 'lucide-react';

export default function SuperAdminDashboard({ user }) {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalRevenue: 0,
    activeEstateSales: 0,
    totalCourses: 0,
    totalItems: 0,
    totalProperties: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [users, estateSales, courses, items, properties] = await Promise.all([
        base44.asServiceRole.entities.User.list(),
        base44.entities.EstateSale.list(),
        base44.entities.Course.list(),
        base44.entities.Item.list(),
        base44.entities.Property.list()
      ]);

      setStats({
        totalUsers: users.length,
        totalRevenue: 0, // Calculate from transactions
        activeEstateSales: estateSales.filter(e => e.status === 'active').length,
        totalCourses: courses.length,
        totalItems: items.length,
        totalProperties: properties.length
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { title: 'Total Users', value: stats.totalUsers, icon: Users, color: 'bg-blue-500' },
    { title: 'Platform Revenue', value: `$${stats.totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'bg-green-500' },
    { title: 'Active Estate Sales', value: stats.activeEstateSales, icon: Home, color: 'bg-purple-500' },
    { title: 'Total Courses', value: stats.totalCourses, icon: BookOpen, color: 'bg-amber-500' },
    { title: 'Marketplace Items', value: stats.totalItems, icon: Package, color: 'bg-pink-500' },
    { title: 'Properties', value: stats.totalProperties, icon: TrendingUp, color: 'bg-indigo-500' }
  ];

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-4xl font-serif font-bold text-navy-900 mb-2">
          Platform Overview
        </h1>
        <p className="text-slate-600">Welcome back, {user.full_name}</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, index) => (
          <Card key={index} className="relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-32 h-32 ${stat.color} opacity-10 rounded-full transform translate-x-12 -translate-y-12`} />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color.replace('bg-', 'text-')}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-navy-900">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-serif text-navy-900">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-500">Activity feed coming soon...</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-serif text-navy-900">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-500">Admin actions coming soon...</p>
          </CardContent>
        </Card>
      </div>
    </div>
    </AdminLayout>
  );
}