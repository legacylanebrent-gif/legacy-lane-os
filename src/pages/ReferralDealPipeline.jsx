import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import DealPipelineBoard from '@/components/referral/DealPipelineBoard';

const STAGES = [
  { id: 'new', label: 'New Leads', color: 'bg-slate-100' },
  { id: 'accepted', label: 'Accepted', color: 'bg-blue-100' },
  { id: 'appointment_set', label: 'Appointment Set', color: 'bg-purple-100' },
  { id: 'listing_signed', label: 'Listing Signed', color: 'bg-orange-100' },
  { id: 'under_contract', label: 'Under Contract', color: 'bg-yellow-100' },
  { id: 'closed', label: 'Closed', color: 'bg-green-100' },
];

export default function ReferralDealPipelineView() {
  const [user, setUser] = useState(null);
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const u = await base44.auth.me();
    setUser(u);

    const allDeals = await base44.asServiceRole.entities.ReferralDealPipeline.list('-created_date', 100);
    setDeals(allDeals);
    setLoading(false);
  };

  const handleStageChange = async (dealId, newStage) => {
    await base44.functions.invoke('updateDealStage', {
      deal_id: dealId,
      new_stage: newStage,
    });
    loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-full mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Referral Deal Pipeline</h1>
          <p className="text-slate-500 text-sm mt-1">{deals.length} deals in progress</p>
        </div>

        <DealPipelineBoard
          deals={deals}
          stages={STAGES}
          onStageChange={handleStageChange}
          userId={user?.id}
        />
      </div>
    </div>
  );
}