import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Activity, RefreshCw } from 'lucide-react';

const StatCard = ({ label, value, loading }) => (
  <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
    <div className="text-2xl font-black text-white">{loading ? '…' : (value ?? 0).toLocaleString()}</div>
    <div className="text-xs text-slate-400 mt-1">{label}</div>
  </div>
);

export default function SystemHealthWidget() {
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [users, operators, sales, seoPages, repository, referrals, vipEvents] = await Promise.all([
        base44.entities.User.list('-created_date', 1000).then(r => r.length).catch(() => 0),
        base44.entities.User.filter({ primary_account_type: 'estate_sale_operator' }).then(r => r.length).catch(() => 0),
        base44.entities.EstateSale.list('-created_date', 1000).then(r => r.length).catch(() => 0),
        base44.entities.SEOPage.list('-created_date', 1000).then(r => r.length).catch(() => 0),
        base44.entities.ItemKnowledge.list('-created_date', 1000).then(r => r.length).catch(() => 0),
        base44.entities.ReferralLead.list('-created_date', 1000).then(r => r.length).catch(() => 0),
        base44.entities.VIPEvent.list('-created_date', 1000).then(r => r.length).catch(() => 0),
      ]);
      setStats({ users, operators, sales, seoPages, repository, referrals, vipEvents });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-black text-white uppercase tracking-widest">System Health</h3>
        </div>
        <button onClick={load} className="text-slate-400 hover:text-white transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <StatCard label="Total Users" value={stats.users} loading={loading} />
        <StatCard label="Operators" value={stats.operators} loading={loading} />
        <StatCard label="Total Sales" value={stats.sales} loading={loading} />
        <StatCard label="SEO Pages" value={stats.seoPages} loading={loading} />
        <StatCard label="Repository Records" value={stats.repository} loading={loading} />
        <StatCard label="Referrals" value={stats.referrals} loading={loading} />
        <StatCard label="VIP Registrations" value={stats.vipEvents} loading={loading} />
      </div>
    </div>
  );
}