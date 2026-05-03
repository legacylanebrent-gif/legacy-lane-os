import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { DollarSign, Wallet, AlertTriangle, Lock, CheckCircle, Search } from 'lucide-react';

export default function AdminWalletDashboard() {
  const [user, setUser] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [stats, setStats] = useState({
    totalPending: 0,
    totalAvailable: 0,
    totalWithdrawn: 0,
    frozenCount: 0,
    pendingWithdrawals: 0
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const u = await base44.auth.me();
    if (u?.role !== 'admin') {
      window.location.href = '/';
      return;
    }
    setUser(u);

    // Load all wallets
    const allWallets = await base44.asServiceRole.entities.OperatorWallet.list('-updated_date', 100);
    setWallets(allWallets);

    // Calculate stats
    const pending = allWallets.reduce((sum, w) => sum + (w.pending_balance || 0), 0);
    const available = allWallets.reduce((sum, w) => sum + (w.available_balance || 0), 0);
    const withdrawn = allWallets.reduce((sum, w) => sum + (w.withdrawn_total || 0), 0);
    const frozen = allWallets.filter(w => w.wallet_status === 'frozen').length;

    setStats({
      totalPending: pending,
      totalAvailable: available,
      totalWithdrawn: withdrawn,
      frozenCount: frozen,
      pendingWithdrawals: 0 // Will update below
    });

    // Load all transactions
    const allTxns = await base44.asServiceRole.entities.WalletTransaction.list('-created_date', 500);
    setAllTransactions(allTxns);

    const pendingWithdrawals = allTxns.filter(t => t.type === 'withdrawal' && t.status === 'pending').length;
    setStats(prev => ({ ...prev, pendingWithdrawals }));

    setTransactions(allTxns);
    setLoading(false);
  };

  const handleApproveWithdrawal = async (transactionId) => {
    setApprovingId(transactionId);
    try {
      await base44.functions.invoke('adminApproveWithdrawal', { transaction_id: transactionId });
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to approve withdrawal');
    } finally {
      setApprovingId(null);
    }
  };

  const formatCurrency = (cents) => {
    if (!cents) return '$0.00';
    return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const filteredTransactions = transactions.filter(t => {
    if (!searchQuery) return true;
    return t.transaction_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           t.operator_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           t.deal_id?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const pendingWithdrawals = transactions.filter(t => t.type === 'withdrawal' && t.status === 'pending');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Admin Wallet Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Manage operator wallets and approve withdrawals</p>
        </div>

        {/* Stats Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-slate-500 text-xs uppercase font-semibold">Total Available</p>
            <p className="text-2xl font-bold text-slate-900 mt-2">{formatCurrency(stats.totalAvailable)}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-slate-500 text-xs uppercase font-semibold">Total Pending</p>
            <p className="text-2xl font-bold text-yellow-600 mt-2">{formatCurrency(stats.totalPending)}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-slate-500 text-xs uppercase font-semibold">Total Withdrawn</p>
            <p className="text-2xl font-bold text-slate-900 mt-2">{formatCurrency(stats.totalWithdrawn)}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-slate-500 text-xs uppercase font-semibold">Pending Withdrawals</p>
            <p className="text-2xl font-bold text-orange-600 mt-2">{stats.pendingWithdrawals}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-slate-500 text-xs uppercase font-semibold">Frozen Wallets</p>
            <p className="text-2xl font-bold text-red-600 mt-2">{stats.frozenCount}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-200 rounded-xl p-1 w-fit flex-wrap">
          {['overview', 'withdrawals', 'transactions', 'wallets'].map(tab => (
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
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Frozen Wallets */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                Frozen Wallets
              </h3>
              <div className="space-y-3">
                {wallets.filter(w => w.wallet_status === 'frozen').length === 0 ? (
                  <p className="text-sm text-slate-500">No frozen wallets</p>
                ) : (
                  wallets.filter(w => w.wallet_status === 'frozen').map(w => (
                    <div key={w.id} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="font-medium text-red-900 text-sm">{w.operator_id}</p>
                      <p className="text-xs text-red-700 mt-1">Available: {formatCurrency(w.available_balance)}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Top Operators by Balance */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-orange-600" />
                Top Operators by Balance
              </h3>
              <div className="space-y-3">
                {wallets
                  .sort((a, b) => (b.available_balance || 0) - (a.available_balance || 0))
                  .slice(0, 5)
                  .map(w => (
                    <div key={w.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <p className="text-sm font-medium text-slate-900">{w.operator_id.slice(-8)}</p>
                      <p className="text-sm font-bold text-slate-900">{formatCurrency(w.available_balance)}</p>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        )}

        {/* Withdrawals Tab */}
        {activeTab === 'withdrawals' && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h3 className="font-bold text-slate-900">Pending Withdrawal Requests ({pendingWithdrawals.length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Transaction ID</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Operator</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-700 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Date</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-slate-700 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {pendingWithdrawals.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-10 text-center text-slate-500 text-sm">No pending withdrawals</td>
                    </tr>
                  ) : (
                    pendingWithdrawals.map(txn => (
                      <tr key={txn.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-sm font-mono text-slate-900">{txn.transaction_id}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{txn.operator_id}</td>
                        <td className="px-6 py-4 text-sm text-right font-semibold text-slate-900">{formatCurrency(txn.amount)}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{new Date(txn.created_date).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-center">
                          <Button
                            onClick={() => handleApproveWithdrawal(txn.transaction_id)}
                            disabled={approvingId === txn.transaction_id}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white text-xs"
                          >
                            {approvingId === txn.transaction_id ? 'Approving...' : 'Approve'}
                          </Button>
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
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <input
                type="text"
                placeholder="Search by transaction ID, operator, or deal ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Operator</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Deal ID</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-slate-700 uppercase">Amount</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-slate-700 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-10 text-center text-slate-500 text-sm">No transactions found</td>
                      </tr>
                    ) : (
                      filteredTransactions.map(txn => (
                        <tr key={txn.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 text-sm font-medium text-slate-900">{txn.operator_id.slice(-8)}</td>
                          <td className="px-6 py-4 text-sm text-slate-600 capitalize">{txn.type}</td>
                          <td className="px-6 py-4 text-sm text-slate-600">{txn.deal_id || '—'}</td>
                          <td className="px-6 py-4 text-sm text-right font-semibold text-slate-900">{formatCurrency(txn.amount)}</td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border capitalize ${
                              txn.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                              txn.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' :
                              'bg-slate-50 text-slate-700 border-slate-200'
                            }`}>
                              {txn.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">{new Date(txn.created_date).toLocaleDateString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Wallets Tab */}
        {activeTab === 'wallets' && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Operator</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-700 uppercase">Available</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-700 uppercase">Pending</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-700 uppercase">Total Credits</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-slate-700 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {wallets.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-10 text-center text-slate-500 text-sm">No wallets found</td>
                    </tr>
                  ) : (
                    wallets.map(w => (
                      <tr key={w.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-sm font-medium text-slate-900">{w.operator_id}</td>
                        <td className="px-6 py-4 text-sm text-right text-slate-900">{formatCurrency(w.available_balance)}</td>
                        <td className="px-6 py-4 text-sm text-right text-slate-900">{formatCurrency(w.pending_balance)}</td>
                        <td className="px-6 py-4 text-sm text-right font-semibold text-slate-900">{formatCurrency(w.total_credits)}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${
                            w.wallet_status === 'active' ? 'bg-green-50 text-green-700 border-green-200' :
                            w.wallet_status === 'frozen' ? 'bg-red-50 text-red-700 border-red-200' :
                            'bg-slate-50 text-slate-700 border-slate-200'
                          }`}>
                            {w.wallet_status === 'active' && <CheckCircle className="w-3 h-3" />}
                            {w.wallet_status === 'frozen' && <Lock className="w-3 h-3" />}
                            {w.wallet_status}
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