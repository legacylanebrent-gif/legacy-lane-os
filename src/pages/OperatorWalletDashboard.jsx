import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { DollarSign, TrendingUp, Clock, Lock, AlertCircle, Send } from 'lucide-react';

export default function OperatorWalletDashboard() {
  const [user, setUser] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [deals, setDeals] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const u = await base44.auth.me();
    setUser(u);

    if (u) {
      // Load wallet
      const wallets = await base44.entities.OperatorWallet.filter({ operator_id: u.id });
      if (wallets.length > 0) setWallet(wallets[0]);

      // Load transactions
      const txns = await base44.entities.WalletTransaction.filter({ operator_id: u.id });
      setTransactions(txns.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));

      // Load Houszu data (via functions)
      try {
        const dealsRes = await base44.functions.invoke('getOperatorDealsFromHouszu', { operator_id: u.id });
        if (dealsRes.data?.deals) setDeals(dealsRes.data.deals);
      } catch (_) {}

      try {
        const commissionsRes = await base44.functions.invoke('getOperatorCommissionsFromHouszu', { operator_id: u.id });
        if (commissionsRes.data?.commissions) setCommissions(commissionsRes.data.commissions);
      } catch (_) {}
    }
    setLoading(false);
  };

  const handleWithdrawal = async () => {
    if (!withdrawalAmount || isNaN(withdrawalAmount) || parseFloat(withdrawalAmount) < 100) {
      alert('Minimum withdrawal is $100');
      return;
    }

    setWithdrawing(true);
    const amountCents = Math.round(parseFloat(withdrawalAmount) * 100);

    try {
      await base44.functions.invoke('requestOperatorWithdrawal', {
        operator_id: user.id,
        amount: amountCents
      });
      setWithdrawalAmount('');
      await loadData();
      alert('Withdrawal request submitted');
    } catch (err) {
      alert(err.message || 'Failed to request withdrawal');
    } finally {
      setWithdrawing(false);
    }
  };

  const formatCurrency = (cents) => {
    if (!cents) return '$0.00';
    return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  const canWithdraw = wallet?.wallet_status === 'active' && (wallet?.available_balance || 0) >= 10000;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Operator Wallet</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your platform credits and withdrawals</p>
        </div>

        {wallet?.wallet_status !== 'active' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900">Wallet {wallet?.wallet_status}</h3>
              <p className="text-sm text-red-700 mt-1">Your wallet is not active. Contact support for assistance.</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-200 rounded-xl p-1 w-fit">
          {['overview', 'deals', 'commissions', 'transactions'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Wallet Summary Cards */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-slate-500 text-sm font-medium">Available Balance</p>
                  <DollarSign className="w-5 h-5 text-orange-500 opacity-20" />
                </div>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(wallet?.available_balance)}</p>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-slate-500 text-sm font-medium">Pending Credits</p>
                  <Clock className="w-5 h-5 text-yellow-500 opacity-20" />
                </div>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(wallet?.pending_balance)}</p>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-slate-500 text-sm font-medium">Total Credits</p>
                  <TrendingUp className="w-5 h-5 text-green-500 opacity-20" />
                </div>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(wallet?.total_credits)}</p>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-slate-500 text-sm font-medium">Withdrawn Total</p>
                  <DollarSign className="w-5 h-5 text-slate-500 opacity-20" />
                </div>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(wallet?.withdrawn_total)}</p>
              </div>
            </div>

            {/* Withdrawal Request */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-bold text-slate-900 mb-4">Request Withdrawal</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Amount ($)</label>
                  <input
                    type="number"
                    value={withdrawalAmount}
                    onChange={(e) => setWithdrawalAmount(e.target.value)}
                    disabled={!canWithdraw}
                    placeholder="100.00"
                    min="100"
                    step="0.01"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm disabled:opacity-50"
                  />
                  <p className="text-xs text-slate-500 mt-1">Minimum: $100 | Available: {formatCurrency(wallet?.available_balance)}</p>
                </div>
                <Button
                  onClick={handleWithdrawal}
                  disabled={!canWithdraw || withdrawing}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-bold gap-2"
                >
                  <Send className="w-4 h-4" />
                  {withdrawing ? 'Processing...' : 'Submit Withdrawal Request'}
                </Button>
                {!canWithdraw && wallet?.wallet_status !== 'active' && (
                  <p className="text-sm text-red-600">Your wallet is {wallet?.wallet_status}. Withdrawals are unavailable.</p>
                )}
                {!canWithdraw && (wallet?.available_balance || 0) < 10000 && (
                  <p className="text-sm text-slate-600">You need at least $100 available to withdraw.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Deals Tab */}
        {activeTab === 'deals' && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Property</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Stage</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-700 uppercase">Est. Value</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-700 uppercase">Expected Fee</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {deals.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-10 text-center text-slate-500 text-sm">No deals found</td>
                    </tr>
                  ) : (
                    deals.map((deal, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-sm font-medium text-slate-900">{deal.property_address}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{deal.stage}</td>
                        <td className="px-6 py-4 text-sm text-right text-slate-900">{formatCurrency(deal.estimated_value)}</td>
                        <td className="px-6 py-4 text-sm text-right font-semibold text-slate-900">{formatCurrency(deal.expected_referral_fee)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Commissions Tab */}
        {activeTab === 'commissions' && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Property</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-700 uppercase">Expected Fee</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-700 uppercase">Actual Fee</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-slate-700 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {commissions.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-10 text-center text-slate-500 text-sm">No commissions found</td>
                    </tr>
                  ) : (
                    commissions.map((comm, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-sm font-medium text-slate-900">{comm.property_address}</td>
                        <td className="px-6 py-4 text-sm text-right text-slate-600">{formatCurrency(comm.expected_referral_fee)}</td>
                        <td className="px-6 py-4 text-sm text-right font-semibold text-slate-900">{formatCurrency(comm.actual_referral_fee)}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${
                            comm.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                            comm.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' :
                            'bg-slate-50 text-slate-700 border-slate-200'
                          }`}>
                            {comm.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Property</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-700 uppercase">Amount</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-slate-700 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-10 text-center text-slate-500 text-sm">No transactions found</td>
                    </tr>
                  ) : (
                    transactions.map((txn) => (
                      <tr key={txn.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-sm text-slate-600">{new Date(txn.created_date).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-900 capitalize">{txn.type}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{txn.property_address || '—'}</td>
                        <td className="px-6 py-4 text-sm text-right font-semibold text-slate-900">{formatCurrency(txn.amount)}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border capitalize ${
                            txn.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                            txn.status === 'available' || txn.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' :
                            'bg-slate-50 text-slate-700 border-slate-200'
                          }`}>
                            {txn.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}