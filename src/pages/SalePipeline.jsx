import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, TrendingUp } from 'lucide-react';

export default function SalePipeline() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPipeline();
  }, []);

  const loadPipeline = async () => {
    try {
      const user = await base44.auth.me();
      const allSales = await base44.entities.EstateSale.filter({ operator_id: user.id }, '-created_date');
      setSales(allSales || []);
    } catch (error) {
      console.error('Error loading pipeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const stages = [
    { key: 'draft', label: 'Draft', color: 'bg-slate-100 text-slate-700' },
    { key: 'upcoming', label: 'Upcoming', color: 'bg-blue-100 text-blue-700' },
    { key: 'active', label: 'Active', color: 'bg-green-100 text-green-700' },
    { key: 'completed', label: 'Completed', color: 'bg-orange-100 text-orange-700' }
  ];

  const stageCounts = stages.map(stage => ({
    ...stage,
    count: sales.filter(s => s.status === stage.key).length,
    sales: sales.filter(s => s.status === stage.key)
  }));

  const totalValue = sales.reduce((sum, s) => sum + (s.actual_revenue || s.estimated_value || 0), 0);

  if (loading) return <div className="p-8 text-center">Loading pipeline...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Sale Pipeline</h1>
        <div className="text-right">
          <div className="text-sm text-slate-600">Total Pipeline Value</div>
          <div className="text-3xl font-bold text-green-600">${totalValue.toLocaleString()}</div>
        </div>
      </div>

      {/* Pipeline Stages */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stageCounts.map((stage, idx) => (
          <div key={stage.key} className="flex items-center gap-3">
            <div className={`${stage.color} rounded-lg p-4 flex-1`}>
              <div className="text-sm font-semibold mb-1">{stage.label}</div>
              <div className="text-3xl font-bold">{stage.count}</div>
              <div className="text-xs mt-2">
                ${stage.sales.reduce((sum, s) => sum + (s.actual_revenue || s.estimated_value || 0), 0).toLocaleString()}
              </div>
            </div>
            {idx < 3 && <ArrowRight className="w-5 h-5 text-slate-400" />}
          </div>
        ))}
      </div>

      {/* Sales by Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {stageCounts.map(stage => (
          <Card key={stage.key}>
            <CardHeader>
              <CardTitle className="text-lg">{stage.label} ({stage.count})</CardTitle>
            </CardHeader>
            <CardContent>
              {stage.sales.length === 0 ? (
                <p className="text-slate-500 text-sm">No sales in this stage</p>
              ) : (
                <div className="space-y-3">
                  {stage.sales.map(sale => (
                    <div key={sale.id} className="border rounded-lg p-3">
                      <div className="font-medium">{sale.title}</div>
                      <div className="text-sm text-slate-600 mt-1">
                        {sale.property_address?.city}, {sale.property_address?.state}
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <Badge>{stage.label}</Badge>
                        <span className="font-semibold text-green-600">
                          ${(sale.actual_revenue || sale.estimated_value || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}