import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';
import MySubmittedReferrals from '@/components/referrals/MySubmittedReferrals';

export default function ReferralTrackerCard({ userId, refreshKey }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <p className="text-[10px] uppercase tracking-[0.14em] font-semibold text-slate-500">
            Referral tracker
          </p>
          <Link
            to="/SubmitClientReferral"
            className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-700 hover:text-cyan-800"
          >
            Referral center
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <MySubmittedReferrals userId={userId} refreshKey={refreshKey} />
      </CardContent>
    </Card>
  );
}