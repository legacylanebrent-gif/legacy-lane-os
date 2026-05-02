import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Clock, CheckCircle, DollarSign } from 'lucide-react';

const STATUS_LABELS = {
  pending:    'Invite Sent',
  signed_up:  'Signed Up',
  subscribed: 'Subscribed',
  converted:  'Converted',
  paid:       'Paid',
};

const REWARD_COLORS = {
  pending:    'bg-slate-100 text-slate-600',
  processing: 'bg-blue-100 text-blue-700',
  sent:       'bg-green-100 text-green-700',
  claimed:    'bg-emerald-100 text-emerald-700',
};

export default function ReferralList({ referrals, isOperator, statusColors }) {
  if (referrals.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Users className="w-14 h-14 mx-auto text-slate-200 mb-3" />
          <p className="text-slate-500 font-medium">No referrals yet</p>
          <p className="text-sm text-slate-400 mt-1">Copy your referral link above and start sharing!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {referrals.map(ref => (
        <div
          key={ref.id}
          className="bg-white border border-slate-100 rounded-xl px-5 py-4 shadow-sm flex flex-col sm:flex-row sm:items-center gap-3"
        >
          {/* Avatar */}
          <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-slate-500 text-sm">
            {(ref.referred_user_name || ref.referred_email || '?').charAt(0).toUpperCase()}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-800 truncate">
              {ref.referred_user_name || ref.referred_company_name || ref.referred_email || ref.referred_user_email || 'Invited User'}
            </p>
            {(ref.referred_email || ref.referred_user_email) && (
              <p className="text-sm text-slate-400 truncate">
                {ref.referred_email || ref.referred_user_email}
              </p>
            )}
            <p className="text-xs text-slate-400 mt-0.5">
              Sent {new Date(ref.created_date).toLocaleDateString()}
            </p>
          </div>

          {/* Status + Reward */}
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            <Badge className={`${statusColors[ref.status] || 'bg-slate-100 text-slate-600'} text-xs font-medium`}>
              {STATUS_LABELS[ref.status] || ref.status}
            </Badge>

            {isOperator && ref.reward_amount > 0 && (
              <Badge className={`${REWARD_COLORS[ref.reward_status] || 'bg-slate-100 text-slate-600'} text-xs font-medium`}>
                <DollarSign className="w-3 h-3 mr-0.5" />
                {ref.reward_amount} — {ref.reward_status}
              </Badge>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}