import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Post-Sale actions for the SaleEditor "Post Sale" tab: offer remaining
// inventory to registered resellers privately after the sale completes.
export default function PostSaleActionsCard({ saleId, onPackUp }) {
  if (!saleId) {
    return <p className="text-sm text-slate-500 text-center py-8">Save the sale first to manage post-sale actions.</p>;
  }
  return (
    <Card className="border-purple-200 bg-purple-50/40">
      <CardContent className="pt-6 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full bg-purple-600" />
          <h2 className="text-base font-semibold text-slate-900">Post-Sale Actions</h2>
        </div>
        <p className="text-xs text-slate-500">After your sale completes, offer remaining inventory to registered resellers privately.</p>
        <Button
          variant="outline"
          className="border-purple-400 text-purple-700 hover:bg-purple-100 w-full sm:w-auto"
          onClick={onPackUp}
        >
          <span className="mr-2">📦</span>
          Create Reseller Pack-Up Event
        </Button>
        <p className="text-xs text-slate-400">This creates a private, invite-only event for resellers only. Not visible to the public.</p>
      </CardContent>
    </Card>
  );
}