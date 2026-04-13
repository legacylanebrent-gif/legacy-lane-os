import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export default function DeepSearchPricingModal({ isOpen, onClose, photoPricing, imageUrl }) {
  const pricing = photoPricing ? photoPricing[imageUrl] : null;

  if (!pricing) return null;

  const { sources, low_price, high_price, average_price } = pricing;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Deep Search Pricing Results</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Price Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <p className="text-sm text-blue-600 mb-1">Low Price</p>
              <p className="text-3xl font-bold text-blue-700">${low_price?.toLocaleString()}</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <p className="text-sm text-green-600 mb-1">Average Price</p>
              <p className="text-3xl font-bold text-green-700">${average_price?.toLocaleString()}</p>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
              <p className="text-sm text-orange-600 mb-1">High Price</p>
              <p className="text-3xl font-bold text-orange-700">${high_price?.toLocaleString()}</p>
            </div>
          </div>

          {/* Sources List */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Market Sources ({sources?.length || 0})</h3>
            <div className="space-y-3">
              {sources && sources.length > 0 ? (
                sources.map((source, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{source.site || source.title || 'Unknown Source'}</p>
                      {source.title && <p className="text-sm text-slate-600">{source.title}</p>}
                    </div>
                    <p className="text-xl font-bold text-green-600 flex-shrink-0">${source.price?.toLocaleString()}</p>
                  </div>
                ))
              ) : (
                <p className="text-slate-500">No source data available</p>
              )}
            </div>
          </div>

          {/* Close Button */}
          <div className="flex justify-end pt-4 border-t border-slate-200">
            <Button onClick={onClose} className="bg-orange-600 hover:bg-orange-700">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}