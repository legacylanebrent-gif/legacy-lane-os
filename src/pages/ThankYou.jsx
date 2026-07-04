import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, ShoppingBag, Home, Package } from 'lucide-react';
import UniversalHeader from '@/components/layout/UniversalHeader';
import SharedFooter from '@/components/layout/SharedFooter';

export default function ThankYou() {
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type') || 'marketplace';
  const itemId = searchParams.get('id');

  const isMobile = window.location.pathname.startsWith('/mobile');

  if (isMobile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-cyan-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Payment Complete!</h1>
          <p className="text-slate-600 mb-6">
            {type === 'pos'
              ? 'Your order has been processed. The seller has been notified.'
              : 'Your purchase is confirmed. The seller will be in touch about shipping or pickup.'}
          </p>
          <Link to="/mobile" className="inline-flex items-center gap-2 bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-700">
            <Home className="w-4 h-4" /> Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-cyan-50 flex flex-col">
      <UniversalHeader isAuthenticated={false} />
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="text-center max-w-md">
          <CheckCircle className="w-24 h-24 text-green-500 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-slate-900 mb-3">Payment Complete!</h1>
          <p className="text-slate-600 mb-8">
            {type === 'pos'
              ? 'Your order has been processed successfully. The seller has been notified and your items are ready for pickup.'
              : 'Your purchase is confirmed! The seller will contact you about shipping or local pickup arrangements.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {type === 'marketplace' && (
              <Link to="/BrowseItems" className="inline-flex items-center gap-2 bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-700">
                <ShoppingBag className="w-4 h-4" /> Continue Shopping
              </Link>
            )}
            {itemId && (
              <Link to={`/MarketplaceItemDetail?id=${itemId}`} className="inline-flex items-center gap-2 border border-slate-300 text-slate-700 px-6 py-3 rounded-lg font-semibold hover:bg-slate-50">
                <Package className="w-4 h-4" /> View Item
              </Link>
            )}
            <Link to="/" className="inline-flex items-center gap-2 border border-slate-300 text-slate-700 px-6 py-3 rounded-lg font-semibold hover:bg-slate-50">
              <Home className="w-4 h-4" /> Home
            </Link>
          </div>
        </div>
      </div>
      <SharedFooter />
    </div>
  );
}