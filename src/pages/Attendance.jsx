import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, QrCode, Users, Plus, Minus, Calendar, 
  Clock, TrendingUp, UserCheck, Download, Loader2
} from 'lucide-react';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import QRCode from 'qrcode';

export default function Attendance() {
  const navigate = useNavigate();
  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [manualCount, setManualCount] = useState(0);
  const [checkins, setCheckins] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);

  useEffect(() => {
    loadData();
    // Auto-refresh every 30 seconds to pick up new QR check-ins
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
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

      // Load QR check-ins for this sale
      const checkInData = await base44.entities.CheckIn.filter({ location_id: saleId, check_in_type: 'sale_visit' }, '-created_date', 100);
      setCheckins(checkInData);

      // Auto-generate QR code for this sale
      setQrLoading(true);
      const checkInUrl = `${window.location.origin}/CheckIn?saleId=${saleId}`;
      const dataUrl = await QRCode.toDataURL(checkInUrl, { width: 400, margin: 2, color: { dark: '#0f172a', light: '#ffffff' } });
      setQrDataUrl(dataUrl);
      setQrLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleIncrement = async () => {
    setManualCount(prev => prev + 1);
    // Record a manual check-in
    const params = new URLSearchParams(window.location.search);
    const saleId = params.get('saleId');
    if (saleId) {
      await base44.entities.CheckIn.create({
        check_in_type: 'sale_visit',
        location_id: saleId,
        location_name: sale?.title || '',
        notes: 'Manual count',
        verified: true,
      });
      // Refresh list
      const updated = await base44.entities.CheckIn.filter({ location_id: saleId, check_in_type: 'sale_visit' }, '-created_date', 100);
      setCheckins(updated);
    }
  };

  const handleDecrement = () => {
    setManualCount(prev => Math.max(0, prev - 1));
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `checkin-qr-${sale?.id || 'sale'}.png`;
    a.click();
  };

  const stats = {
    totalToday: manualCount + checkins.length,
    qrCheckins: checkins.length,
    manualCount: manualCount,
    peakHour: '10:00 AM',
    avgDuration: '45 min'
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
            <p className="text-slate-600">Attendance Tracking</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-600 mb-1">Total Today</div>
            <div className="text-3xl font-bold text-cyan-600">{stats.totalToday}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-600 mb-1">QR Check-ins</div>
            <div className="text-3xl font-bold text-green-600">{stats.qrCheckins}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-600 mb-1">Manual Count</div>
            <div className="text-3xl font-bold text-orange-600">{stats.manualCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-600 mb-1">Peak Hour</div>
            <div className="text-xl font-bold text-slate-900">{stats.peakHour}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="manual" className="space-y-6">
        <TabsList>
          <TabsTrigger value="manual">Manual Count</TabsTrigger>
          <TabsTrigger value="qr">QR Code Check-in</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Counter */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Manual Counter
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <div className="text-8xl font-bold text-cyan-600 mb-6">
                    {manualCount}
                  </div>
                  <p className="text-slate-600 mb-6">Visitors counted manually</p>
                  
                  <div className="flex gap-4 justify-center">
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={handleDecrement}
                      className="h-20 w-20"
                    >
                      <Minus className="w-8 h-8" />
                    </Button>
                    <Button
                      size="lg"
                      onClick={handleIncrement}
                      className="h-20 w-20 bg-cyan-600 hover:bg-cyan-700"
                    >
                      <Plus className="w-8 h-8" />
                    </Button>
                  </div>
                </div>

                <div className="pt-6 border-t">
                  <Button variant="outline" className="w-full">
                    Reset Counter
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Today's Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-slate-600" />
                    <span className="font-medium">Date</span>
                  </div>
                  <span className="text-slate-600">{format(new Date(), 'MMM d, yyyy')}</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-slate-600" />
                    <span className="font-medium">Time</span>
                  </div>
                  <span className="text-slate-600">{format(new Date(), 'h:mm a')}</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-cyan-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-cyan-600" />
                    <span className="font-medium">Total Attendance</span>
                  </div>
                  <span className="text-2xl font-bold text-cyan-600">{stats.totalToday}</span>
                </div>

                <div className="pt-4">
                   <Button className="w-full" variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Export Attendance Report
                  </Button>
                </div>
                </CardContent>
                </Card>
                </div>

                {/* Check-ins Table */}
                <Card>
                <CardHeader>
                <CardTitle className="flex items-center gap-2">
                <UserCheck className="w-5 h-5" />
                All Check-ins ({checkins.length})
                </CardTitle>
                </CardHeader>
                <CardContent>
                {checkins.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <UserCheck className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <p>No check-ins yet</p>
                </div>
                ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left">
                        <th className="pb-2 text-slate-500 font-medium">#</th>
                        <th className="pb-2 text-slate-500 font-medium">Visitor</th>
                        <th className="pb-2 text-slate-500 font-medium">Type</th>
                        <th className="pb-2 text-slate-500 font-medium">Time</th>
                        <th className="pb-2 text-slate-500 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {checkins.map((checkin, idx) => {
                        const isManual = checkin.notes === 'Manual count';
                        return (
                          <tr key={checkin.id || idx} className="border-b border-slate-100 last:border-0">
                            <td className="py-2 text-slate-400">{checkins.length - idx}</td>
                            <td className="py-2 font-medium text-slate-800">
                              {isManual ? 'Guest' : (checkin.notes?.replace('QR check-in by ', '') || 'Anonymous')}
                            </td>
                            <td className="py-2">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isManual ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                                {isManual ? 'Manual' : 'QR Scan'}
                              </span>
                            </td>
                            <td className="py-2 text-slate-600">
                              {checkin.created_date ? format(new Date(checkin.created_date), 'h:mm a') : '—'}
                            </td>
                            <td className="py-2 text-slate-500 text-xs">
                              {checkin.created_date ? format(new Date(checkin.created_date), 'MMM d, yyyy') : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                )}
                </CardContent>
                </Card>
                </TabsContent>

        <TabsContent value="qr" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* QR Code Display */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="w-5 h-5" />
                  Check-in QR Code
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-slate-50 rounded-lg p-8 text-center">
                  <div className="w-64 h-64 bg-white mx-auto rounded-lg border-4 border-slate-200 flex items-center justify-center mb-4 overflow-hidden">
                    {qrLoading ? (
                      <Loader2 className="w-10 h-10 text-slate-300 animate-spin" />
                    ) : qrDataUrl ? (
                      <img src={qrDataUrl} alt="Check-in QR Code" className="w-full h-full object-contain" />
                    ) : (
                      <QrCode className="w-32 h-32 text-slate-300" />
                    )}
                  </div>
                  {qrDataUrl && (
                    <p className="text-xs text-slate-500 mb-2 font-mono break-all px-2">
                    {window.location.origin}/CheckIn?saleId={sale?.id}
                    </p>
                  )}
                  <p className="text-sm text-slate-600">
                    {qrDataUrl ? 'Scan to check in to this sale' : 'QR code generating...'}
                  </p>
                </div>

                <div className="space-y-3 pt-4 border-t">
                  <Button onClick={handleDownloadQR} disabled={!qrDataUrl} variant="outline" className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    Download QR Code
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Check-ins */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5" />
                  Recent QR Check-ins
                </CardTitle>
              </CardHeader>
              <CardContent>
                {checkins.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <UserCheck className="w-16 h-16 text-slate-300 mx-auto mb-3" />
                    <p>No QR check-ins yet</p>
                    <p className="text-sm mt-2">
                      Users can scan the QR code to check in
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {checkins.map((checkin, idx) => (
                      <div key={checkin.id || idx} className="flex items-start justify-between p-3 bg-slate-50 rounded-lg">
                        <div>
                          <p className="font-medium text-slate-800">{checkin.notes?.replace('QR check-in by ', '') || 'Anonymous'}</p>
                          <p className="text-xs text-slate-500">QR Scan</p>
                          {sale?.property_address && (
                            <p className="text-xs text-cyan-700 mt-1">
                              {[sale.property_address.street, sale.property_address.city, sale.property_address.state, sale.property_address.zip].filter(Boolean).join(', ')}
                            </p>
                          )}
                        </div>
                        <div className="text-right text-sm text-slate-600 flex-shrink-0 ml-2">
                          {checkin.created_date ? format(new Date(checkin.created_date), 'h:mm a') : '—'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {(() => {
            const qrCount = checkins.filter(c => c.notes !== 'Manual count').length;
            const manualCountDB = checkins.filter(c => c.notes === 'Manual count').length;
            const total = checkins.length;
            const pieData = [
              { name: 'QR Scan', value: qrCount, color: '#16a34a' },
              { name: 'Manual', value: manualCountDB, color: '#ea580c' },
            ].filter(d => d.value > 0);

            return (
              <div className="grid md:grid-cols-2 gap-6">
                {/* Pie Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Check-in Method Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {total === 0 ? (
                      <div className="text-center py-12 text-slate-400">
                        <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-30" />
                        <p>No check-ins recorded yet</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                          <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                            {pieData.map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                {/* Summary Table */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Cross-Reference Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-100">
                      <div className="flex items-center gap-3">
                        <QrCode className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="font-semibold text-green-800">QR Scan Check-ins</p>
                          <p className="text-xs text-green-600">Registered visitors via QR code</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold text-green-600">{qrCount}</p>
                        <p className="text-xs text-green-500">{total > 0 ? Math.round((qrCount / total) * 100) : 0}% of total</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-100">
                      <div className="flex items-center gap-3">
                        <Users className="w-5 h-5 text-orange-600" />
                        <div>
                          <p className="font-semibold text-orange-800">Manual Count (Guests)</p>
                          <p className="text-xs text-orange-600">Visitors counted by operator</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold text-orange-600">{manualCountDB}</p>
                        <p className="text-xs text-orange-500">{total > 0 ? Math.round((manualCountDB / total) * 100) : 0}% of total</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-cyan-50 rounded-lg border border-cyan-100">
                      <div className="flex items-center gap-3">
                        <TrendingUp className="w-5 h-5 text-cyan-600" />
                        <div>
                          <p className="font-semibold text-cyan-800">Total Attendance</p>
                          <p className="text-xs text-cyan-600">All check-in methods combined</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold text-cyan-600">{total}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })()}
        </TabsContent>
      </Tabs>
    </div>
  );
}