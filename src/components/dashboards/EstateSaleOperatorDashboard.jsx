import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Home, DollarSign, TrendingUp, Calendar, Plus } from 'lucide-react';

export default function EstateSaleOperatorDashboard({ user }) {
  const [stats, setStats] = useState({
    totalSales: 0,
    activeSales: 0,
    upcomingSales: 0,
    totalRevenue: 0
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const sales = await base44.entities.EstateSale.filter({ operator_id: user.id });
      
      setStats({
        totalSales: sales.length,
        activeSales: sales.filter(s => s.status === 'active').length,
        upcomingSales: sales.filter(s => s.status === 'upcoming').length,
        totalRevenue: sales.reduce((sum, s) => sum + (s.commission_earned || 0), 0)
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-serif font-bold text-navy-900 mb-2">
            Estate Sales Dashboard
          </h1>
          <p className="text-slate-600">Manage your estate sales and inventory</p>
        </div>
        <Link to={createPageUrl('MyEstateSales')}>
          <Button className="bg-gold-600 hover:bg-gold-700">
            <Plus className="w-4 h-4 mr-2" />
            New Estate Sale
          </Button>
        </Link>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Sales</CardTitle>
            <Home className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-navy-900">{stats.totalSales}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Active Sales</CardTitle>
            <TrendingUp className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-navy-900">{stats.activeSales}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Upcoming</CardTitle>
            <Calendar className="h-5 w-5 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-navy-900">{stats.upcomingSales}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Earned</CardTitle>
            <DollarSign className="h-5 w-5 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-navy-900">
              ${stats.totalRevenue.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-serif text-navy-900">Recent Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-500">Your recent estate sales will appear here</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-serif text-navy-900">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to={createPageUrl('MyEstateSales')}>
              <Button variant="outline" className="w-full justify-start">
                <Home className="w-4 h-4 mr-2" />
                Manage Estate Sales
              </Button>
            </Link>
            <Link to={createPageUrl('Inventory')}>
              <Button variant="outline" className="w-full justify-start">
                <TrendingUp className="w-4 h-4 mr-2" />
                View Inventory
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}