import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Home, Building2, TrendingUp, ShoppingBag, Megaphone, GraduationCap } from 'lucide-react';

const DIVISION_CONFIG = {
  estate_services: { label: 'Estate Services', icon: Home, color: 'text-blue-600' },
  real_estate: { label: 'Real Estate', icon: Building2, color: 'text-green-600' },
  investment: { label: 'Investment', icon: TrendingUp, color: 'text-purple-600' },
  marketplace: { label: 'Marketplace', icon: ShoppingBag, color: 'text-pink-600' },
  marketing: { label: 'Marketing Hub', icon: Megaphone, color: 'text-amber-600' },
  education: { label: 'Education', icon: GraduationCap, color: 'text-indigo-600' }
};

export default function DivisionPerformance({ revenueByDivision = {} }) {
  const totalRevenue = Object.values(revenueByDivision).reduce((sum, val) => sum + val, 0);

  const sortedDivisions = Object.entries(revenueByDivision)
    .filter(([division]) => division && division !== 'undefined')
    .sort(([, a], [, b]) => b - a);

  if (sortedDivisions.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <TrendingUp className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">No division revenue data available yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {sortedDivisions.map(([division, revenue]) => {
        const config = DIVISION_CONFIG[division];
        if (!config) return null;

        const Icon = config.icon;
        const percentage = totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0;

        return (
          <Card key={division}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Icon className={`w-8 h-8 ${config.color}`} />
                <CardTitle className="text-lg">{config.label}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-end justify-between">
                  <span className="text-3xl font-bold text-navy-900">
                    ${revenue.toLocaleString()}
                  </span>
                  <span className="text-lg font-semibold text-slate-600">
                    {percentage.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-3">
                  <div 
                    className="bg-gold-600 h-3 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}