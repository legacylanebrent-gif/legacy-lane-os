import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Zap, AlertTriangle, Check, Loader2 } from 'lucide-react';

const CREDIT_PACKAGES = [
  { id: 'lens_500', searches: 500, price: 19, label: '500 Extra Searches', bestValue: false },
  { id: 'lens_1500', searches: 1500, price: 49, label: '1,500 Extra Searches', bestValue: false },
  { id: 'lens_5000', searches: 5000, price: 129, label: '5,000 Extra Searches', bestValue: false },
  { id: 'lens_15000', searches: 15000, price: 299, label: '15,000 Extra Searches', bestValue: true },
];

export default function GoogleLensCreditDisplay({ operatorId, compact = false }) {
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState(null);

  const loadAccount = useCallback(async () => {
    try {
      const accounts = await base44.entities.OperatorAICreditAccount.filter({
        operator_id: operatorId
      });
      setAccount(accounts[0] || null);
    } catch (e) {
      // Account doesn't exist yet — not an error
    } finally {
      setLoading(false);
    }
  }, [operatorId]);

  useEffect(() => {
    if (operatorId) loadAccount();
  }, [operatorId, loadAccount]);

  const handlePurchase = async (pkg) => {
    setSelectedPackage(pkg.id);
    setPurchasing(true);
    setError(null);
    try {
      await base44.functions.invoke('purchaseGoogleLensCredits', {
        credit_package_id: pkg.id
      });
      await loadAccount();
      setDialogOpen(false);
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Purchase failed');
    } finally {
      setPurchasing(false);
      setSelectedPackage(null);
    }
  };

  if (loading) {
    return null;
  }

  const baseLimit = account?.google_lens_searches_limit || 0;
  const baseUsed = account?.google_lens_searches_used || 0;
  const purchased = account?.google_lens_purchased_searches || 0;
  const purchasedUsed = account?.google_lens_purchased_used || 0;

  const remainingPurchased = Math.max(0, purchased - purchasedUsed);
  const remainingBase = baseLimit === -1 ? Infinity : Math.max(0, baseLimit - baseUsed);
  const totalRemaining = remainingPurchased + (remainingBase === Infinity ? 999999 : remainingBase);
  const totalLimit = (baseLimit === -1 ? 'Unlimited' : baseLimit) + (purchased > 0 ? ` + ${purchased} purchased` : '');

  const isLow = totalRemaining <= 10 && totalRemaining > 0;
  const isOut = totalRemaining <= 0;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {isOut ? (
          <Badge className="bg-red-100 text-red-700 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Out of credits
          </Badge>
        ) : isLow ? (
          <Badge className="bg-amber-100 text-amber-700 flex items-center gap-1">
            <Zap className="w-3 h-3" />
            {totalRemaining === Infinity ? 'Unlimited' : `${totalRemaining} left`}
          </Badge>
        ) : (
          <span className="text-xs text-slate-500">
            {baseLimit === -1 ? 'Unlimited' : `${totalRemaining} searches left`}
          </span>
        )}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="text-xs h-7">
              <Zap className="w-3 h-3 mr-1" />
              Buy More
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-600" />
                Buy Google Lens Credits
              </DialogTitle>
              <DialogDescription>
                {isOut
                  ? "You're out of Google Lens searches. Purchase a top-up below."
                  : `You have ${totalRemaining === Infinity ? 'unlimited' : totalRemaining} searches remaining. Add more anytime.`}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-4">
              {CREDIT_PACKAGES.map(pkg => (
                <button
                  key={pkg.id}
                  onClick={() => handlePurchase(pkg)}
                  disabled={purchasing}
                  className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all text-left
                    ${pkg.bestValue ? 'border-amber-400 bg-amber-50' : 'border-slate-200 hover:border-slate-300'}
                    ${purchasing ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-sm'}
                  `}
                >
                  <div>
                    <div className="font-semibold text-slate-900 flex items-center gap-2">
                      {pkg.label}
                      {pkg.bestValue && (
                        <Badge className="bg-amber-600 text-white text-xs">Best Value</Badge>
                      )}
                    </div>
                    <div className="text-sm text-slate-500">
                      ${(pkg.price / pkg.searches).toFixed(2)} per search
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-slate-900">${pkg.price}</div>
                    {purchasing && selectedPackage === pkg.id && (
                      <Loader2 className="w-4 h-4 animate-spin ml-auto mt-1" />
                    )}
                  </div>
                </button>
              ))}
            </div>
            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                {error}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Credit Status Card */}
      <div className={`rounded-xl border-2 p-4 ${isOut ? 'border-red-200 bg-red-50' : isLow ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white'}`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <Zap className={`w-5 h-5 ${isOut ? 'text-red-500' : isLow ? 'text-amber-500' : 'text-slate-400'}`} />
            Google Lens Searches
          </h3>
          <Badge className={isOut ? 'bg-red-100 text-red-700' : isLow ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}>
            {baseLimit === -1 ? 'Unlimited' : `${totalRemaining} remaining`}
          </Badge>
        </div>

        {/* Progress bars */}
        {baseLimit > 0 && (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Base Monthly ({baseLimit})</span>
              <span>{baseUsed} used</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${baseUsed >= baseLimit ? 'bg-red-500' : baseUsed / baseLimit > 0.75 ? 'bg-amber-500' : 'bg-green-500'}`}
                style={{ width: `${Math.min(100, (baseUsed / baseLimit) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {purchased > 0 && (
          <div className="space-y-2 text-sm mt-3">
            <div className="flex justify-between text-slate-600">
              <span>Purchased Credits ({purchased})</span>
              <span>{purchasedUsed} used</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${purchasedUsed >= purchased ? 'bg-red-500' : 'bg-cyan-500'}`}
                style={{ width: `${purchased > 0 ? Math.min(100, (purchasedUsed / purchased) * 100) : 0}%` }}
              />
            </div>
          </div>
        )}

        {isOut && (
          <div className="mt-3 flex items-center gap-2 text-red-700 text-sm">
            <AlertTriangle className="w-4 h-4" />
            You've used all your Google Lens searches for this month.
          </div>
        )}
      </div>

      {/* Purchase Button */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button className="w-full" variant="outline">
            <Zap className="w-4 h-4 mr-2 text-amber-600" />
            Buy More Google Lens Credits
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-600" />
              Buy Google Lens Credits
            </DialogTitle>
            <DialogDescription>
              {isOut
                ? "You're out of Google Lens searches. Purchase a top-up below."
                : `You have ${totalRemaining === Infinity ? 'unlimited' : totalRemaining} searches remaining. Add more anytime.`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            {CREDIT_PACKAGES.map(pkg => (
              <button
                key={pkg.id}
                onClick={() => handlePurchase(pkg)}
                disabled={purchasing}
                className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all text-left
                  ${pkg.bestValue ? 'border-amber-400 bg-amber-50' : 'border-slate-200 hover:border-slate-300'}
                  ${purchasing ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-sm'}
                `}
              >
                <div>
                  <div className="font-semibold text-slate-900 flex items-center gap-2">
                    {pkg.label}
                    {pkg.bestValue && (
                      <Badge className="bg-amber-600 text-white text-xs">Best Value</Badge>
                    )}
                  </div>
                  <div className="text-sm text-slate-500">
                    ${(pkg.price / pkg.searches).toFixed(2)} per search
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-slate-900">${pkg.price}</div>
                  {purchasing && selectedPackage === pkg.id && (
                    <Loader2 className="w-4 h-4 animate-spin ml-auto mt-1" />
                  )}
                </div>
              </button>
            ))}
          </div>
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}