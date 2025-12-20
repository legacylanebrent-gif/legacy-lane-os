import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Building2, DollarSign, Target } from 'lucide-react';

export default function InvestorDashboard({ user }) {
  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-4xl font-serif font-bold text-navy-900 mb-2">
          Investment Dashboard
        </h1>
        <p className="text-slate-600">Track your deals and ROI</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Active Deals</CardTitle>
            <Target className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-navy-900">0</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Properties</CardTitle>
            <Building2 className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-navy-900">0</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Invested</CardTitle>
            <DollarSign className="h-5 w-5 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-navy-900">$0</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Avg ROI</CardTitle>
            <TrendingUp className="h-5 w-5 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-navy-900">0%</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-serif text-navy-900">Deal Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-500">Your investment deals will appear here</p>
        </CardContent>
      </Card>
    </div>
  );
}