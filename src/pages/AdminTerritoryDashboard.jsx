import React, { useState, useEffect } from 'react';
import { housioTerritories } from '@/lib/housioTerritoriesClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, RefreshCw, Search, Users, Building2, ChevronDown, ChevronRight, Code } from 'lucide-react';

const statusBadge = (status) => {
  const map = {
    available: 'bg-green-100 text-green-700',
    full: 'bg-red-100 text-red-700',
    taken: 'bg-red-100 text-red-700',
    paused: 'bg-yellow-100 text-yellow-700',
    active: 'bg-green-100 text-green-700',
    approved: 'bg-blue-100 text-blue-700',
    pending: 'bg-amber-100 text-amber-700',
    reviewing: 'bg-purple-100 text-purple-700',
    denied: 'bg-red-100 text-red-700',
  };
  return map[status?.toLowerCase()] || 'bg-slate-100 text-slate-600';
};

function EmptyState({ icon: Icon, message }) {
  return (
    <Card className="bg-white p-12 text-center">
      <Icon className="w-12 h-12 text-slate-200 mx-auto mb-3" />
      <p className="text-slate-400">{message}</p>
    </Card>
  );
}

export default function AdminTerritoryDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [search, setSearch] = useState('');
  const [expandedMaster, setExpandedMaster] = useState(null);
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const res = await housioTerritories.list();
    // res.territories is the array from the new API
    setData(res);
    setLoading(false);
  };

  const masterTerritories = data?.territories || [];
  const microTerritories = [];
  const agentApps = [];
  const operatorProfiles = [];

  const q = search.toLowerCase();
  const filteredMaster = masterTerritories.filter(t => !q || JSON.stringify(t).toLowerCase().includes(q));
  const filteredMicro = microTerritories.filter(t => !q || JSON.stringify(t).toLowerCase().includes(q));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Loading territory data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Territory Dashboard</h1>
              <p className="text-sm text-slate-500">Master territories (counties) and micro-territories (cities)</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={loadData} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-1" /> Refresh
            </Button>
            <Button onClick={() => setShowDebug(!showDebug)} variant="ghost" size="sm">
              <Code className="w-4 h-4 mr-1" /> {showDebug ? 'Hide' : 'Debug'}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Master Territories', value: masterTerritories.length, color: 'text-purple-600' },
            { label: 'Micro-Territories', value: microTerritories.length, color: 'text-blue-600' },
            { label: 'Agent Applications', value: agentApps.length, color: 'text-orange-600' },
            { label: 'Operator Profiles', value: operatorProfiles.length, color: 'text-green-600' },
          ].map((s, i) => (
            <Card key={i} className="bg-white shadow-sm">
              <CardContent className="p-4">
                <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-slate-500 mt-1">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <Input placeholder="Search territories..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-white" />
          </div>
        </div>

        {/* Debug panel */}
        {showDebug && data?.debug && (
          <Card className="mb-6 border-amber-200 bg-amber-50">
            <CardHeader><CardTitle className="text-sm text-amber-800">Debug — Raw API Response</CardTitle></CardHeader>
            <CardContent>
              <pre className="text-xs text-amber-900 overflow-auto max-h-64 whitespace-pre-wrap">
                {JSON.stringify(data.debug, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="master">
          <TabsList className="mb-6">
            <TabsTrigger value="master">Master Territories ({masterTerritories.length})</TabsTrigger>
            <TabsTrigger value="micro">Micro-Territories ({microTerritories.length})</TabsTrigger>
            <TabsTrigger value="agents">Agent Applications ({agentApps.length})</TabsTrigger>
            <TabsTrigger value="operators">Operator Profiles ({operatorProfiles.length})</TabsTrigger>
          </TabsList>

          {/* MASTER TERRITORIES (counties) */}
          <TabsContent value="master">
            {filteredMaster.length === 0 ? (
              <EmptyState icon={MapPin} message="No master territories found." />
            ) : (
              <div className="space-y-3">
                {filteredMaster.map((t) => {
                  const isExpanded = expandedMaster === t.id;
                  return (
                    <Card key={t.id} className="bg-white shadow-sm">
                      <CardContent className="p-5">
                        <div
                          className="flex items-start justify-between cursor-pointer"
                          onClick={() => setExpandedMaster(isExpanded ? null : t.id)}
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center mt-0.5 shrink-0">
                              <MapPin className="w-4 h-4 text-purple-600" />
                            </div>
                            <div>
                              <h3 className="font-bold text-slate-900">{t.name}, {t.state}</h3>
                              <div className="flex flex-wrap gap-2 mt-1.5">
                                <Badge className="bg-purple-50 text-purple-700">{t.total_agent_count || 0} agents</Badge>
                                <Badge className={`text-xs ${statusBadge(t.status)}`}>{t.status}</Badge>
                                {t.avg_listing_price > 0 && (
                                  <Badge className="bg-slate-100 text-slate-600">Avg ${t.avg_listing_price?.toLocaleString()}</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="shrink-0 ml-2 text-slate-400">
                            {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t border-slate-100">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              {t.coverage_counties?.length > 0 && (
                                <div>
                                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Counties</p>
                                  <div className="flex flex-wrap gap-1">
                                    {t.coverage_counties.map((c, i) => (
                                      <span key={i} className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full">{c.name || c}</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {t.coverage_cities?.length > 0 && (
                                <div>
                                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Cities</p>
                                  <div className="flex flex-wrap gap-1">
                                    {t.coverage_cities.slice(0, 10).map((c, i) => (
                                      <span key={i} className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">{c}</span>
                                    ))}
                                    {t.coverage_cities.length > 10 && <span className="text-xs text-slate-400">+{t.coverage_cities.length - 10} more</span>}
                                  </div>
                                </div>
                              )}
                              <div><p className="text-xs text-slate-500">Active Listings: <span className="font-medium text-slate-700">{t.active_listings || 0}</span></p></div>
                              <div><p className="text-xs text-slate-500">Territory ID: <span className="font-medium text-slate-700">{t.territory_id}</span></p></div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* MICRO TERRITORIES (cities) */}
          <TabsContent value="micro">
            {filteredMicro.length === 0 ? (
              <EmptyState icon={MapPin} message="No micro-territories found." />
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredMicro.map((t, i) => (
                  <Card key={i} className="bg-white shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-bold text-slate-900">{t.city}</h3>
                        {t.type && <Badge className="bg-slate-100 text-slate-600 text-xs shrink-0 ml-1">{t.type}</Badge>}
                      </div>
                      <p className="text-xs text-slate-500 mb-2">{t.county} County, {t.state}</p>
                      <div className="space-y-1 text-xs">
                        <p className="text-slate-600">
                          Agent: <span className="font-medium text-slate-800">{t.agent_name}</span>
                        </p>
                        <Badge className={`text-xs ${statusBadge(t.agent_status)}`}>{t.agent_status}</Badge>
                        {t.incorporated !== undefined && t.incorporated !== null && (
                          <p className="text-slate-400">{t.incorporated ? 'Incorporated' : 'Unincorporated'}</p>
                        )}
                        {t.notes && <p className="text-slate-400 italic">{t.notes}</p>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* AGENT APPLICATIONS */}
          <TabsContent value="agents">
            {agentApps.filter(a => !q || JSON.stringify(a).toLowerCase().includes(q)).length === 0 ? (
              <EmptyState icon={Users} message="No agent applications found." />
            ) : (
              <div className="space-y-3">
                {agentApps.filter(a => !q || JSON.stringify(a).toLowerCase().includes(q)).map(a => (
                  <Card key={a.id} className="bg-white shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex flex-wrap gap-2 mb-2">
                        <Badge className={statusBadge(a.status)}>{a.status}</Badge>
                        {a.interested_in && (
                          <Badge className={a.interested_in === 'exclusive' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}>
                            {a.interested_in}
                          </Badge>
                        )}
                        {a.territory_cities?.length > 0 && (
                          <Badge className="bg-blue-50 text-blue-600">{a.territory_cities.length} micro-territories</Badge>
                        )}
                      </div>
                      <h3 className="font-semibold text-slate-900">{a.name}</h3>
                      <p className="text-xs text-slate-500">{a.brokerage} · {a.email}</p>
                      <p className="text-sm text-slate-600 mt-1">
                        <MapPin className="w-3 h-3 inline mr-1 text-slate-400" />
                        {[a.county_requested, a.license_state].filter(Boolean).join(', ')}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* OPERATOR PROFILES */}
          <TabsContent value="operators">
            {operatorProfiles.filter(o => !q || JSON.stringify(o).toLowerCase().includes(q)).length === 0 ? (
              <EmptyState icon={Building2} message="No operator territory profiles found." />
            ) : (
              <div className="space-y-3">
                {operatorProfiles.filter(o => !q || JSON.stringify(o).toLowerCase().includes(q)).map(o => (
                  <Card key={o.id} className="bg-white shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex flex-wrap gap-2 mb-2">
                        <Badge className={statusBadge(o.status)}>{o.status}</Badge>
                        <Badge className="bg-slate-100 text-slate-600">
                          {o.current_agent_partnerships || 0}/{o.max_agent_partnerships || 3} agent partners
                        </Badge>
                      </div>
                      <h3 className="font-semibold text-slate-900">{o.company_name}</h3>
                      <div className="mt-1 space-y-0.5 text-xs text-slate-500">
                        {o.service_counties?.length > 0 && <p>Counties: {o.service_counties.join(', ')}</p>}
                        {o.service_towns?.length > 0 && (
                          <p>Towns: {o.service_towns.slice(0, 6).join(', ')}{o.service_towns.length > 6 ? ` +${o.service_towns.length - 6} more` : ''}</p>
                        )}
                        {o.service_zip_codes?.length > 0 && (
                          <p>ZIPs: {o.service_zip_codes.slice(0, 8).join(', ')}{o.service_zip_codes.length > 8 ? ` +${o.service_zip_codes.length - 8} more` : ''}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}