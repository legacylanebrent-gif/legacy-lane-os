import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, TrendingUp, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

export default function ProfitAnalysis({ sale, techCosts }) {
  const [expanded, setExpanded] = useState(false);
  const [operatorSubscription, setOperatorSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOperatorSubscription();
  }, [sale.operator_id]);

  const loadOperatorSubscription = async () => {
    if (!sale.operator_id) {
      setLoading(false);
      return;
    }

    try {
      const subscriptions = await base44.asServiceRole.entities.Subscription.filter({
        user_id: sale.operator_id,
        status: 'active'
      });
      
      if (subscriptions.length > 0) {
        setOperatorSubscription(subscriptions[0]);
      }
    } catch (error) {
      console.error('Error loading operator subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate revenue based on operator subscription
  const calculateRevenue = () => {
    // Base subscription revenue allocation per sale
    const subscriptionRevenue = {
      'operator_basic': { price: 49, salesPerMonth: 1, name: 'Basic' },
      'operator_pro': { price: 99, salesPerMonth: 2, name: 'Pro' },
      'agent_basic': { price: 149, salesPerMonth: 3, name: 'Agent Basic' },
      'agent_pro': { price: 299, salesPerMonth: 5, name: 'Agent Pro' }
    };

    // Use actual operator subscription or default
    let packageType, subscription;
    
    if (operatorSubscription) {
      const planType = operatorSubscription.plan_type;
      subscription = subscriptionRevenue[planType] || { 
        price: operatorSubscription.price || 99, 
        salesPerMonth: 2, 
        name: planType 
      };
      packageType = subscription.name;
    } else {
      // Default to Pro if no subscription found
      packageType = 'Pro';
      subscription = { price: 99, salesPerMonth: 2, name: 'Pro' };
    }

    const perSaleRevenue = subscription.price / subscription.salesPerMonth;
    
    const revenueSources = [
      {
        label: `${packageType} Package`,
        detail: `Seller Subscription $${subscription.price}/month`,
        amount: perSaleRevenue,
        type: 'subscription'
      }
    ];

    // Add any premium listing fees
    if (sale.national_featured) {
      revenueSources.push({
        label: 'National Featured Listing',
        detail: 'Premium placement',
        amount: sale.national_featured_price || 299,
        type: 'upsell'
      });
    }

    if (sale.local_featured) {
      revenueSources.push({
        label: 'Local Featured Listing',
        detail: 'Regional placement',
        amount: sale.local_featured_price || 99,
        type: 'upsell'
      });
    }

    // Add text campaign or other add-ons
    const hasTextCampaign = Math.random() > 0.7; // Mock for demo
    if (hasTextCampaign) {
      revenueSources.push({
        label: 'Text Campaign',
        detail: 'Marketing add-on',
        amount: 29.00,
        type: 'addon'
      });
    }

    return revenueSources;
  };

  const revenueSources = calculateRevenue();
  const totalRevenue = revenueSources.reduce((sum, source) => sum + source.amount, 0);
  
  // Tech costs from the other component
  const actualTechCost = techCosts.actual || 0;
  const scenarioTechCost = techCosts.scenario || 0;

  // Additional costs could go here (support, operations, etc)
  const totalActualCosts = actualTechCost;
  const totalScenarioCosts = scenarioTechCost;

  const actualProfit = totalRevenue - totalActualCosts;
  const scenarioProfit = totalRevenue - totalScenarioCosts;

  const actualMargin = totalRevenue > 0 ? ((actualProfit / totalRevenue) * 100).toFixed(1) : 0;
  const scenarioMargin = totalRevenue > 0 ? ((scenarioProfit / totalRevenue) * 100).toFixed(1) : 0;

  const getInsight = () => {
    if (actualMargin >= 90) return 'Excellent margins on this sale!';
    if (actualMargin >= 75) return 'Strong profitability';
    if (actualMargin >= 50) return 'Healthy profit margins';
    return 'Room for optimization';
  };

  return (
    <div className="border-t pt-4 mt-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setExpanded(!expanded)}
        className="w-full justify-between hover:bg-slate-50"
      >
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-green-600" />
          <span className="font-medium text-slate-700">Profit Analysis</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-500">
            Revenue: <span className="font-semibold">${totalRevenue.toFixed(2)}</span>
          </div>
          <div className="text-xs text-green-700">
            Profit: <span className="font-semibold">${actualProfit.toFixed(2)}</span>
          </div>
          <div className="text-xs text-cyan-600">
            Hypo: <span className="font-semibold">${scenarioProfit.toFixed(2)}</span>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </Button>

      {expanded && (
        <div className="mt-3 space-y-3">
          <div className="bg-white rounded-lg border border-slate-200">
            {/* Revenue Sources */}
            <div className="p-3 bg-blue-50 border-b">
              <div className="font-semibold text-sm text-slate-900">Revenue Sources</div>
            </div>

            {revenueSources.map((source, idx) => (
              <div key={idx} className="grid grid-cols-2 gap-2 p-3 text-sm border-b hover:bg-slate-50">
                <div>
                  <div className="text-slate-700">{source.label}</div>
                  <div className="text-xs text-slate-500">{source.detail}</div>
                  {source.isRecurring && (
                    <div className="text-xs text-blue-600 mt-1">Recurring revenue</div>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-semibold text-green-700">${source.amount.toFixed(2)}</div>
                </div>
              </div>
            ))}

            <div className="grid grid-cols-2 gap-2 p-3 bg-blue-50 font-bold text-sm">
              <div className="text-slate-900">Total Revenue</div>
              <div className="text-right text-green-700">${totalRevenue.toFixed(2)}</div>
            </div>

            {/* Costs */}
            <div className="p-3 bg-red-50 border-t">
              <div className="font-semibold text-sm text-slate-900">Costs</div>
            </div>

            <div className="grid grid-cols-3 gap-2 p-3 text-xs border-b hover:bg-slate-50">
              <div className="text-slate-700">Technology Costs</div>
              <div className="text-right">
                <div className="text-red-600 font-semibold">-${actualTechCost.toFixed(2)}</div>
                <div className="text-xs text-slate-500">Actual</div>
              </div>
              <div className="text-right">
                <div className="text-cyan-600">-${scenarioTechCost.toFixed(2)}</div>
                <div className="text-xs text-slate-500">Scenario</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 p-3 bg-red-50 font-bold text-sm">
              <div className="text-slate-900">Total Costs</div>
              <div className="text-right text-red-700">-${totalActualCosts.toFixed(2)}</div>
              <div className="text-right text-cyan-700">-${totalScenarioCosts.toFixed(2)}</div>
            </div>

            {/* Profit */}
            <div className="grid grid-cols-2 gap-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-t">
              <div>
                <div className="text-xs text-green-700 mb-1">Actual Profit</div>
                <div className="text-2xl font-bold text-green-700">${actualProfit.toFixed(2)}</div>
                <div className="text-sm text-green-600 mt-1">{actualMargin}% margin</div>
              </div>
              <div>
                <div className="text-xs text-cyan-700 mb-1">Scenario Profit</div>
                <div className="text-2xl font-bold text-cyan-700">${scenarioProfit.toFixed(2)}</div>
                <div className="text-sm text-cyan-600 mt-1">{scenarioMargin}% margin</div>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <Lightbulb className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-yellow-800">
              <span className="font-medium">Insight:</span> {getInsight()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}