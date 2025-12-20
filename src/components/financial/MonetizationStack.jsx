import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Repeat, Users, Briefcase, GraduationCap, Star, Building2, BarChart3 } from 'lucide-react';

const MONETIZATION_LAYERS = {
  subscriptions: {
    label: 'Subscriptions',
    icon: Repeat,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    description: 'Recurring revenue from agents, operators, investors'
  },
  transaction_fees: {
    label: 'Transaction Fees',
    icon: DollarSign,
    color: 'text-green-600',
    bg: 'bg-green-50',
    description: 'Fees from marketplace and estate sales'
  },
  referral_fees: {
    label: 'Referral Fees',
    icon: Users,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    description: 'Network effect commissions'
  },
  vendor_commissions: {
    label: 'Vendor Commissions',
    icon: Briefcase,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    description: 'Revenue share from partner network'
  },
  education_sales: {
    label: 'Education Sales',
    icon: GraduationCap,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    description: 'Course and certification revenue'
  },
  premium_placement: {
    label: 'Premium Placement',
    icon: Star,
    color: 'text-gold-600',
    bg: 'bg-gold-50',
    description: 'Featured listings and promotions'
  },
  white_label_licensing: {
    label: 'White Label',
    icon: Building2,
    color: 'text-slate-600',
    bg: 'bg-slate-50',
    description: 'Enterprise licensing deals'
  },
  data_insights: {
    label: 'Data Insights',
    icon: BarChart3,
    color: 'text-pink-600',
    bg: 'bg-pink-50',
    description: 'Market intelligence and analytics'
  }
};

export default function MonetizationStack({ revenueEvents }) {
  const revenueByLayer = revenueEvents.reduce((acc, event) => {
    const layer = event.monetization_layer || 'other';
    acc[layer] = (acc[layer] || 0) + (event.amount || 0);
    return acc;
  }, {});

  const totalRevenue = Object.values(revenueByLayer).reduce((sum, val) => sum + val, 0);

  const sortedLayers = Object.entries(revenueByLayer)
    .sort(([, a], [, b]) => b - a)
    .filter(([layer]) => MONETIZATION_LAYERS[layer]);

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-4 gap-6">
        {sortedLayers.map(([layer, revenue]) => {
          const config = MONETIZATION_LAYERS[layer];
          if (!config) return null;

          const Icon = config.icon;
          const percentage = totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0;

          return (
            <Card key={layer}>
              <CardContent className="p-6">
                <div className={`w-12 h-12 rounded-xl ${config.bg} flex items-center justify-center mb-4`}>
                  <Icon className={`w-6 h-6 ${config.color}`} />
                </div>
                <h3 className="font-semibold text-navy-900 mb-1">{config.label}</h3>
                <p className="text-2xl font-bold text-navy-900 mb-1">
                  ${revenue.toLocaleString()}
                </p>
                <Badge variant="outline">{percentage.toFixed(1)}%</Badge>
                <p className="text-xs text-slate-500 mt-2">{config.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sortedLayers.map(([layer, revenue]) => {
              const config = MONETIZATION_LAYERS[layer];
              if (!config) return null;

              const percentage = totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0;

              return (
                <div key={layer}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-navy-900">{config.label}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-slate-600">{percentage.toFixed(1)}%</span>
                      <span className="font-bold text-navy-900 w-24 text-right">
                        ${revenue.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div 
                      className="bg-gold-600 h-2 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}