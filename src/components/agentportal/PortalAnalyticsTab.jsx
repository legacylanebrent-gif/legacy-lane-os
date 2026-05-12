import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { TrendingUp, DollarSign, FileText, Loader2, Activity } from 'lucide-react';

const COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6'];

export default function PortalAnalyticsTab({ user }) {
  const [leads, setLeads] = useState([]);
  const [deals, setDeals] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [l, d, c] = await Promise.all([
          base44.entities.ReferralLead.list(),
          base44.entities.ReferralDealAgreement.list(),
          base44.entities.ReferralCommission.list(),
        ]);
        // Filter to agent's records
        const myAgentId = user?.id || user?.email;
        setLeads(myAgentId ? l.filter(x => x.assigned_agent_id === myAgentId || x.source_user_id === myAgentId) : l);
        setDeals(myAgentId ? d.filter(x => x.agent_id === myAgentId) : d);
        setCommissions(myAgentId ? c.filter(x => x.agent_id === myAgentId) : c);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
    </div>
  );

  // Compute stats
  const totalLeads = leads.length;
  const closedDeals = deals.filter(d => d.status === 'closed').length;
  const activeDeals = deals.filter(d => d.status === 'active').length;
  const totalCommEarned = commissions
    .filter(c => c.status === 'paid')
    .reduce((sum, c) => sum + (c.actual_referral_fee || c.expected_referral_fee || 0), 0);
  const pendingComm = commissions
    .filter(c => c.status !== 'paid')
    .reduce((sum, c) => sum + (c.expected_referral_fee || 0), 0);

  // Lead status breakdown for pie
  const statusCounts = leads.reduce((acc, l) => {
    acc[l.status] = (acc[l.status] || 0) + 1;
    return acc;
  }, {});
  const pieData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

  // Commission bar data
  const commByStatus = [
    { status: 'Paid', amount: (commissions.filter(c => c.status === 'paid').reduce((s, c) => s + (c.actual_referral_fee || 0), 0) / 100).toFixed(0) },
    { status: 'Confirmed', amount: (commissions.filter(c => c.status === 'confirmed').reduce((s, c) => s + (c.expected_referral_fee || 0), 0) / 100).toFixed(0) },
    { status: 'Pending', amount: (commissions.filter(c => c.status === 'pending').reduce((s, c) => s + (c.expected_referral_fee || 0), 0) / 100).toFixed(0) },
  ];

  const StatCard = ({ icon: Icon, label, value, sub, color }) => (
    <Card className="border-slate-200">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
        </div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-xs font-semibold text-slate-600 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Activity} label="Total Leads" value={totalLeads} sub="All time" color="bg-orange-500" />
        <StatCard icon={TrendingUp} label="Active Deals" value={activeDeals} sub={`${closedDeals} closed`} color="bg-blue-500" />
        <StatCard icon={DollarSign} label="Commissions Earned" value={`$${(totalCommEarned / 100).toLocaleString()}`} sub="Paid to date" color="bg-emerald-500" />
        <StatCard icon={FileText} label="Pending Rewards" value={`$${(pendingComm / 100).toLocaleString()}`} sub="Estimated" color="bg-purple-500" />
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Lead Status Pie */}
        <Card className="border-slate-200">
          <CardContent className="p-5">
            <h4 className="font-bold text-slate-800 mb-4 text-sm">Lead Status Breakdown</h4>
            {pieData.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-slate-400 text-sm">No lead data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Commission Bar */}
        <Card className="border-slate-200">
          <CardContent className="p-5">
            <h4 className="font-bold text-slate-800 mb-4 text-sm">Referral Rewards by Status ($)</h4>
            {commissions.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-slate-400 text-sm">No commission data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={commByStatus} barSize={40}>
                  <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [`$${v}`, 'Amount']} />
                  <Bar dataKey="amount" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Leads table */}
      <Card className="border-slate-200">
        <CardContent className="p-5">
          <h4 className="font-bold text-slate-800 mb-4 text-sm">Recent Referral Leads</h4>
          {leads.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No referral leads yet. Leads routed from your operator partners will appear here.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wide">
                    <th className="text-left pb-3 font-semibold">Client</th>
                    <th className="text-left pb-3 font-semibold">Property</th>
                    <th className="text-left pb-3 font-semibold">Source</th>
                    <th className="text-left pb-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {leads.slice(0, 8).map((l, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="py-3 font-medium text-slate-900">{l.client_name}</td>
                      <td className="py-3 text-slate-600 truncate max-w-[180px]">{l.property_address}</td>
                      <td className="py-3"><Badge className="text-xs bg-blue-100 text-blue-700">{l.source_type}</Badge></td>
                      <td className="py-3">
                        <Badge className={`text-xs ${l.status === 'closed' ? 'bg-emerald-100 text-emerald-700' : l.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                          {l.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}