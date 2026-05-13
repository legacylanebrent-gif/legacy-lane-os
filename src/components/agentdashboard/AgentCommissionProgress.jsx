import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, DollarSign, CheckCircle } from 'lucide-react';

export default function AgentCommissionProgress({ application, userId }) {
  const [leads, setLeads] = useState([]);

  useEffect(() => {
    const load = async () => {
      if (!userId && !application?.email) return;
      const data = await base44.entities.ReferralLead.filter({ assigned_agent_id: userId });
      setLeads(data || []);
    };
    load();
  }, [userId]);

  const closed = leads.filter(l => l.status === 'closed');
  const inProgress = leads.filter(l => l.status === 'in_progress' || l.status === 'accepted');
  const newLeads = leads.filter(l => l.status === 'new');

  // Estimate commission: assume $500 avg referral fee per closed deal
  const REFERRAL_FEE = 500;
  const earned = closed.length * REFERRAL_FEE;
  const potential = (inProgress.length + newLeads.length) * REFERRAL_FEE;
  const goal = Math.max(earned + potential, REFERRAL_FEE * 10);
  const progress = Math.min((earned / goal) * 100, 100);

  const stats = [
    { label: 'Leads Total', value: leads.length, color: 'text-slate-700' },
    { label: 'In Progress', value: inProgress.length, color: 'text-blue-600' },
    { label: 'Closed', value: closed.length, color: 'text-green-600' },
  ];

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-slate-800">
          <TrendingUp className="w-5 h-5 text-green-500" />
          Commission Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Earned */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <DollarSign className="w-6 h-6 text-green-600 mx-auto mb-1" />
          <p className="text-3xl font-bold text-green-700">${earned.toLocaleString()}</p>
          <p className="text-green-600 text-sm mt-0.5">Estimated Earned</p>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-xs text-slate-500 mb-1.5">
            <span>Progress to Goal</span>
            <span>${goal.toLocaleString()}</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-orange-400 to-green-500 h-3 rounded-full transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-1">{Math.round(progress)}% of goal reached</p>
        </div>

        {/* Stat pills */}
        <div className="grid grid-cols-3 gap-2">
          {stats.map(s => (
            <div key={s.label} className="bg-slate-50 rounded-lg p-3 text-center">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5 leading-tight">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Potential pipeline */}
        {potential > 0 && (
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
            <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <p className="text-sm text-blue-700">
              <span className="font-semibold">${potential.toLocaleString()}</span> potential in active pipeline
            </p>
          </div>
        )}

        {leads.length === 0 && (
          <p className="text-center text-slate-400 text-sm py-2">No leads yet — start building your network below.</p>
        )}
      </CardContent>
    </Card>
  );
}