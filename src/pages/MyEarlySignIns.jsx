import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ClipboardList, MapPin, Calendar, Clock, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';

export default function MyEarlySignIns() {
  const [signIns, setSignIns] = useState([]);
  const [sales, setSales] = useState({});
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const me = await base44.auth.me();
      setUser(me);

      const records = await base44.entities.EarlySignIn.filter({ user_email: me.email }, 'signed_at', 200);
      setSignIns(records);

      // Load sale details for each unique sale
      const saleIds = [...new Set(records.map(r => r.sale_id))];
      const saleDetails = {};
      await Promise.all(saleIds.map(async (id) => {
        const results = await base44.entities.EstateSale.filter({ id });
        if (results.length > 0) saleDetails[id] = results[0];
      }));
      setSales(saleDetails);
    } catch (error) {
      console.error('Error loading sign-ins:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPosition = (record, allForSale) => {
    const sorted = [...allForSale].sort((a, b) => new Date(a.signed_at) - new Date(b.signed_at));
    const idx = sorted.findIndex(r => r.id === record.id);
    return idx !== -1 ? idx + 1 : null;
  };

  // Group sign-ins by sale and compute positions
  const saleGroups = {};
  signIns.forEach(r => {
    if (!saleGroups[r.sale_id]) saleGroups[r.sale_id] = [];
    saleGroups[r.sale_id].push(r);
  });

  if (loading) {
    return (
      <div className="p-8 animate-pulse space-y-4">
        <div className="h-8 bg-slate-200 rounded w-1/4"></div>
        <div className="h-48 bg-slate-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link to={createPageUrl('Home')} className="text-slate-500 hover:text-slate-800">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-serif font-bold text-slate-900">My Early Sign-Ins</h1>
          <p className="text-slate-500 text-sm">Sales you've signed up for early entry</p>
        </div>
      </div>

      {signIns.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-slate-500">
            <ClipboardList className="w-14 h-14 mx-auto mb-3 text-slate-300" />
            <p className="text-lg font-medium">No early sign-ins yet</p>
            <p className="text-sm mt-1">Sign the list on any estate sale page to get first entry.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {signIns.map((record) => {
            const sale = sales[record.sale_id];
            const allForSale = saleGroups[record.sale_id] || [record];
            const position = getPosition(record, allForSale);

            return (
              <Card key={record.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5 flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold text-slate-900 text-lg">
                        {record.sale_title || sale?.title || 'Estate Sale'}
                      </h2>
                      <Link to={createPageUrl('EstateSaleDetail') + '?id=' + record.sale_id} className="text-xs text-cyan-600 hover:underline">
                        View Sale →
                      </Link>
                    </div>
                    {sale?.property_address && (
                      <div className="flex items-center gap-1 text-sm text-slate-500">
                        <MapPin className="w-4 h-4 text-orange-500" />
                        <span>{sale.property_address.street}, {sale.property_address.city}, {sale.property_address.state} {sale.property_address.zip}</span>
                      </div>
                    )}
                    {sale?.sale_dates && sale.sale_dates.length > 0 && (
                      <div className="space-y-1 mt-1">
                        {sale.sale_dates.map((d, i) => (
                          <div key={i} className="flex items-center gap-3 text-sm text-slate-500">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4 text-orange-500 flex-shrink-0" />
                              <span>{format(new Date(d.date), 'EEE, MMM d, yyyy')}</span>
                            </div>
                            {(d.start_time || d.end_time) && (
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4 text-orange-400 flex-shrink-0" />
                                <span>{d.start_time} – {d.end_time}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-slate-400">
                      Signed {record.signed_at ? format(new Date(record.signed_at), 'MMM d, yyyy h:mm a') : '—'}
                    </p>
                  </div>
                  <div className="flex-shrink-0 text-center">
                    <div className="w-14 h-14 rounded-full bg-green-100 border-2 border-green-400 flex items-center justify-center">
                      <span className="text-xl font-bold text-green-700">#{position ?? '?'}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">on list</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}