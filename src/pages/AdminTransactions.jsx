import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, FileText, DollarSign, Calendar } from 'lucide-react';

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTransactions();
  }, []);

  useEffect(() => {
    filterTransactions();
  }, [searchQuery, statusFilter, transactions]);

  const loadTransactions = async () => {
    try {
      const data = await base44.entities.Transaction.list();
      setTransactions(data);
      setFilteredTransactions(data);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterTransactions = () => {
    let filtered = transactions;

    if (searchQuery) {
      filtered = filtered.filter(transaction =>
        transaction.transaction_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.buyer_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.seller_id?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(transaction => transaction.status === statusFilter);
    }

    setFilteredTransactions(filtered);
  };

  const getStatusBadge = (status) => {
    const configs = {
      pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-700' },
      completed: { label: 'Completed', className: 'bg-green-100 text-green-700' },
      failed: { label: 'Failed', className: 'bg-red-100 text-red-700' },
      refunded: { label: 'Refunded', className: 'bg-slate-100 text-slate-700' }
    };
    const config = configs[status] || configs.pending;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="h-64 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-4xl font-serif font-bold text-slate-900 mb-2">Transactions</h1>
        <p className="text-slate-600">{transactions.length} total transactions</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <Input
            placeholder="Search by transaction ID or user..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg bg-white"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {filteredTransactions.map(transaction => (
          <Card key={transaction.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-mono text-sm text-slate-500 mb-2">
                      {transaction.transaction_id || transaction.id}
                    </div>
                    {getStatusBadge(transaction.status)}
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-2xl font-bold text-slate-900">
                      <DollarSign className="w-5 h-5" />
                      {transaction.amount?.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-slate-600">
                  {transaction.transaction_type && (
                    <div>
                      <span className="font-medium">Type:</span> <span className="capitalize">{transaction.transaction_type.replace('_', ' ')}</span>
                    </div>
                  )}

                  {transaction.buyer_id && (
                    <div>
                      <span className="font-medium">Buyer:</span> {transaction.buyer_id}
                    </div>
                  )}

                  {transaction.seller_id && (
                    <div>
                      <span className="font-medium">Seller:</span> {transaction.seller_id}
                    </div>
                  )}

                  {transaction.platform_fee && (
                    <div>
                      <span className="font-medium">Platform Fee:</span> ${transaction.platform_fee.toLocaleString()}
                    </div>
                  )}

                  {transaction.created_date && (
                    <div className="flex items-center gap-2 text-xs text-slate-500 pt-2 border-t">
                      <Calendar className="w-4 h-4" />
                      {new Date(transaction.created_date).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTransactions.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No transactions found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}