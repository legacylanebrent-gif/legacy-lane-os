import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { DollarSign, TrendingUp, AlertCircle } from 'lucide-react';

export default function OperatorCommissions() {
  const [user, setUser] = useState(null);
  const [commissions, setCommissions] = useState([]);
  const [stats, setStats] = useState({ total_expected: 0, total_actual: 0, pending_count: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadCommissions();
  }, []);

  const loadCommissions = async () => {
    try {
      const u = await base44.auth.me();
      setUser(u);

      const res = await base44.functions.invoke('getCommissionsForOperator', {});
      setCommissions(res.data.commissions || []);
      setStats({
        total_expected: res.data.total_expected || 0,
        total_actual: res.data.total_actual || 0,
        pending_count: res.data.pending_count || 0,
      });
    } catch (err) {
      setError(err.message || 'Failed to load commissions');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (cents) => {
    if (!cents) return '$0.00';
    return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'confirmed':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'paid':
        return 'bg-green-50 text-green-700 border-green-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
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
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Commission Tracker</h1>
          <p className="text-slate-500 text-sm mt-1">Real-time view of your referral commissions from Houszu</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900">Failed to Load Commissions</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm font-medium">Total Expected</p>
                <p className="text-2xl font-bold text-slate-900 mt-2">{formatCurrency(stats.total_expected)}</p>
              </div>
              <DollarSign className="w-10 h-10 text-orange-600 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm font-medium">Total Paid</p>
                <p className="text-2xl font-bold text-green-600 mt-2">{formatCurrency(stats.total_actual)}</p>
              </div>
              <TrendingUp className="w-10 h-10 text-green-600 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm font-medium">Pending</p>
                <p className="text-2xl font-bold text-yellow-600 mt-2">{stats.pending_count}</p>
              </div>
              <AlertCircle className="w-10 h-10 text-yellow-600 opacity-20" />
            </div>
          </div>
        </div>

        {/* Commissions Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide">Property Address</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide">Deal Stage</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wide">Expected Fee</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wide">Actual Fee</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {commissions.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-10 text-center text-slate-500">
                      <p className="text-sm">No commissions found</p>
                    </td>
                  </tr>
                ) : (
                  commissions.map(commission => (
                    <tr key={commission.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-900">{commission.property_address}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{commission.client_name}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                          {commission.deal_stage || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-slate-900">
                        {formatCurrency(commission.expected_referral_fee)}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-slate-900">
                        {commission.actual_referral_fee ? formatCurrency(commission.actual_referral_fee) : '—'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(commission.status)}`}>
                          {commission.status.charAt(0).toUpperCase() + commission.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Read-Only Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center text-sm text-blue-700">
          <p>This is a read-only view of commissions tracked by Houszu. Data is updated automatically when deals close.</p>
        </div>
      </div>
    </div>
  );
}