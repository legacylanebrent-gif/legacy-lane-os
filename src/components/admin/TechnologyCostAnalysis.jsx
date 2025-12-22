import React, { useState } from 'react';
import { ChevronDown, ChevronUp, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function TechnologyCostAnalysis({ sale }) {
  const [expanded, setExpanded] = useState(false);

  // Calculate costs based on sale data
  const calculateCosts = () => {
    const uniqueViews = sale.views || 0;
    const totalViews = uniqueViews + Math.floor(uniqueViews * 0.6); // 60% cached
    const cachedViews = Math.floor(uniqueViews * 0.6);
    const imageCount = sale.images?.length || 0;
    const imageSizeMB = imageCount * 0.37; // Avg 0.37MB per image
    const photoCount = imageCount;
    
    // Cost calculations
    const costs = {
      hosting: { estimate: 0, actual: 0, scenario: 0 },
      pageViewBandwidth: { 
        estimate: 0, 
        actual: 0, 
        scenario: 0,
        detail: `(${totalViews} total)`
      },
      imageStorage: { 
        estimate: imageSizeMB * 0.023, 
        actual: imageSizeMB > 0 ? (imageSizeMB * 0.027).toFixed(2) : 0, 
        scenario: imageSizeMB * 0.023,
        detail: `(${imageCount} images, ${imageSizeMB.toFixed(1)}MB)`
      },
      imageUploadBandwidth: { 
        estimate: photoCount * 0.0135, 
        actual: photoCount > 0 ? (photoCount * 0.016).toFixed(2) : 0, 
        scenario: photoCount * 0.0135,
        detail: `(${photoCount} photos)`
      },
      aiDescriptionGeneration: { 
        estimate: photoCount * 0.003, 
        actual: photoCount > 0 ? (photoCount * 0.0036).toFixed(2) : 0, 
        scenario: photoCount * 0.003,
        detail: `(${photoCount} calls)`
      },
      aiPricingEstimates: { 
        estimate: photoCount * 0.005, 
        actual: photoCount > 0 ? (photoCount * 0.006).toFixed(2) : 0, 
        scenario: photoCount * 0.005,
        detail: `(${photoCount} calls)`
      },
      aiItemComparison: { 
        estimate: Math.floor(photoCount * 0.3) * 0.004, 
        actual: Math.floor(photoCount * 0.3) > 0 ? (Math.floor(photoCount * 0.3) * 0.0048).toFixed(2) : 0, 
        scenario: Math.floor(photoCount * 0.3) * 0.004,
        detail: `(${Math.floor(photoCount * 0.3)} calls)`
      },
      worksheetConnections: { 
        estimate: 0, 
        actual: 0, 
        scenario: 0,
        detail: `(0 sessions)`
      },
      editSaveBandwidth: { 
        estimate: 0, 
        actual: 0, 
        scenario: 0,
        detail: `(0 edits)`
      },
      cdnUniqueViews: { 
        estimate: uniqueViews * 0.02, 
        actual: uniqueViews > 0 ? (uniqueViews * 0.026).toFixed(2) : 0, 
        scenario: uniqueViews * 0.02,
        detail: `(${uniqueViews} unique)`
      },
      cdnCachedViews: { 
        estimate: cachedViews * 0.003, 
        actual: cachedViews > 0 ? (cachedViews * 0.004).toFixed(2) : 0, 
        scenario: cachedViews * 0.003,
        detail: `(${cachedViews} cached)`
      },
      databaseOperations: { 
        estimate: 0, 
        actual: 0, 
        scenario: 0
      }
    };

    return costs;
  };

  const costs = calculateCosts();
  
  const totalEstimate = Object.values(costs).reduce((sum, item) => sum + (parseFloat(item.estimate) || 0), 0);
  const totalActual = Object.values(costs).reduce((sum, item) => sum + (parseFloat(item.actual) || 0), 0);
  const totalScenario = Object.values(costs).reduce((sum, item) => sum + (parseFloat(item.scenario) || 0), 0);

  const netMargin = (sale.actual_revenue || 0) - totalActual;

  return (
    <div className="border-t pt-4 mt-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setExpanded(!expanded)}
        className="w-full justify-between hover:bg-slate-50"
      >
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-cyan-600" />
          <span className="font-medium text-slate-700">Technology Cost Analysis</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-500">
            Est: <span className="font-semibold">${totalEstimate.toFixed(2)}</span>
          </div>
          <div className="text-xs text-slate-700">
            Actual: <span className="font-semibold">${totalActual.toFixed(2)}</span>
          </div>
          <div className="text-xs text-cyan-600">
            Hypo: <span className="font-semibold">${totalScenario.toFixed(2)}</span>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </Button>

      {expanded && (
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-slate-50 rounded-lg">
            <div>
              <div className="text-xs text-slate-500">Unique Views</div>
              <div className="text-lg font-bold text-slate-900">{sale.views || 0}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Total Views</div>
              <div className="text-lg font-bold text-slate-900">
                {(sale.views || 0) + Math.floor((sale.views || 0) * 0.6)}
              </div>
              <div className="text-xs text-slate-400">(current: {sale.views || 0})</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Cached Views</div>
              <div className="text-lg font-bold text-cyan-600">
                {Math.floor((sale.views || 0) * 0.6)}
              </div>
              <div className="text-xs text-slate-400">(60%)</div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200">
            <div className="grid grid-cols-4 gap-2 p-2 bg-slate-100 border-b font-semibold text-xs text-slate-700">
              <div>Cost Category</div>
              <div className="text-right">Estimate</div>
              <div className="text-right">Actual</div>
              <div className="text-right text-cyan-700">Scenario</div>
            </div>

            {[
              { label: 'Hosting', key: 'hosting', detail: '(0 days)' },
              { label: 'Page View Bandwidth', key: 'pageViewBandwidth' },
              { label: 'Image Storage', key: 'imageStorage' },
              { label: 'Image Upload Bandwidth', key: 'imageUploadBandwidth' },
              { label: 'AI Description Generation', key: 'aiDescriptionGeneration' },
              { label: 'AI Pricing Estimates', key: 'aiPricingEstimates' },
              { label: 'AI Item Comparison', key: 'aiItemComparison' },
              { label: 'Worksheet Connections', key: 'worksheetConnections' },
              { label: 'Edit/Save Bandwidth', key: 'editSaveBandwidth' },
              { label: 'CDN - Unique Views', key: 'cdnUniqueViews' },
              { label: 'CDN - Cached Views', key: 'cdnCachedViews' },
              { label: 'Database Operations', key: 'databaseOperations' }
            ].map((item) => (
              <div key={item.key} className="grid grid-cols-4 gap-2 p-2 text-xs border-b hover:bg-slate-50">
                <div className="text-slate-600">
                  {item.label}
                  {costs[item.key].detail && (
                    <span className="text-slate-400 ml-1">{costs[item.key].detail}</span>
                  )}
                </div>
                <div className="text-right text-slate-600">${costs[item.key].estimate.toFixed(2)}</div>
                <div className="text-right text-slate-900 font-semibold">${costs[item.key].actual}</div>
                <div className="text-right text-cyan-600">${costs[item.key].scenario.toFixed(2)}</div>
              </div>
            ))}

            <div className="grid grid-cols-4 gap-2 p-3 bg-slate-50 font-bold text-sm">
              <div className="text-slate-900">Total</div>
              <div className="text-right text-slate-700">${totalEstimate.toFixed(2)}</div>
              <div className="text-right text-slate-900">${totalActual.toFixed(2)}</div>
              <div className="text-right text-cyan-700">${totalScenario.toFixed(2)}</div>
            </div>
          </div>

          {sale.actual_revenue && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-sm font-medium text-green-800">
                Net Margin: Sale revenue minus tech cost = higher profit per listing
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-green-700">Sale Revenue:</span>
                <span className="font-bold text-green-900">${sale.actual_revenue.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-green-700">Tech Cost:</span>
                <span className="font-bold text-green-900">-${totalActual.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-green-300 mt-2">
                <span className="text-sm font-semibold text-green-800">Net Margin:</span>
                <span className="text-lg font-bold text-green-900">${netMargin.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}