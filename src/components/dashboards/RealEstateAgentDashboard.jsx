import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Users, TrendingUp, DollarSign } from 'lucide-react';

export default function RealEstateAgentDashboard({ user }) {
  const [stats, setStats] = useState({
    totalLeads: 0,
    activeListings: 0,
    closedDeals: 0,
    totalVolume: 0
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [leads, properties] = await Promise.all([
        base44.entities.Lead.filter({ routed_to: user.id }),
        base44.entities.Property.filter({ agent_id: user.id })
      ]);
      
      setStats({
        totalLeads: leads.length,
        activeListings: properties.filter(p => p.status === 'active_listing').length,
        closedDeals: properties.filter(p => p.status === 'sold').length,
        totalVolume: properties
          .filter(p => p.status === 'sold')
          .reduce((sum, p) => sum + (p.sale_price || 0), 0)
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-4xl font-serif font-bold text-navy-900 mb-2">
          Real Estate Dashboard
        </h1>
        <p className="text-slate-600">Manage your properties and leads</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Leads</CardTitle>
            <Users className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-navy-900">{stats.totalLeads}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Active Listings</CardTitle>
            <Building2 className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-navy-900">{stats.activeListings}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Closed Deals</CardTitle>
            <TrendingUp className="h-5 w-5 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-navy-900">{stats.closedDeals}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Volume</CardTitle>
            <DollarSign className="h-5 w-5 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-navy-900">
              ${(stats.totalVolume / 1000000).toFixed(1)}M
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-serif text-navy-900">Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-500">Your sales pipeline will appear here</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-serif text-navy-900">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to={createPageUrl('CRM')}>
              <Button variant="outline" className="w-full justify-start">
                <Users className="w-4 h-4 mr-2" />
                Manage CRM
              </Button>
            </Link>
            <Link to={createPageUrl('Properties')}>
              <Button variant="outline" className="w-full justify-start">
                <Building2 className="w-4 h-4 mr-2" />
                View Properties
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}