import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Users, Download, Loader2, ClipboardList, Trash2, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function EarlySignIn() {
  const navigate = useNavigate();
  const [sale, setSale] = useState(null);
  const [signers, setSigners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedDays, setExpandedDays] = useState({});

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

      const signInData = await base44.entities.EarlySignIn.filter({ sale_id: saleId }, '-signed_at', 500);
      setSigners(signInData);

      // Auto-expand the first day
      const days = [...new Set(signInData.map(s => s.sale_date))].filter(Boolean).sort();
      if (days.length > 0) {
        setExpandedDays({ [days[0]]: true });
      }
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

    const headers = ['Day', 'Name', 'Email', 'Signed At'];
    const rows = signers.map(s => [
      s.sale_date ? format(new Date(s.sale_date + 'T00:00:00'), 'MMM d, yyyy (EEE)') : '—',
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

  const toggleDay = (date) => {
    setExpandedDays(prev => ({ ...prev, [date]: !prev[date] }));
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

  // Group signers by sale_date
  const signersByDay = {};
  const noDateSigners = [];
  signers.forEach(s => {
    if (s.sale_date) {
      if (!signersByDay[s.sale_date]) signersByDay[s.sale_date] = [];
      signersByDay[s.sale_date].push(s);
    } else {
      noDateSigners.push(s);
    }
  });

  const sortedDays = Object.keys(signersByDay).sort((a, b) => a.localeCompare(b));

  const getDayStatus = (dateStr) => {
    if (!sale?.sale_dates) return 'open';
    const dayInfo = sale.sale_dates.find(d => d.date === dateStr);
    if (!dayInfo) return 'open';
    const [y, m, day] = dateStr.split('-').map(Number);
    const startParts = (dayInfo.start_time || '00:00').split(':').map(Number);
    const endParts = (dayInfo.end_time || '23:59').split(':').map(Number);
    const startDt = new Date(y, m - 1, day, ...startParts);
    const endDt = new Date(y, m - 1, day, ...endParts);
    const now = new Date();
    if (now < startDt) return 'open';
    if (now <= endDt) return 'in_progress';
    return 'closed';
  };

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
            <p className="text-slate-600">Early Sign In Lists</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-600 mb-1">Total Signers</div>
            <div className="text-3xl font-bold text-cyan-600">{signers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-600 mb-1">Days with Lists</div>
            <div className="text-3xl font-bold text-orange-600">{sortedDays.length + (noDateSigners.length > 0 ? 1 : 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-600 mb-1">Sale Title</div>
            <div className="text-lg font-semibold text-slate-900 truncate">{sale?.title}</div>
          </CardContent>
        </Card>
      </div>

      {/* Legacy signers without a date */}
      {noDateSigners.length > 0 && (
        <Card className="border-amber-300">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardList className="w-5 h-5 text-amber-600" />
                Legacy Sign-Ins (No Day Assigned) — {noDateSigners.length}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <SignersTable signers={noDateSigners} onDelete={handleDelete} startIndex={1} />
          </CardContent>
        </Card>
      )}

      {/* Day-by-day lists */}
      {sortedDays.length === 0 && noDateSigners.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center text-slate-500">
            <Users className="w-16 h-16 text-slate-300 mx-auto mb-3" />
            <p>No early sign-ins yet</p>
            <p className="text-sm mt-2">Users can sign the list from the sale page</p>
          </CardContent>
        </Card>
      )}

      {sortedDays.map(date => {
        const daySigners = signersByDay[date];
        const expanded = expandedDays[date] !== false;
        const status = getDayStatus(date);
        const dayLabel = format(new Date(date + 'T00:00:00'), 'EEEE, MMMM d, yyyy');

        // Find sale day info for time display
        const dayInfo = sale?.sale_dates?.find(d => d.date === date);

        const statusBadge = status === 'open'
          ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Open</span>
          : status === 'in_progress'
          ? <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Sale In Progress</span>
          : <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Closed</span>;

        const cardBorder = status === 'in_progress' ? 'border-amber-200 bg-amber-50/30' 
          : status === 'closed' ? 'border-red-200 bg-red-50/30' 
          : '';

        return (
          <Card key={date} className={cardBorder}>
            <CardHeader className="pb-2 cursor-pointer" onClick={() => toggleDay(date)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Calendar className="w-5 h-5 text-orange-600" />
                    {dayLabel}
                  </CardTitle>
                  {statusBadge}
                </div>
                <div className="flex items-center gap-3">
                  {dayInfo && (
                    <span className="text-sm text-slate-500">
                      {format(new Date(date + 'T00:00:00'), 'h:mm a')} — {format(new Date(`${date}T${dayInfo.end_time || '17:00'}`), 'h:mm a')}
                    </span>
                  )}
                  <Badge variant="secondary" className="text-sm">{daySigners.length} signed</Badge>
                  {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </div>
            </CardHeader>
            {expanded && (
              <CardContent>
                <SignersTable signers={daySigners} onDelete={handleDelete} startIndex={1} />
              </CardContent>
            )}
          </Card>
        );
      })}

      {/* Export button */}
      {signers.length > 0 && (
        <div className="flex justify-end">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export All to CSV
          </Button>
        </div>
      )}
    </div>
  );
}

function SignersTable({ signers, onDelete, startIndex }) {
  return (
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
              <td className="py-3 px-2 text-slate-400 font-medium">{startIndex + idx}</td>
              <td className="py-3 px-2 font-medium text-slate-800">{signer.user_name}</td>
              <td className="py-3 px-2 text-slate-600">{signer.user_email}</td>
              <td className="py-3 px-2 text-slate-500 text-xs">
                {signer.signed_at ? format(new Date(signer.signed_at), 'MMM d, yyyy h:mm a') : '—'}
              </td>
              <td className="py-3 px-2">
                <button
                  onClick={() => onDelete(signer.id)}
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
  );
}