import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Download, MapPin, Mail, CheckCircle2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

const US_STATES = ['AK','AL','AR','AZ','CA','CO','CT','DC','DE','FL','GA','HI','IA','ID','IL','IN','KS','KY','LA','MA','MD','ME','MI','MN','MO','MS','MT','NC','ND','NE','NH','NJ','NM','NV','NY','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VA','VT','WA','WI','WV','WY'];

export default function NationalCoverageGrid() {
  const [loading, setLoading] = useState(true);
  const [stateData, setStateData] = useState([]);
  const [selectedState, setSelectedState] = useState(null);
  const [showStateModal, setShowStateModal] = useState(false);
  const [stateDetails, setStateDetails] = useState(null);

  useEffect(() => {
    loadAllStates();
  }, []);

  const loadAllStates = async () => {
    setLoading(true);
    try {
      const promises = US_STATES.map(async (state) => {
        try {
          const [cleanLeads, futOps, orgOps] = await Promise.all([
            base44.entities.FutureOperatorLead.filter({ state }, null, 10000).catch(() => []),
            base44.entities.FutureEstateOperator.filter({ state }, null, 10000).catch(() => []),
            base44.entities.EstatesalesOrgOperator.filter({ base_state: state }, null, 10000).catch(() => []),
          ]);

          const totalClean = cleanLeads.length;
          const withEmail = cleanLeads.filter(l => l.email).length;
          const geocoded = cleanLeads.filter(l => l.geocode_status === 'geocoded').length;
          const complete = cleanLeads.filter(l => l.process_status === 'complete').length;
          const pending = cleanLeads.filter(l => l.process_status === 'pending').length;

          const totalRaw = futOps.length + orgOps.length;

          return {
            state,
            totalClean,
            withEmail,
            geocoded,
            complete,
            pending,
            totalRaw,
            emailPct: totalClean > 0 ? Math.round((withEmail / totalClean) * 100) : 0,
            geoPct: totalClean > 0 ? Math.round((geocoded / totalClean) * 100) : 0,
            completePct: totalClean > 0 ? Math.round((complete / totalClean) * 100) : 0,
          };
        } catch (e) {
          return { state, totalClean: 0, withEmail: 0, geocoded: 0, complete: 0, pending: 0, totalRaw: 0, emailPct: 0, geoPct: 0, completePct: 0 };
        }
      });

      const results = await Promise.all(promises);
      setStateData(results.sort((a, b) => b.totalClean - a.totalClean));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleStateClick = async (state) => {
    setSelectedState(state);
    setShowStateModal(true);
    setStateDetails(null);
    try {
      const [cleanLeads, futOps, orgOps] = await Promise.all([
        base44.entities.FutureOperatorLead.filter({ state }, null, 100).catch(() => []),
        base44.entities.FutureEstateOperator.filter({ state }, null, 100).catch(() => []),
        base44.entities.EstatesalesOrgOperator.filter({ base_state: state }, null, 100).catch(() => []),
      ]);
      setStateDetails({ cleanLeads, futOps, orgOps });
    } catch (e) {}
  };

  const handleExport = () => {
    const headers = ['State','Total Clean Leads','With Email','Email %','Geocoded','Geo %','Complete','Complete %','Pending','Total Raw'];
    const rows = stateData.map(s => [
      s.state, s.totalClean, s.withEmail, s.emailPct + '%', s.geocoded, s.geoPct + '%',
      s.complete, s.completePct + '%', s.pending, s.totalRaw
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'national-coverage-grid.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const totals = {
    totalClean: stateData.reduce((sum, s) => sum + s.totalClean, 0),
    withEmail: stateData.reduce((sum, s) => sum + s.withEmail, 0),
    geocoded: stateData.reduce((sum, s) => sum + s.geocoded, 0),
    complete: stateData.reduce((sum, s) => sum + s.complete, 0),
    totalRaw: stateData.reduce((sum, s) => sum + s.totalRaw, 0),
  };
  totals.emailPct = totals.totalClean > 0 ? Math.round((totals.withEmail / totals.totalClean) * 100) : 0;
  totals.geoPct = totals.totalClean > 0 ? Math.round((totals.geocoded / totals.totalClean) * 100) : 0;
  totals.completePct = totals.totalClean > 0 ? Math.round((totals.complete / totals.totalClean) * 100) : 0;

  const getColor = (pct) => {
    if (pct >= 80) return 'bg-green-500';
    if (pct >= 50) return 'bg-yellow-500';
    if (pct >= 20) return 'bg-orange-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center min-h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-orange-600" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">National Coverage Grid</h1>
          <p className="text-slate-500 text-sm mt-1">Email enrichment and geocoding progress across all 51 states</p>
        </div>
        <Button onClick={handleExport} variant="outline" className="gap-2 w-full sm:w-auto">
          <Download className="w-4 h-4" /> Export CSV
        </Button>
      </div>

      {/* National Totals */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-slate-900">{totals.totalClean.toLocaleString()}</div>
            <div className="text-xs text-slate-500">Clean Leads</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-700">{totals.withEmail.toLocaleString()}</div>
            <div className="text-xs text-slate-500">With Email ({totals.emailPct}%)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-cyan-700">{totals.geocoded.toLocaleString()}</div>
            <div className="text-xs text-slate-500">Geocoded ({totals.geoPct}%)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-indigo-700">{totals.complete.toLocaleString()}</div>
            <div className="text-xs text-slate-500">Complete ({totals.completePct}%)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-slate-600">{totals.totalRaw.toLocaleString()}</div>
            <div className="text-xs text-slate-500">Raw Records</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">{US_STATES.length}</div>
            <div className="text-xs text-slate-500">States</div>
          </CardContent>
        </Card>
      </div>

      {/* Grid */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">State-by-State Breakdown</h2>
            <div className="flex gap-2 text-xs">
              <Badge className="bg-green-500">80%+</Badge>
              <Badge className="bg-yellow-500">50-79%</Badge>
              <Badge className="bg-orange-500">20-49%</Badge>
              <Badge className="bg-red-500">0-19%</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
            {stateData.map((s) => (
              <button
                key={s.state}
                onClick={() => handleStateClick(s.state)}
                className="group relative p-3 rounded-lg border border-slate-200 hover:border-orange-400 hover:shadow-md transition-all text-left"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-bold text-slate-700">{s.state}</span>
                  <Badge className={`${getColor(s.completePct)} text-white text-xs`}>{s.completePct}%</Badge>
                </div>
                <div className="space-y-1 text-xs text-slate-600">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span>{s.totalClean}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Mail className="w-3 h-3 text-green-600" />
                    <span>{s.emailPct}%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-cyan-600" />
                    <span>{s.geoPct}%</span>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="mt-2 w-full bg-slate-200 rounded-full h-1.5">
                  <div className={`h-1.5 rounded-full ${getColor(s.completePct)}`} style={{ width: `${s.completePct}%` }} />
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* State Detail Modal */}
      <Dialog open={showStateModal} onOpenChange={(open) => { if (!open) setShowStateModal(false); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>State Details — {selectedState}</DialogTitle>
            <DialogDescription>Breakdown of clean leads and raw source records</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {stateDetails ? (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-slate-900">{stateDetails.cleanLeads.length}</div>
                    <div className="text-xs text-slate-500">Clean Leads</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-slate-600">{stateDetails.futOps.length}</div>
                    <div className="text-xs text-slate-500">EstateSales.net</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-slate-600">{stateDetails.orgOps.length}</div>
                    <div className="text-xs text-slate-500">EstateSales.org</div>
                  </div>
                </div>

                {stateDetails.cleanLeads.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Sample Clean Leads ({stateDetails.cleanLeads.length} total)</h3>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="p-2 text-left">Company</th>
                            <th className="p-2">Email</th>
                            <th className="p-2">Geo</th>
                            <th className="p-2">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stateDetails.cleanLeads.slice(0, 10).map((l, i) => (
                            <tr key={l.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                              <td className="p-2 font-medium">{l.company_name}</td>
                              <td className="p-2 text-center">{l.email ? '✓' : '—'}</td>
                              <td className="p-2 text-center">{l.geocode_status === 'geocoded' ? '✓' : '—'}</td>
                              <td className="p-2 text-center">
                                <Badge className={l.process_status === 'complete' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
                                  {l.process_status}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {stateDetails.futOps.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Sample Raw Records — EstateSales.net ({stateDetails.futOps.length} total)</h3>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="p-2 text-left">Company</th>
                            <th className="p-2">City</th>
                            <th className="p-2">Email</th>
                            <th className="p-2">Package</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stateDetails.futOps.slice(0, 5).map((op, i) => (
                            <tr key={op.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                              <td className="p-2 font-medium">{op.company_name}</td>
                              <td className="p-2 text-center">{op.city}</td>
                              <td className="p-2 text-center">{op.email ? '✓' : '—'}</td>
                              <td className="p-2 text-center">{op.package_type || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={() => setShowStateModal(false)}>Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}