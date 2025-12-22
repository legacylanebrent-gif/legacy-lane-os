import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit2, Trash2, DollarSign, Users, TrendingUp } from 'lucide-react';

export default function AdminAdvertisingPackages() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    setLoading(true);
    try {
      // TODO: Create AdvertisingPackage entity and load packages
      // const data = await base44.entities.AdvertisingPackage.list();
      // setPackages(data);
      
      // Placeholder data for now
      setPackages([
        {
          id: '1',
          name: 'Basic Ad',
          price: 29,
          billing_period: 'monthly',
          features: ['Homepage banner', 'Basic analytics', '1,000 impressions/month'],
          is_active: true
        },
        {
          id: '2',
          name: 'Pro Ad',
          price: 49,
          billing_period: 'monthly',
          features: ['Homepage + category banners', 'Advanced analytics', '5,000 impressions/month', 'Featured placement'],
          is_active: true
        },
        {
          id: '3',
          name: 'Premium Ad',
          price: 179,
          billing_period: 'monthly',
          features: ['All placements', 'Full analytics suite', 'Unlimited impressions', 'Priority support', 'Custom targeting'],
          is_active: true
        }
      ]);
    } catch (error) {
      console.error('Error loading advertising packages:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="h-64 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-serif font-bold text-slate-900 mb-2">Advertising Packages</h1>
          <p className="text-slate-600">Manage advertising package tiers and pricing</p>
        </div>
        <Button className="bg-orange-600 hover:bg-orange-700">
          <Plus className="w-4 h-4 mr-2" />
          Create Package
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium opacity-90">Total Packages</span>
              <DollarSign className="w-5 h-5 opacity-75" />
            </div>
            <div className="text-3xl font-bold">{packages.length}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium opacity-90">Active Packages</span>
              <TrendingUp className="w-5 h-5 opacity-75" />
            </div>
            <div className="text-3xl font-bold">{packages.filter(p => p.is_active).length}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-pink-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium opacity-90">Avg Package Price</span>
              <DollarSign className="w-5 h-5 opacity-75" />
            </div>
            <div className="text-3xl font-bold">
              ${packages.length > 0 ? Math.round(packages.reduce((sum, p) => sum + p.price, 0) / packages.length) : 0}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-red-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium opacity-90">Total Subscribers</span>
              <Users className="w-5 h-5 opacity-75" />
            </div>
            <div className="text-3xl font-bold">0</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {packages.map(pkg => (
          <Card key={pkg.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">{pkg.name}</CardTitle>
                {pkg.is_active ? (
                  <Badge className="bg-green-100 text-green-700">Active</Badge>
                ) : (
                  <Badge variant="outline" className="text-slate-500">Inactive</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-3xl font-bold text-slate-900">
                  ${pkg.price}
                  <span className="text-sm font-normal text-slate-500">/{pkg.billing_period}</span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-700">Features:</p>
                <ul className="space-y-1">
                  {pkg.features.map((feature, idx) => (
                    <li key={idx} className="text-sm text-slate-600 flex items-start">
                      <span className="text-green-600 mr-2">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button variant="outline" size="sm" className="flex-1">
                  <Edit2 className="w-3 h-3 mr-1" />
                  Edit
                </Button>
                <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {packages.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <DollarSign className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No advertising packages found</p>
            <Button className="mt-4 bg-orange-600 hover:bg-orange-700">
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Package
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}