import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DollarSign, TrendingUp, Plus } from 'lucide-react';

const STAGES = [
  { value: 'prospecting', label: 'Prospecting', color: 'bg-slate-100 text-slate-800' },
  { value: 'qualified', label: 'Qualified', color: 'bg-blue-100 text-blue-800' },
  { value: 'proposal', label: 'Proposal', color: 'bg-purple-100 text-purple-800' },
  { value: 'negotiation', label: 'Negotiation', color: 'bg-amber-100 text-amber-800' },
  { value: 'closing', label: 'Closing', color: 'bg-green-100 text-green-800' }
];

export default function Pipeline() {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDeals();
  }, []);

  const loadDeals = async () => {
    try {
      setLoading(true);
      const dealData = await base44.entities.Deal.filter({ stage: { $ne: 'lost' } });
      setDeals(dealData);
    } catch (error) {
      console.error('Error loading deals:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDealsByStage = (stage) => {
    return deals.filter(d => d.stage === stage);
  };

  const totalValue = deals.reduce((sum, d) => sum + (d.value || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cream-50 to-sage-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-serif font-bold text-navy-900 mb-2">
              Deal Pipeline
            </h1>
            <p className="text-slate-600">{deals.length} active deals • ${totalValue.toLocaleString()} total value</p>
          </div>
          <Button className="bg-gold-600 hover:bg-gold-700">
            <Plus className="w-4 h-4 mr-2" />
            New Deal
          </Button>
        </div>

        <div className="grid lg:grid-cols-5 gap-4">
          {STAGES.map(stage => {
            const stageDeals = getDealsByStage(stage.value);
            const stageValue = stageDeals.reduce((sum, d) => sum + (d.value || 0), 0);

            return (
              <div key={stage.value} className="space-y-3">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center justify-between">
                      <span>{stage.label}</span>
                      <Badge variant="outline" className="ml-2">{stageDeals.length}</Badge>
                    </CardTitle>
                    <div className="text-xl font-bold text-navy-900">
                      ${stageValue.toLocaleString()}
                    </div>
                  </CardHeader>
                </Card>

                <div className="space-y-3">
                  {stageDeals.map(deal => (
                    <Card key={deal.id} className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-navy-900 mb-1 line-clamp-2">
                          {deal.name}
                        </h3>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-lg font-bold text-gold-600">
                            ${deal.value?.toLocaleString() || 0}
                          </span>
                          {deal.probability && (
                            <Badge variant="outline" className="text-xs">
                              {deal.probability}%
                            </Badge>
                          )}
                        </div>
                        {deal.expected_close_date && (
                          <p className="text-xs text-slate-500 mt-2">
                            Close: {new Date(deal.expected_close_date).toLocaleDateString()}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}