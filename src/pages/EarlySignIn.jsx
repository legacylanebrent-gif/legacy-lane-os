import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Users, Download, Loader2, ClipboardList, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

export default function EarlySignIn() {
  const navigate = useNavigate();
  const [sale, setSale] = useState(null);
  const [signers, setSigners] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const saleId = params.get('saleId');

      if (!saleId) {
        alert('Sale ID not found');
        navigate(createPageUrl('MySales'));
        return;
      }

      const saleData = await base44.entities.EstateSale.filter({ id: saleId });
      if (saleData.length === 0) {
        alert('Sale not found');
        navigate(createPageUrl('MySales'));
        return;
      }

      setSale(saleData[0]);

      // Load early sign-ins for this sale
      const signInData = await base44.entities.EarlySignIn.filter({ sale_id: saleId }, '-signed_at', 500);
      setSigners(signInData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (signerId) => {
    if (!confirm('Remove this person from the early sign-in list?')) return;
    try {
      await base44.entities.EarlySignIn.delete(signerId);
      setSigners(prev => prev.filter(s => s.id !== signerId));
    } catch (error) {
      console.error('Error deleting signer:', error);
    }
  };

  const handleExportCSV = () => {
    if (signers.length === 0) {
      alert('No signers to export');
      return;
    }

    const headers = ['Name', 'Email', 'Signed At'];
    const rows = signers.map(s => [
      s.user_name,
      s.user_email,
      s.signed_at ? format(new Date(s.signed_at), 'MMM d, yyyy h:mm a') : '—'
    ]);

    const csv = [headers, ...rows].map(r => r.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `early-signin-${sale?.id || 'sale'}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="h-96 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(createPageUrl('MySales'))}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Sales
          </Button>
          <div>
            <h1 className="text-4xl font-serif font-bold text-slate-900">{sale?.title}</h1>
            <p className="text-slate-600">Early Sign In List</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-600 mb-1">Total Signers</div>
            <div className="text-3xl font-bold text-cyan-600">{signers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-600 mb-1">Sale Title</div>
            <div className="text-lg font-semibold text-slate-900">{sale?.title}</div>
          </CardContent>
        </Card>
      </div>

      {/* Signers List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5" />
              Early Sign In Records ({signers.length})
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={signers.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {signers.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Users className="w-16 h-16 text-slate-300 mx-auto mb-3" />
              <p>No early sign-ins yet</p>
              <p className="text-sm mt-2">
                Users can sign the list from the sale page
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left">
                    <th className="pb-2 px-2 text-slate-500 font-medium">#</th>
                    <th className="pb-2 px-2 text-slate-500 font-medium">Name</th>
                    <th className="pb-2 px-2 text-slate-500 font-medium">Email</th>
                    <th className="pb-2 px-2 text-slate-500 font-medium">Signed At</th>
                    <th className="pb-2 px-2 text-slate-500 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {signers.map((signer, idx) => (
                    <tr key={signer.id || idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="py-3 px-2 text-slate-400">{signers.length - idx}</td>
                      <td className="py-3 px-2 font-medium text-slate-800">{signer.user_name}</td>
                      <td className="py-3 px-2 text-slate-600">{signer.user_email}</td>
                      <td className="py-3 px-2 text-slate-500 text-xs">
                        {signer.signed_at ? format(new Date(signer.signed_at), 'MMM d, yyyy h:mm a') : '—'}
                      </td>
                      <td className="py-3 px-2">
                        <button
                          onClick={() => handleDelete(signer.id)}
                          className="text-red-400 hover:text-red-600 transition-colors"
                          title="Remove from list"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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